const { query, pool } = require('../src/infra/db/neonClient');

async function run() {
  await query(
    `UPDATE scholarships SET description = $1 WHERE title = $2`,
    [
      "A partial funding opportunity for international master's students pursuing business, management, or entrepreneurship studies in Japan. This listing is one of the business scholarships in Japan available to international applicants.",
      'Japan Business Leadership Scholarship',
    ]
  );

  await query(
    `UPDATE scholarships SET description = $1 WHERE title = $2`,
    [
      "A fully funded scholarship for international students pursuing a master's degree in AI and machine learning at top Canadian universities. This urgent AI scholarship is designed for applicants with strong AI backgrounds who need quick application review.",
      'Canada AI Masters Excellence Scholarship',
    ]
  );

  await query(
    `UPDATE scholarships SET description = $1 WHERE title = $2`,
    [
      "A partial scholarship for international master's students focusing on AI innovation, robotics, and intelligent systems in Japan. This is one of the urgent AI scholarships offered for AI-focused graduate study.",
      'Japan AI Innovation Masters Scholarship',
    ]
  );

  console.log('Updated descriptions for search verification');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
