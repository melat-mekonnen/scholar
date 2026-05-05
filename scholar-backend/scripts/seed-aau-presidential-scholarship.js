const { query, pool } = require("../src/infra/db/neonClient");

const APPLICATION_URL =
  "https://www.aau.edu.et/announcements/detail?title=Addis~Ababa~University~Presidential~Scholarship~Opportunity~Undergraduate~Programs~Academic~Year~2025/26~(2018~E.C)";

const payload = {
  title:
    "Addis Ababa University Presidential Scholarship Opportunity Undergraduate Programs Academic Year 2025/26 (2018 E.C)",
  organization_name: "Addis Ababa University",
  country: "Ethiopia",
  degree_level: "bachelor",
  field_of_study: "multi-disciplinary",
  funding_type: "fully_funded",
  deadline: null,
  amount: "Full tuition + modest incentive",
  description:
    "Addis Ababa University is proud to announce the Presidential Scholarship Program for the 2025/26 (2018 E.C) academic year. This prestigious opportunity is open to 200 outstanding students who have successfully completed the 2017 E.C Ethiopian Secondary School Leaving Certificate Examination (ESSLCE) and are entering undergraduate studies.\n\nThe scholarship is designed to nurture the next generation of leaders, scientists, and researchers through an honors program across various disciplines. Recipients will be placed in the following colleges according to the specified distribution:\n1. College of Natural and Computational Sciences, 15%\n2. College of Technology and Built Environment, 17%\n3. College of Veterinary Medicine and Agriculture, 4%\n4. College of Health Sciences, 15%\n5. College of Business and Economics, 13%\n6. College of Social Sciences, Humanities and Arts, and School of Law, 20%\n7. College of Education and Language Studies, 16%\n\nScholarship Benefits and Conditions:\n- Full tuition coverage and a modest incentive package.\n- Continued eligibility requires maintaining a cGPA of 3.5 or above and remaining in the assigned academic program.\n- Graduates of the Presidential Scholarship Program will be automatically eligible for fully funded graduate studies (Master's and PhD) in their respective fields, enabling deeper specialization and advanced skill development.\n\nThis initiative reflects Addis Ababa University's commitment to academic excellence and national development through the empowerment of high-achieving students.\n\nFinal deadline for Presidential Scholarship applications: September 19, 2025.",
  application_url: APPLICATION_URL,
  status: "verified",
};

async function main() {
  const existing = await query(
    `SELECT id
     FROM scholarships
     WHERE application_url = $1
     LIMIT 1`,
    [APPLICATION_URL],
  );

  if (existing.rows[0]?.id) {
    const updated = await query(
      `UPDATE scholarships
       SET title = $2,
           organization_name = $3,
           country = $4,
           degree_level = $5,
           field_of_study = $6,
           funding_type = $7,
       deadline = $8,
           amount = $9,
           description = $10,
           status = $11,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, organization_name, country, degree_level, deadline, status, application_url`,
      [
        existing.rows[0].id,
        payload.title,
        payload.organization_name,
        payload.country,
        payload.degree_level,
        payload.field_of_study,
        payload.funding_type,
        payload.deadline,
        payload.amount,
        payload.description,
        payload.status,
      ],
    );
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ action: "updated", scholarship: updated.rows[0] || null }, null, 2),
    );
    return;
  }

  const inserted = await query(
    `INSERT INTO scholarships (
       title,
       organization_name,
       country,
       degree_level,
       field_of_study,
       funding_type,
       deadline,
       amount,
       description,
       application_url,
       status,
       posted_by_user_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL)
     RETURNING id, title, organization_name, country, degree_level, deadline, status, application_url`,
    [
      payload.title,
      payload.organization_name,
      payload.country,
      payload.degree_level,
      payload.field_of_study,
      payload.funding_type,
      payload.deadline,
      payload.amount,
      payload.description,
      payload.application_url,
      payload.status,
    ],
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ action: "inserted", scholarship: inserted.rows[0] || null }, null, 2),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
