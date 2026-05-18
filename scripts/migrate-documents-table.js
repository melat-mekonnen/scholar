const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      file_size BIGINT NOT NULL DEFAULT 0,
      scholarship_id UUID REFERENCES scholarships(id) ON DELETE SET NULL,
      uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    []
  );

  await query(
    "CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)",
    []
  );
  await query(
    "CREATE INDEX IF NOT EXISTS idx_documents_scholarship_id ON documents(scholarship_id)",
    []
  );
  await query(
    "CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by_user_id)",
    []
  );
  await query(
    "CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC)",
    []
  );

  // eslint-disable-next-line no-console
  console.log("documents table migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("documents migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

