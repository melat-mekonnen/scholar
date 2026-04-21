const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships (status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships (deadline)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_created_at ON scholarships (created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_country ON scholarships (country)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_degree_level ON scholarships (degree_level)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_field_of_study ON scholarships (field_of_study)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_funding_type ON scholarships (funding_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_posted_by ON scholarships (posted_by_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_title_lower ON scholarships (LOWER(title))`);
  await query(`CREATE INDEX IF NOT EXISTS idx_scholarships_description_lower ON scholarships (LOWER(description))`);
  console.log("scholarship search indexes migration complete");
}

run()
  .catch((err) => {
    console.error("scholarship search indexes migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
