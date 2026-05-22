/**
 * Add field_category to scholarships + study_programmes and backfill from raw field/title.
 */
require("dotenv").config();
const { query, pool } = require("../src/infra/db/neonClient");
const { resolveFieldCategory } = require("../src/utils/fieldCategory");

async function ensureColumn(table) {
  await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS field_category TEXT`, []);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_${table}_field_category ON ${table} (field_category)`,
    [],
  );
}

async function backfillTable(table) {
  const rows = await query(
    `SELECT id, field_of_study, title, degree_level FROM ${table}`,
    [],
  );

  let updated = 0;
  for (const row of rows.rows) {
    const fieldCategory = resolveFieldCategory({
      fieldOfStudy: row.field_of_study,
      title: row.title,
      degreeLevel: row.degree_level,
    });
    await query(`UPDATE ${table} SET field_category = $2, updated_at = NOW() WHERE id = $1`, [
      row.id,
      fieldCategory,
    ]);
    updated += 1;
  }

  return updated;
}

async function main() {
  await ensureColumn("scholarships");
  await ensureColumn("study_programmes");

  const scholarshipCount = await backfillTable("scholarships");
  const programmeCount = await backfillTable("study_programmes");

  console.log(`Backfilled field_category on ${scholarshipCount} scholarship row(s).`);
  console.log(`Backfilled field_category on ${programmeCount} study programme row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
