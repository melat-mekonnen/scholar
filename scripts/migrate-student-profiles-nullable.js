/**
 * Makes student_profiles columns optional for partial saves (existing DBs only).
 * New installs: db/schema.sql already has nullable columns.
 */
const { query, pool } = require("../src/infra/db/neonClient");

const STEPS = [
  `ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_gpa_check`,
  `ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_degree_level_check`,
  `ALTER TABLE student_profiles ALTER COLUMN field_of_study DROP NOT NULL`,
  `ALTER TABLE student_profiles ALTER COLUMN gpa DROP NOT NULL`,
  `ALTER TABLE student_profiles ALTER COLUMN degree_level DROP NOT NULL`,
  `ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gpa_check
   CHECK (gpa IS NULL OR (gpa >= 0.0 AND gpa <= 4.0))`,
  `ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_degree_level_check
   CHECK (degree_level IS NULL OR degree_level IN ('high_school', 'bachelor', 'master', 'phd'))`,
];

async function main() {
  for (const stmt of STEPS) {
    await query(stmt, []);
  }
  // eslint-disable-next-line no-console
  console.log("OK: student_profiles nullable migration applied.");
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
