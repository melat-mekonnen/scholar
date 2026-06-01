/**
 * Scale scholarship catalog from data/source-registry.json (tiered official / african / university hubs).
 *
 * For each hub: discover programme leaf URLs → fetch page text + apply link → dedupe → quality gate → upsert.
 * Skips expired deadlines, bare homepages, listing hubs, duplicate apply URLs, and confirmed-dead apply links.
 *
 * Usage:
 *   node scripts/scale-registry-ingestion.js --tier=1
 *   node scripts/scale-registry-ingestion.js --tier=1,2,3 --max-links=80
 *   node scripts/scale-registry-ingestion.js --tier=3 --limit-hubs=5 --dry-run
 *   node scripts/scale-registry-ingestion.js --tier=1 --promote=true
 *   node scripts/scale-registry-ingestion.js --tier=1,2,3 --dedupe-after=true
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const fs = require("fs");
const { pool, query } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  fetchRegistryScaleBatch,
  SOURCE_NAME,
} = require("../src/modules/scholarship-ingestion/registry/registryScaleFetch");
const { normalizeUrl } = require("../src/modules/scholarship-ingestion/urlNormalize");

function parseArg(name, fallback) {
  const arg = process.argv.find((p) => p.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

function parseBool(name, fallback = false) {
  const v = parseArg(name, null);
  if (v == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

function parseTiers(raw) {
  if (!raw || raw === "all") return [1, 2, 3];
  return String(raw)
    .split(",")
    .map((t) => Number(t.trim()))
    .filter((n) => [1, 2, 3].includes(n));
}

async function countVisible() {
  const r = await query(
    `SELECT COUNT(*) FILTER (
              WHERE status = 'verified'
                AND COALESCE(record_type, 'scholarship') = 'scholarship'
                AND LOWER(COALESCE(application_status, '')) <> 'closed'
                AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE)
            )::int AS visible,
            COUNT(*) FILTER (WHERE status = 'verified')::int AS verified_all
     FROM scholarships`,
  );
  return r.rows[0] || { visible: 0, verified_all: 0 };
}

async function dedupeByApplicationUrl() {
  const dupes = await query(
    `SELECT application_url, array_agg(id ORDER BY quality_score DESC NULLS LAST, updated_at DESC) AS ids
     FROM scholarships
     WHERE application_url IS NOT NULL
       AND application_url <> ''
       AND status IN ('verified', 'needs_review', 'pending')
     GROUP BY application_url
     HAVING COUNT(*) > 1`,
  );
  let rejected = 0;
  for (const row of dupes.rows) {
    const [, ...drop] = row.ids;
    for (const id of drop) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships SET status = 'duplicate', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      rejected += 1;
    }
  }
  return rejected;
}

async function main() {
  const tiers = parseTiers(parseArg("tier", "all"));
  const dryRun = parseBool("dry-run", false);
  const promote = parseBool("promote", false);
  const dedupeAfter = parseBool("dedupe-after", true);
  const limitHubs = parseArg("limit-hubs", null);
  const maxLinks = Number(parseArg("max-links", "0")) || null;
  const delayMs = Number(parseArg("delay-ms", "300")) || 300;
  const hubKey = parseArg("hub", null);
  const exportUrls = parseArg("export-urls", null);
  const publishMode = parseArg("publish", "auto");

  const maxLinksPerTier = {};
  if (maxLinks) {
    for (const t of tiers) maxLinksPerTier[t] = maxLinks;
  }

  const before = await countVisible();
  // eslint-disable-next-line no-console
  console.log("Before:", before, "tiers:", tiers);

  const { records, stats, discoveredUrls, hubs } = await fetchRegistryScaleBatch({
    tiers,
    hubKey,
    limitHubs: limitHubs ? Number(limitHubs) : undefined,
    maxLinksPerTier,
    delayMs,
    checkAlive: true,
  });

  // eslint-disable-next-line no-console
  console.log("Discovery stats:", JSON.stringify({ ...stats, hubKeys: hubs }, null, 2));

  if (exportUrls) {
    const lines = [...new Set(discoveredUrls)].sort();
    fs.writeFileSync(exportUrls, `${lines.join("\n")}\n`, "utf8");
    // eslint-disable-next-line no-console
    console.log(`Exported ${lines.length} discovered URLs to ${exportUrls}`);
  }

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          wouldUpsert: records.length,
          sample: records.slice(0, 8).map((r) => ({
            title: r.normalized.title,
            apply: r.normalized.applicationUrl,
          })),
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const repo = new ScholarshipRepository();
  let upserted = 0;
  let verified = 0;
  let needsReview = 0;

  for (const { normalized, gate } of records) {
    let publishStatus = "needs_review";
    if (publishMode === "verified") {
      publishStatus = gate.pass ? "verified" : "needs_review";
    } else if (publishMode === "auto") {
      publishStatus = gate.pass ? "verified" : "needs_review";
    } else {
      publishStatus = publishMode;
    }

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
      amount: normalized.amount,
      description: normalized.description,
      applicationUrl: normalized.applicationUrl,
      sourceName: SOURCE_NAME,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      publishStatus,
      isRolling: normalized.isRolling,
      eligibleRegions: normalized.eligibleRegions,
      normalizedSourceUrl: normalizeUrl(normalized.sourceUrl),
      ingestionTier: normalized.ingestionTier,
      qualityScore: normalized.qualityScore,
    });
    upserted += 1;
    if (publishStatus === "verified") verified += 1;
    else needsReview += 1;
  }

  let deduped = 0;
  if (dedupeAfter) {
    deduped = await dedupeByApplicationUrl();
  }

  if (promote) {
    const { execSync } = require("child_process");
    execSync("node scripts/promote-quality-scholarships.js", {
      stdio: "inherit",
      env: process.env,
      cwd: path.join(__dirname, ".."),
    });
  }

  const after = await countVisible();
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        source: SOURCE_NAME,
        upserted,
        verified,
        needsReview,
        dedupedByApplyUrl: deduped,
        before,
        after,
        skipped: stats.skipped,
      },
      null,
      2,
    ),
  );
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("scale-registry-ingestion failed:", err);
  process.exit(1);
});
