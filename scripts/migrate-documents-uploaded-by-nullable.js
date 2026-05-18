const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE documents
     ALTER COLUMN uploaded_by_user_id DROP NOT NULL`,
    [],
  );
  // eslint-disable-next-line no-console
  console.log("documents.uploaded_by_user_id is now nullable (platform templates)");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("migrate-documents-uploaded-by-nullable failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
