/**
 * Promote needs_review scholarships to verified when they pass strict quality checks.
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const { assessQualityGate } = require("../src/modules/scholarship-ingestion/qualityGate");
const { resolveIngestionTier } = require("../src/modules/scholarship-ingestion/govTrustedDomains");
const { classifyScholarshipRecord } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");
const {
  isPollutedDescription,
  isBareHomepageUrl,
  isListingHubUrl,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function canPromote(record, gate) {
  if (classifyScholarshipRecord(record).reject) return false;
  if (!record.title || record.title.length < 8) return false;
  if (!record.country) return false;
  if (!record.applicationUrl || !isValidUrl(record.applicationUrl)) return false;
  if (!record.sourceUrl || !isValidUrl(record.sourceUrl)) return false;
  if (isBareHomepageUrl(record.applicationUrl) || isBareHomepageUrl(record.sourceUrl)) return false;
  if (isListingHubUrl(record.applicationUrl) || isListingHubUrl(record.sourceUrl)) return false;
  const minDescription = gate.tier === "aggregator" ? 150 : 200;
  if (!record.description || record.description.length < minDescription) return false;
  if (isPollutedDescription(record.description)) return false;
  if (String(record.applicationStatus || "").toLowerCase() === "closed") return false;

  const hasDate = Boolean(record.deadline) || gate.isRolling || record.isRolling;
  if (!hasDate) return false;

  if (gate.pass) return true;
  const title = String(record.title || "");
  const titleIsProgramme =
    /\bscholarships?\b/i.test(title) ||
    /\bfellowships?\b/i.test(title) ||
    /\bstudentships?\b/i.test(title);
  if (gate.tier === "aggregator") {
    if (!titleIsProgramme) return false;
    const blockingReasons = gate.reasons.filter(
      (r) => r !== "aggregator requires promotion review",
    );
    if (blockingReasons.length === 0 && gate.qualityScore >= 75) return true;
    return false;
  }
  if (gate.tier === "government_trusted" && gate.qualityScore >= 65 && gate.reasons.length <= 1) return true;
  return gate.qualityScore >= 75 && gate.reasons.length === 0;
}

async function main() {
  const { rows } = await query(
    `SELECT id, title, organization_name, country, degree_level, field_of_study,
            funding_type, deadline, description, application_url, source_url,
            is_rolling, ingestion_tier, application_status, source_name
     FROM scholarships
     WHERE status = 'needs_review'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND LOWER(COALESCE(application_status, '')) <> 'closed'
     ORDER BY updated_at DESC`,
  );

  let promoted = 0;
  let scanned = 0;
  for (const row of rows) {
    scanned += 1;
    const record = {
      title: row.title,
      organizationName: row.organization_name,
      country: row.country,
      degreeLevel: row.degree_level,
      fieldOfStudy: row.field_of_study,
      fundingType: row.funding_type,
      deadline: row.deadline,
      description: row.description,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
      isRolling: row.is_rolling,
      applicationStatus: row.application_status,
    };

    const gate = assessQualityGate(record, {
      sourceName: row.source_name,
      tier: row.ingestion_tier || resolveIngestionTier(record, { sourceName: row.source_name }),
    });

    if (!canPromote(record, gate)) continue;

    const deadlineOk =
      gate.isRolling || !row.deadline || new Date(row.deadline) >= new Date(new Date().toDateString());
    if (!deadlineOk) continue;

    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'verified',
           is_rolling = $2,
           eligible_regions = $3,
           ingestion_tier = COALESCE($4, ingestion_tier),
           quality_score = GREATEST(COALESCE(quality_score, 0), $5),
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, gate.isRolling, gate.eligibleRegions, gate.tier, gate.qualityScore],
    );
    promoted += 1;
  }

  const { rows: counts } = await query(
    `SELECT status, COUNT(*)::int AS n
     FROM scholarships
     WHERE COALESCE(record_type, 'scholarship') = 'scholarship'
     GROUP BY status
     ORDER BY status`,
  );

  const visible = await query(
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
        scanned,
        promoted,
        visible: visible.rows[0]?.n || 0,
        byStatus: counts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
