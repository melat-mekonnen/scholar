/**
 * Site-wide scholarship deduplication.
 *
 * Usage:
 *   node scripts/scholarships/deduplicate-scholarships.js --dry-run
 *   node scripts/scholarships/deduplicate-scholarships.js --apply
 */
require("dotenv").config();

const { query, pool } = require("../../src/infra/db/neonClient");
const { planDeduplication, pickWinner } = require("../../src/modules/scholarship-ingestion/deduplicateScholarships");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const restore = args.has("--restore");
const dryRun = args.has("--dry-run") || (!apply && !restore);

async function loadCandidates() {
  const { rows } = await query(
    `SELECT id, title, country, organization_name, source_name, source_url, normalized_source_url,
            application_url, external_id, description, degree_level, status, ingestion_tier,
            quality_score, record_type, created_at, updated_at
     FROM scholarships
     WHERE status IN ('verified', 'pending', 'needs_review')
     ORDER BY quality_score DESC NULLS LAST, updated_at DESC`,
  );
  return rows;
}

function printReport(plan) {
  // eslint-disable-next-line no-console
  console.log(
    `Scanned ${plan.summary.scanned} active scholarships → ${plan.summary.clusterCount} duplicate clusters → ${plan.summary.duplicateRows} rows to mark`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Verified count (estimate): ${plan.summary.verifiedBefore} → ${plan.summary.verifiedAfter}`,
  );

  for (const [index, cluster] of plan.clusters.entries()) {
    const winner = pickWinner(cluster);
    const losers = plan.actions.filter((action) => action.winnerId === winner.id);
    // eslint-disable-next-line no-console
    console.log(`\nCluster ${index + 1}: ${winner.title}`);
    // eslint-disable-next-line no-console
    console.log(
      `  KEEP  ${winner.id}  status=${winner.status}  source=${winner.source_name || "n/a"}`,
    );
    for (const action of losers) {
      // eslint-disable-next-line no-console
      console.log(
        `  MARK  ${action.loserId}  status=${action.loserStatus}  source=${action.loserSource || "n/a"}  reason=${action.reason}`,
      );
    }
  }
}

async function migrateProgrammeLinks(loserId, winnerId) {
  await query(
    `UPDATE programme_scholarships ps
     SET scholarship_id = $2
     WHERE ps.scholarship_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM programme_scholarships existing
         WHERE existing.programme_id = ps.programme_id
           AND existing.scholarship_id = $2
       )`,
    [loserId, winnerId],
  );
  await query(`DELETE FROM programme_scholarships WHERE scholarship_id = $1`, [loserId]);
}

async function restoreUndueDuplicates() {
  const { rows } = await query(
    `UPDATE scholarships
     SET status = 'verified',
         rejection_reason = NULL,
         updated_at = NOW()
     WHERE status = 'duplicate'
       AND rejection_reason LIKE 'Duplicate of:%'
     RETURNING id, title`,
  );
  return rows;
}

async function applyPlan(plan) {
  let marked = 0;
  for (const action of plan.actions) {
    // eslint-disable-next-line no-await-in-loop
    await migrateProgrammeLinks(action.loserId, action.winnerId);
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'duplicate',
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $1
         AND status <> 'duplicate'`,
      [action.loserId, `Duplicate of: ${action.winnerTitle} (${action.winnerId})`],
    );
    marked += 1;
  }

  const { rows: counts } = await query(
    `SELECT status, COUNT(*)::int AS n
     FROM scholarships
     GROUP BY status
     ORDER BY status`,
  );

  return { marked, counts };
}

async function main() {
  if (restore) {
    const restored = await restoreUndueDuplicates();
    // eslint-disable-next-line no-console
    console.log(`Restored ${restored.length} rows from duplicate → verified`);
    await pool.end();
    return;
  }

  const rows = await loadCandidates();
  const plan = planDeduplication(rows);

  printReport(plan);

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log("\nDry run only. Re-run with --apply to mark duplicates.");
    await pool.end();
    return;
  }

  const result = await applyPlan(plan);
  // eslint-disable-next-line no-console
  console.log(`\nMarked ${result.marked} duplicate rows.`);
  // eslint-disable-next-line no-console
  console.log("Status counts:", result.counts);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
