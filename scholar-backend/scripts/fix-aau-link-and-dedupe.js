const { query, pool } = require("../src/infra/db/neonClient");

const title =
  "Addis Ababa University Presidential Scholarship Opportunity Undergraduate Programs Academic Year 2025/26 (2018 E.C)";
const url =
  "https://www.aau.edu.et/announcements/detail?title=Addis~Ababa~University~Presidential~Scholarship~Opportunity~Undergraduate~Programs~Academic~Year~2025/26~(2018~E.C)";

async function main() {
  await query(
    `UPDATE scholarships
     SET application_url = $1,
         updated_at = NOW()
     WHERE title = $2`,
    [url, title],
  );

  const keep = await query(
    `SELECT id
     FROM scholarships
     WHERE title = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [title],
  );

  if (!keep.rows[0]?.id) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ message: "No matching scholarship found" }, null, 2));
    return;
  }

  await query(
    `DELETE FROM scholarships
     WHERE title = $1
       AND id <> $2`,
    [title, keep.rows[0].id],
  );

  const final = await query(
    `SELECT id, title, application_url, status, deadline
     FROM scholarships
     WHERE id = $1`,
    [keep.rows[0].id],
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ kept: final.rows[0] || null, removedDuplicates: true }, null, 2));
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("fix script failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
