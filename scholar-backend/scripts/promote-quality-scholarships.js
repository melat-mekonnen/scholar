/**
 * Re-assess pending/expired imported scholarships and promote to verified when quality gate passes.
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";

const { query, pool } = require("../src/infra/db/neonClient");
const { assessQualityGate } = require("../src/modules/scholarship-ingestion/qualityGate");
const { resolveIngestionTier } = require("../src/modules/scholarship-ingestion/govTrustedDomains");

async function main() {
  const { rows } = await query(
    `SELECT id, title, organization_name, country, degree_level, field_of_study,
            funding_type, deadline, description, application_url, source_url,
            status, is_rolling, ingestion_tier
     FROM scholarships
     WHERE status IN ('pending', 'expired')
     ORDER BY updated_at DESC`,
  );

  let promoted = 0;
  for (const row of rows) {
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
    };

    const gate = assessQualityGate(record, { tier: row.ingestion_tier || resolveIngestionTier(record) });
    if (gate.isRolling && !row.is_rolling) {
      record.isRolling = true;
    }
    if (gate.publishStatus !== "verified") {
      // eslint-disable-next-line no-console
      console.log("Skip:", row.title, "—", gate.reasons.join(", ") || "quality gate");
      continue;
    }

    const deadlineOk =
      gate.isRolling || !row.deadline || new Date(row.deadline) >= new Date(new Date().toDateString());

    if (!deadlineOk) {
      // eslint-disable-next-line no-console
      console.log("Skip (past deadline):", row.title);
      continue;
    }

    const clearPastDeadline = gate.isRolling && row.deadline && !deadlineOk;

    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'verified',
           is_rolling = $2,
           deadline = CASE WHEN $5 THEN NULL ELSE deadline END,
           eligible_regions = $3,
           ingestion_tier = COALESCE($4, ingestion_tier),
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, gate.isRolling, gate.eligibleRegions, gate.tier, clearPastDeadline],
    );
    promoted += 1;
    // eslint-disable-next-line no-console
    console.log("Promoted:", row.title);
  }

  const { rows: counts } = await query(
    `SELECT status, COUNT(*)::int AS n FROM scholarships GROUP BY status ORDER BY status`,
  );
  // eslint-disable-next-line no-console
  console.log("Promoted:", promoted);
  // eslint-disable-next-line no-console
  console.log("Counts:", counts.map((r) => `${r.status}=${r.n}`).join(", "));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
