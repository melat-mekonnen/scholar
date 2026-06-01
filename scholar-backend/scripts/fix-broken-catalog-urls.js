/**
 * One-shot repair for known broken apply URLs and misclassified closed programmes.
 */
require("dotenv").config();

const { pool, query } = require("../src/infra/db/neonClient");

async function deleteDuplicateTitles(titlePattern, keepBestSql) {
  const { rows } = await query(
    `SELECT id, application_url, source_url, application_status, is_rolling, status, updated_at
     FROM scholarships
     WHERE title ILIKE $1
     ORDER BY updated_at DESC`,
    [titlePattern],
  );
  if (rows.length <= 1) return { kept: rows[0]?.id || null, deleted: [] };

  let keep = rows[0];
  if (keepBestSql === "mandela") {
    keep = rows.find((r) => r.application_url?.includes("/scholarship/apply")) || rows[0];
  }
  if (keepBestSql === "strath") {
    keep =
      rows.find((r) => r.application_url?.includes("#apply")) ||
      rows.find((r) => r.application_status === "closed") ||
      rows[0];
  }
  if (keepBestSql === "oxford") {
    keep =
      rows.find((r) => r.application_url?.includes("cscuk.fcdo.gov.uk")) ||
      rows.find((r) => r.application_status === "closed") ||
      rows[0];
  }

  const deleted = [];
  for (const row of rows) {
    if (row.id === keep.id) continue;
    // eslint-disable-next-line no-await-in-loop
    await query(`DELETE FROM scholarships WHERE id = $1`, [row.id]);
    deleted.push(row.id);
  }
  return { kept: keep.id, deleted };
}

async function patchById(id, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = $${i}`);
    vals.push(value);
    i += 1;
  }
  if (!sets.length) return null;
  vals.push(id);
  const result = await query(
    `UPDATE scholarships SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING id, title, application_url, source_url, application_status, is_rolling, status`,
    vals,
  );
  return result.rows[0];
}

async function backfillClosedFromDescription() {
  const result = await query(
    `UPDATE scholarships
     SET application_status = 'closed',
         is_rolling = FALSE,
         status = CASE WHEN status = 'verified' THEN 'verified' ELSE status END,
         updated_at = NOW()
     WHERE status IN ('verified', 'needs_review')
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND (application_status IS NULL OR application_status <> 'closed')
       AND description ~* 'currently closed'
     RETURNING id, title`,
  );
  return result.rows;
}

async function main() {
  const deduped = {
    mandela: await deleteDuplicateTitles("Mandela Rhodes%", "mandela"),
    strath: await deleteDuplicateTitles("Commonwealth Shared Scholarship — University of Strathclyde%", "strath"),
    oxford: await deleteDuplicateTitles("Commonwealth Shared Scholarship — University of Oxford%", "oxford"),
  };

  const patches = [];

  if (deduped.mandela.kept) {
    patches.push(
      await patchById(deduped.mandela.kept, {
        application_url: "https://www.mandelarhodes.org/scholarship/apply/",
        source_url: "https://www.mandelarhodes.org/scholarship/apply/",
        is_rolling: false,
        application_status: null,
        status: "verified",
      }),
    );
  }

  if (deduped.strath.kept) {
    patches.push(
      await patchById(deduped.strath.kept, {
        application_url:
          "https://www.strath.ac.uk/studywithus/scholarships/commonwealthsharedscholarship/#apply",
        source_url:
          "https://www.strath.ac.uk/studywithus/scholarships/commonwealthsharedscholarship/#apply",
        application_start_date: "2025-11-12",
        application_end_date: "2025-12-09",
        deadline: "2025-12-09",
        is_rolling: false,
        application_status: "closed",
        status: "verified",
      }),
    );
  }

  if (deduped.oxford.kept) {
    patches.push(
      await patchById(deduped.oxford.kept, {
        application_url: "https://cscuk.fcdo.gov.uk/apply/",
        source_url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/",
        is_rolling: false,
        application_status: "closed",
        status: "verified",
      }),
    );
  }

  const closedFromDesc = await backfillClosedFromDescription();

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
        deduped,
        patches,
        closedFromDescription: closedFromDesc.length,
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
