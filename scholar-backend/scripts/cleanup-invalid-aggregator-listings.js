/**
 * Reject verified aggregator hub pages and dedupe by normalized title.
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const { classifyScholarshipRecord } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");
const { stripHtmlFromText } = require("../src/modules/scholarship-ingestion/descriptionQuality");

function normalizeTitle(title) {
  return stripHtmlFromText(title).toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const { rows } = await query(
    `SELECT id, title, description, application_url, source_url, source_name, status, updated_at
     FROM scholarships
     WHERE status IN ('verified', 'needs_review', 'pending')
       AND COALESCE(record_type, 'scholarship') = 'scholarship'`,
  );

  const rejectIds = [];
  for (const row of rows) {
    const record = {
      title: row.title,
      description: row.description,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
    };
    if (classifyScholarshipRecord(record).reject) rejectIds.push(row.id);
  }

  let rejected = 0;
  if (rejectIds.length) {
    const result = await query(
      `UPDATE scholarships SET status = 'rejected', updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND status = 'verified'
       RETURNING id`,
      [rejectIds],
    );
    rejected = result.rowCount;
    await query(
      `UPDATE scholarships SET status = 'rejected', updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND status IN ('needs_review', 'pending')`,
      [rejectIds],
    );
  }

  const verified = await query(
    `SELECT id, title, updated_at
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'`,
  );

  const byTitle = new Map();
  for (const row of verified.rows) {
    const key = normalizeTitle(row.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(row);
  }

  const dupeIds = [];
  for (const group of byTitle.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    for (const row of group.slice(1)) dupeIds.push(row.id);
  }

  let deduped = 0;
  if (dupeIds.length) {
    const result = await query(
      `UPDATE scholarships SET status = 'duplicate', updated_at = NOW()
       WHERE id = ANY($1::uuid[])
       RETURNING id`,
      [dupeIds],
    );
    deduped = result.rowCount;
  }

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
        scanned: rows.length,
        classifiedInvalid: rejectIds.length,
        rejectedFromVerified: rejected,
        titleDuplicateGroups: [...byTitle.values()].filter((g) => g.length > 1).length,
        markedDuplicate: deduped,
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
