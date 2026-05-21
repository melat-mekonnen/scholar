const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE documents
     ADD COLUMN IF NOT EXISTS requires_pro BOOLEAN NOT NULL DEFAULT false`
  );
  await query(
    `UPDATE documents
     SET requires_pro = true
     WHERE type IN ('cover_letter_template', 'resume_template')
       AND scholarship_id IS NULL`
  );
  await query(
    `UPDATE documents
     SET requires_pro = false
     WHERE type = 'cv_template'`
  );
  // eslint-disable-next-line no-console
  console.log("documents.requires_pro migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("migrate-documents-requires-pro failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
