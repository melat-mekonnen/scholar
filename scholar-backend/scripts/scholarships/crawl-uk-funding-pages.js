/**
 * Discover UK university bursary/scholarship links from Shared Scholarship funding hubs.
 *
 * NOTE: Commonwealth Shared universities are fully covered by the curated leaf catalog
 * (sync-leaf-catalog.js). This crawl previously created duplicate cards with generic CSC
 * application URLs. It is disabled by default — pass --force to run for manual experiments.
 *
 * Usage: node scripts/scholarships/crawl-uk-funding-pages.js [--force] [--max-per-hub=5]
 */
require("dotenv").config();

const crypto = require("crypto");
const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const {
  COMMONWEALTH_SHARED_UNIVERSITIES,
} = require("../../src/modules/scholarship-ingestion/leafProgrammes/commonwealthSharedUniversities");
const { resolveSharedUniversityUrl } = require("../../src/modules/scholarship-ingestion/leafProgrammes/sharedUniversityLeafUrls");
const { buildLeafProgrammeRecord } = require("../../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { normalizeScholarshipRecord } = require("../../src/modules/scholarship-ingestion/normalizeScholarship");
const { isBareHomepageUrl } = require("../../src/modules/scholarship-ingestion/descriptionQuality");
const { isCscSharedGenericUrl } = require("../../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");
const {
  discoverProgrammeLinks,
  slugToTitle,
} = require("../../src/modules/scholarship-ingestion/connectors/discoverProgrammeLinks");
const { UK_FUNDING_DISCOVERY_SOURCE } = require("../../src/modules/scholarship-ingestion/sourceNames");

const SOURCE = UK_FUNDING_DISCOVERY_SOURCE;

function parseArgs() {
  const maxArg = process.argv.find((a) => a.startsWith("--max-per-hub="));
  return {
    maxPerHub: maxArg ? parseInt(maxArg.split("=")[1], 10) : 5,
    force: process.argv.includes("--force"),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function urlHash(url) {
  return crypto.createHash("md5").update(url).digest("hex").slice(0, 10);
}

function hubHostRoot(hubUrl) {
  const host = new URL(hubUrl).hostname.replace(/^www\./, "");
  const parts = host.split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
}

function isAcceptableDiscoveredUrl(url, hubUrl) {
  if (!url || isBareHomepageUrl(url)) return false;
  if (/cscuk\.fcdo\.gov\.uk/i.test(url)) return false;
  if (/linkedin\.com/i.test(url)) return false;
  if (isCscSharedGenericUrl(url)) return false;
  if (/#/.test(url) && !/#nominator-/i.test(url)) return false;

  const linkHost = new URL(url).hostname.replace(/^www\./, "");
  const hubRoot = hubHostRoot(hubUrl);
  return linkHost === hubRoot || linkHost.endsWith(`.${hubRoot}`);
}

async function upsertRecord(repo, raw) {
  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE });
  const apply = normalized.applicationUrl || normalized.sourceUrl;
  if (!apply || isBareHomepageUrl(apply)) {
    return { ok: false, reason: "bare_url" };
  }

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
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    publishStatus: "needs_review",
    eligibleRegions: normalized.eligibleRegions,
    isRolling: normalized.isRolling,
    recordType: "scholarship",
  });
  return { ok: true };
}

async function main() {
  const { maxPerHub, force } = parseArgs();
  if (!force) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason:
            "Commonwealth Shared placements are curated in sync-leaf-catalog; crawl disabled (use --force to override).",
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const repo = new ScholarshipRepository();
  let discovered = 0;
  let upserted = 0;

  for (const entry of COMMONWEALTH_SHARED_UNIVERSITIES) {
    const hub = resolveSharedUniversityUrl(entry);
    // eslint-disable-next-line no-await-in-loop
    const links = await discoverProgrammeLinks(hub, {
      max: maxPerHub,
      hostMustInclude: hubHostRoot(hub),
    });
    discovered += links.length;

    for (const url of links) {
      if (!isAcceptableDiscoveredUrl(url, hub)) continue;

      const slug = url.split("/").filter(Boolean).pop() || urlHash(url);
      const record = buildLeafProgrammeRecord({
        externalId: `bursary-${entry.slug}-${urlHash(url)}`,
        title: `${entry.university} — ${slugToTitle(slug)}`,
        organizationName: entry.university.replace(/ \(.*\)/, ""),
        country: "United Kingdom",
        hostCountry: "United Kingdom",
        degreeLevel: "master",
        fieldOfStudy: "scholarships and bursaries",
        fundingType: "fully_funded",
        url,
        description:
          `${entry.university} funding opportunity discovered from official scholarships hub. ` +
          `Review eligibility, deadlines, and how to apply on the linked page. Hub: ${hub}`,
        eligibleRegions: ["africa", "commonwealth", "developing"],
        isRolling: true,
      });
      if (!record) continue;
      // eslint-disable-next-line no-await-in-loop
      const result = await upsertRecord(repo, record);
      if (result.ok) upserted += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(250);
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ discovered, upserted, maxPerHub }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
