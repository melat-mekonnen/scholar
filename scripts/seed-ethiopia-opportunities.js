const { query, pool } = require("../src/infra/db/neonClient");

const opportunities = [
  {
    title: "Ethiopian Government University Admission (Public Universities)",
    organization_name: "Ethiopia Ministry of Education",
    country: "Ethiopia",
    degree_level: "bachelor",
    field_of_study: "multi-disciplinary",
    funding_type: "fully_funded",
    deadline: "2026-09-15",
    amount: "Public university tuition coverage",
    description:
      "Main higher-education pathway in Ethiopia (not a separate form scholarship). Undergraduate placement happens after Grade 12 national exam results; admission cycle usually runs July-September. Includes full tuition in public universities. Some limited government-sponsored Masters pathways may exist via official calls.",
    application_url:
      "https://www.scholarshipscentral.com/scholarships/ethiopia-government-scholarship-masters?utm_source=chatgpt.com",
    status: "verified",
  },
  {
    title: "Czech Government Scholarship (Fully Funded)",
    organization_name: "Government of the Czech Republic",
    country: "Czech Republic",
    degree_level: "master/phd",
    field_of_study: "multi-disciplinary",
    funding_type: "fully_funded",
    deadline: "2026-09-30",
    amount: "Tuition + stipend + accommodation support",
    description:
      "Government scholarship for Masters and PhD studies in Czech Republic. Typically covers tuition, monthly stipend, and accommodation support, with English-taught options available. Ethiopia is a priority country in many rounds. Application cycle commonly closes around September 30 each year; verify on official portal.",
    application_url: "http://registr.dzs.cz/registr.nsf",
    status: "verified",
  },
  {
    title: "Chevening Scholarship (UK Government)",
    organization_name: "UK Foreign, Commonwealth and Development Office",
    country: "United Kingdom",
    degree_level: "master",
    field_of_study: "multi-disciplinary",
    funding_type: "fully_funded",
    deadline: "2026-11-05",
    amount: "Full tuition + living allowance + return flights",
    description:
      "Fully funded UK government leadership scholarship for one-year Masters degrees. Usually opens in August and closes in early November. Standard eligibility includes a completed Bachelor's degree and around two years of work experience.",
    application_url: "https://www.chevening.org/apply/",
    status: "verified",
  },
  {
    title: "DAAD Scholarship (Germany)",
    organization_name: "German Academic Exchange Service (DAAD)",
    country: "Germany",
    degree_level: "master/phd",
    field_of_study: "multi-disciplinary",
    funding_type: "fully_funded",
    deadline: "2026-12-15",
    amount: "Stipend + travel + program-dependent tuition support",
    description:
      "DAAD scholarship pathways for Masters/PhD in Germany. Many programs are available in English. Deadlines vary by program, often around October-December. Applicants must check each program page for exact requirements and timeline.",
    application_url:
      "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    status: "verified",
  },
  {
    title:
      "International Community School of Addis Ababa Scholarship (High School)",
    organization_name: "International Community School of Addis Ababa",
    country: "Ethiopia",
    degree_level: "high_school",
    field_of_study: "general-secondary",
    funding_type: "fully_funded",
    deadline: "2026-04-15",
    amount: "Full 4-year high school scholarship",
    description:
      "Merit and need-based high school scholarship, typically for Grade 9 entry. Usually includes a competitive selection exam and commonly runs with March-April application timing. Focused on top students from Addis Ababa schools.",
    application_url: "https://www.icsaddis.org",
    status: "verified",
  },
];

async function upsertOpportunity(item) {
  const existing = await query(
    `SELECT id FROM scholarships WHERE application_url = $1 LIMIT 1`,
    [item.application_url],
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
       RETURNING id, title, country, degree_level, funding_type, application_url`,
      [
        existing.rows[0].id,
        item.title,
        item.organization_name,
        item.country,
        item.degree_level,
        item.field_of_study,
        item.funding_type,
        item.deadline,
        item.amount,
        item.description,
        item.status,
      ],
    );
    return { action: "updated", scholarship: updated.rows[0] || null };
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
     RETURNING id, title, country, degree_level, funding_type, application_url`,
    [
      item.title,
      item.organization_name,
      item.country,
      item.degree_level,
      item.field_of_study,
      item.funding_type,
      item.deadline,
      item.amount,
      item.description,
      item.application_url,
      item.status,
    ],
  );
  return { action: "inserted", scholarship: inserted.rows[0] || null };
}

async function main() {
  const results = [];
  for (const item of opportunities) {
    const result = await upsertOpportunity(item);
    results.push(result);
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ total: results.length, results }, null, 2));
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

