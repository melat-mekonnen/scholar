/**
 * Import scholarships from scholarship-urls.txt by FETCHING each official page.
 * Does not fabricate titles/descriptions — skips URLs that fail programme extraction.
 *
 * Usage:
 *   node scripts/import-scholarship-url-catalog.js
 *   node scripts/import-scholarship-url-catalog.js --file=data/scholarship-urls.txt
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const { buildRecordFromOfficialPage } = require("../src/modules/scholarship-ingestion/connectors/officialPageRecord");
const { normalizeScholarshipRecord } = require("../src/modules/scholarship-ingestion/normalizeScholarship");
const {
  isBareHomepageUrl,
  isListingHubUrl,
  isPortalLandingUrl,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");
const { classifyScholarshipRecord } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");
const { assessQualityGate } = require("../src/modules/scholarship-ingestion/qualityGate");

const SOURCE = "URL_CATALOG";
const DEFAULT_FILE = path.join(__dirname, "../data/scholarship-urls.txt");

const URL_REWRITES = {
  "https://www.mandelarhodes.org/apply/": "https://www.mandelarhodes.org/scholarship/apply/",
  "https://www.mandelarhodes.org/apply": "https://www.mandelarhodes.org/scholarship/apply/",
  "https://mandelarhodes.org/apply": "https://www.mandelarhodes.org/scholarship/apply/",
};

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    let p = u.pathname.replace(/\/+$/, "");
    if (!p) p = "/";
    return `${u.protocol}//${u.host.toLowerCase()}${p}`.toLowerCase();
  } catch {
    return null;
  }
}

function rewriteUrl(url) {
  const trimmed = String(url || "").trim();
  const key = normalizeUrlKey(trimmed);
  for (const [from, to] of Object.entries(URL_REWRITES)) {
    if (normalizeUrlKey(from) === key) return to;
  }
  return trimmed;
}

function isImportableUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (isBareHomepageUrl(url) || isPortalLandingUrl(url) || isListingHubUrl(url)) return false;
  if (/\/advertise|\/wp-admin|\/login|\.xml(\?|$)/i.test(url)) return false;
  return true;
}

function inferCountry(url) {
  const host = String(url || "").toLowerCase();
  if (/\.edu\.et|moe\.gov\.et/.test(host)) return "Ethiopia";
  if (/\.edu\.ng|education\.gov\.ng/.test(host)) return "Nigeria";
  if (/\.edu\.gh|\.gh\b/.test(host)) return "Ghana";
  if (/\.co\.ke|\.ac\.ke/.test(host)) return "Kenya";
  if (/\.za\b|dhet\.gov\.za/.test(host)) return "South Africa";
  if (/\.ac\.uk|gov\.uk/.test(host)) return "United Kingdom";
  if (/gov\.au/.test(host)) return "Australia";
  if (/\.de\b|daad\.de/.test(host)) return "Germany";
  return "International";
}

async function recordFromUrl(url) {
  const rewritten = rewriteUrl(url);
  if (!isImportableUrl(rewritten)) return null;

  const externalId = `url-${crypto.createHash("sha1").update(normalizeUrlKey(rewritten)).digest("hex").slice(0, 16)}`;
  const raw = await buildRecordFromOfficialPage({
    url: rewritten,
    externalId,
    organizationName: null,
    country: inferCountry(rewritten),
    fetchOptions: { timeout: 25000, retries: 1, baseDelayMs: 500 },
  });
  if (!raw) return null;

  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE });
  if (classifyScholarshipRecord(normalized).reject) return null;

  const gate = assessQualityGate(normalized, { sourceName: SOURCE });
  if (!gate.isRolling && !normalized.deadline) return null;
  if (gate.reasons.includes("polluted or listing-page description")) return null;

  return { normalized, gate };
}

async function main() {
  const file = parseArg("file", DEFAULT_FILE);
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));

  const seen = new Set();
  const urls = [];
  for (const line of lines) {
    const key = normalizeUrlKey(rewriteUrl(line));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    urls.push(rewriteUrl(line));
  }

  const repo = new ScholarshipRepository();
  let upserted = 0;
  let skipped = 0;

  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const built = await recordFromUrl(url);
    if (!built) {
      skipped += 1;
      continue;
    }
    const { normalized, gate } = built;
    const publishStatus = gate.pass ? "verified" : "needs_review";

    // eslint-disable-next-line no-await-in-loop
    await repo.upsertImportedScholarship({
      title: normalized.title,
      organizationName: normalized.organizationName,
      country: normalized.country,
      hostCountry: normalized.hostCountry,
      degreeLevel: normalized.degreeLevel,
      fieldOfStudy: normalized.fieldOfStudy,
      fundingType: normalized.fundingType,
      deadline: normalized.deadline,
      applicationStartDate: normalized.applicationStartDate,
      applicationEndDate: normalized.applicationEndDate,
      amount: normalized.amount,
      description: normalized.description,
      applicationUrl: normalized.applicationUrl,
      sourceName: SOURCE,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      publishStatus,
      isRolling: gate.isRolling,
      applicationStatus: normalized.applicationStatus,
      eligibleRegions: normalized.eligibleRegions,
      normalizedSourceUrl: normalized.normalizedSourceUrl,
      ingestionTier: gate.tier,
      qualityScore: gate.qualityScore,
    });
    upserted += 1;
  }

  const visible = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND LOWER(COALESCE(application_status, '')) <> 'closed'
       AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE)`,
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        file,
        urlsScanned: urls.length,
        upserted,
        skipped,
        visible: visible.rows[0]?.n || 0,
      },
      null,
      2,
    ),
  );
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
