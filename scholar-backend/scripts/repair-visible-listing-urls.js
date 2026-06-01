/**
 * Replace broken hub/listing URLs with individual programme pages; upsert EduCanada + Melbourne awards.
 * Usage: node scripts/repair-visible-listing-urls.js
 *
 * Requires DATABASE_URL — for Docker Compose use localhost:55432 (see repo .env.docker.example).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const { normalizeScholarshipRecord } = require("../src/modules/scholarship-ingestion/normalizeScholarship");
const { educanadaEthiopiaLeafProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/educanadaEthiopiaProgrammes");
const { melbourneUndergraduateLeafProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/melbourneUndergraduateScholarships");
const { highSchoolInternationalLeafProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/highSchoolInternationalProgrammes");
const { exportVisibleCsv } = require("./export-visible-scholarships-csv");

const SOURCE_EDUCANADA = "EDUCANADA_CURATED";
const SOURCE_MELBOURNE = "University of Melbourne";
const SOURCE_PHASE1_CURATED = "PHASE1_CURATED";

const REJECT_URL_PATTERNS = [
  "%scholarships.unimelb.edu.au/awards/graduate-research-scholarships%",
  "%moet.gov.vn/en/Pages/default.aspx%",
  "%we-team.education/the-procedure-in-5-steps%",
  "%educanada.ca/scholarships-bourses/search-scholarships%",
];

const URL_FIXES = [
  {
    from: "https://www.nserc-crsng.gc.ca/Students-Etudiants/PG-CS/cgrsd-besrd_eng.asp",
    to: "https://vanier.gc.ca/en/home-accueil.html",
  },
  {
    from: "https://www.nserc-crsng.gc.ca/Students-Etudiants/PG-CS/cgrsd-besrd_eng.asp/",
    to: "https://vanier.gc.ca/en/home-accueil.html",
  },
  {
    from: "https://www.turkiyeburslari.gov.tr/about",
    to: "https://www.turkiyeburslari.gov.tr/scholarshipsprograms",
  },
  {
    from: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/scholarship-types/undergraduate-scholarships/entry-level-and-first-year-scholarships.html",
    to: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html",
  },
  {
    from: "https://www.uwc.org/apply",
    to: "https://www.uwc.org/apply/how-to-apply/",
  },
  {
    from: "https://www.uwc.org/apply/",
    to: "https://www.uwc.org/apply/how-to-apply/",
  },
  {
    from: "https://www.uwc.org/",
    to: "https://www.uwc.org/apply/how-to-apply/",
  },
];

async function rejectHubListings() {
  const rejected = [];
  for (const pattern of REJECT_URL_PATTERNS) {
    // eslint-disable-next-line no-await-in-loop
    const result = await pool.query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = 'listing_hub_not_programme_page',
           updated_at = NOW()
       WHERE (application_url ILIKE $1 OR source_url ILIKE $1)
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title, application_url`,
      [pattern],
    );
    rejected.push(...result.rows);
  }
  return rejected;
}

async function applyUrlFixes() {
  const fixed = [];
  for (const { from, to } of URL_FIXES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await pool.query(
      `UPDATE scholarships
       SET application_url = $2,
           source_url = CASE WHEN source_url = $1 THEN $2 ELSE source_url END,
           updated_at = NOW()
       WHERE (application_url = $1 OR rtrim(application_url, '/') = rtrim($1::text, '/'))
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title`,
      [from, to],
    );
    fixed.push(...result.rows);
  }
  return fixed;
}

async function upsertLeafRecords(repo, records, sourceName) {
  let upserted = 0;
  for (const raw of records) {
    const normalized = normalizeScholarshipRecord({ ...raw, sourceName });
    if (!normalized.applicationUrl || !normalized.title) continue;
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
      sourceName,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      publishStatus: "verified",
      isRolling: normalized.isRolling ?? false,
      eligibleRegions: normalized.eligibleRegions,
    });
    upserted += 1;
  }
  return upserted;
}

async function dedupeSupersededRecords() {
  const rules = [
    {
      externalId: "uwc-ethiopia-national-committee",
      keepSourceUrl: "https://et.uwc.org/about-uwc-nc-name/",
    },
    {
      externalId: "uwc-international-ib-diploma",
      keepSourceUrl: "https://www.uwc.org/apply/how-to-apply/",
    },
  ];
  const deduped = [];
  for (const { externalId, keepSourceUrl } of rules) {
    // eslint-disable-next-line no-await-in-loop
    const result = await pool.query(
      `UPDATE scholarships
       SET status = 'duplicate',
           rejection_reason = 'superseded_source_url',
           updated_at = NOW()
       WHERE external_id = $1
         AND source_url IS DISTINCT FROM $2
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title, source_url`,
      [externalId, keepSourceUrl],
    );
    deduped.push(...result.rows);
  }
  return deduped;
}

async function main() {
  const repo = new ScholarshipRepository();
  const rejected = await rejectHubListings();
  const deduped = await dedupeSupersededRecords();
  const urlFixed = await applyUrlFixes();
  const educanadaUpserted = await upsertLeafRecords(
    repo,
    educanadaEthiopiaLeafProgrammes(),
    SOURCE_EDUCANADA,
  );
  const melbourneUpserted = await upsertLeafRecords(
    repo,
    melbourneUndergraduateLeafProgrammes(),
    SOURCE_MELBOURNE,
  );
  const highSchoolUpserted = await upsertLeafRecords(
    repo,
    highSchoolInternationalLeafProgrammes(),
    SOURCE_PHASE1_CURATED,
  );
  const csv = await exportVisibleCsv();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        rejectedHubListings: rejected.length,
        rejected,
        deduped,
        urlFixed,
        educanadaUpserted,
        melbourneUpserted,
        highSchoolUpserted,
        csv,
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
