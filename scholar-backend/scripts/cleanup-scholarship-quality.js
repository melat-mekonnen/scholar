/**
 * Purge junk listings and mark duplicates in the database.
 * Run after migrate:scholarship-intelligence
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const { classifyScholarshipRecord } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");
const { titleSimilarity } = require("../src/modules/scholarship-ingestion/urlNormalize");
const { normalizeOrg } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");
const { assessQualityGate } = require("../src/modules/scholarship-ingestion/qualityGate");
const { buildCountryFields } = require("../src/modules/scholarship-ingestion/countryNormalize");

function providerKey(row) {
  return (
    normalizeOrg(row.organization_name) ||
    normalizeOrg(row.source_name) ||
    normalizeOrg(row.title?.split("|")[0])
  );
}

async function main() {
  const { rows } = await query(
    `SELECT id, title, country, organization_name, source_name, source_url, application_url,
            description, degree_level, funding_type, deadline, status, ingestion_tier, is_rolling
     FROM scholarships
     WHERE status IN ('verified', 'pending', 'needs_review')
     ORDER BY quality_score DESC NULLS LAST, updated_at DESC`,
  );

  let junk = 0;
  let dupes = 0;
  let rescored = 0;
  const kept = [];

  for (const row of rows) {
    const record = {
      title: row.title,
      country: row.country,
      description: row.description,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
      organizationName: row.organization_name,
      sourceName: row.source_name,
      degreeLevel: row.degree_level,
      fundingType: row.funding_type,
      deadline: row.deadline,
      isRolling: row.is_rolling,
    };

    const classification = classifyScholarshipRecord(record);
    if (classification.reject) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships
         SET status = 'rejected',
             rejection_reason = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [row.id, `${classification.category}: ${classification.reason}`],
      );
      junk += 1;
      continue;
    }

    const gate = assessQualityGate(record, { tier: row.ingestion_tier });
    const countries = buildCountryFields(record, gate.eligibleRegions);

    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET quality_score = $2,
           host_country = $3,
           country = $4,
           eligible_regions = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, gate.qualityScore, countries.hostCountry, countries.country, countries.eligibleRegions],
    );
    rescored += 1;
    kept.push({ ...row, quality_score: gate.qualityScore, provider: providerKey(row) });
  }

  kept.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0));

  const marked = new Set();
  for (let i = 0; i < kept.length; i += 1) {
    if (marked.has(kept[i].id)) continue;
    for (let j = i + 1; j < kept.length; j += 1) {
      if (marked.has(kept[j].id)) continue;
      const sim = titleSimilarity(kept[i].title, kept[j].title);
      const sameProvider =
        kept[i].provider && kept[j].provider && kept[i].provider === kept[j].provider;
      const sameCountry =
        String(kept[i].country || "").toLowerCase() === String(kept[j].country || "").toLowerCase();

      if ((sameProvider && sim >= 0.8) || (sim >= 0.88 && sameCountry)) {
        const low = (kept[i].quality_score || 0) >= (kept[j].quality_score || 0) ? kept[j] : kept[i];
        const high = low.id === kept[i].id ? kept[j] : kept[i];
        // eslint-disable-next-line no-await-in-loop
        await query(
          `UPDATE scholarships SET status = 'duplicate', rejection_reason = $2, updated_at = NOW() WHERE id = $1`,
          [low.id, `Duplicate of: ${high.title}`],
        );
        marked.add(low.id);
        dupes += 1;
      }
    }
  }

  const { rows: counts } = await query(
    `SELECT status, COUNT(*)::int n FROM scholarships GROUP BY status ORDER BY status`,
  );

  // eslint-disable-next-line no-console
  console.log(`Junk rejected: ${junk}, duplicates marked: ${dupes}, rescored: ${rescored}`);
  // eslint-disable-next-line no-console
  console.log("Counts:", counts);

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
