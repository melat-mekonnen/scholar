const { query, pool } = require('../src/infra/db/neonClient');

async function run() {
  await query(
    `UPDATE scholarships
     SET title = $1,
         organization_name = $2,
         degree_level = $3,
         field_of_study = $4,
         funding_type = $5,
         amount = $6,
         description = $7,
         application_url = $8,
         gpa_requirements = $9,
         english_requirements = $10,
         eligible_countries = $11,
         eligible_fields = $12
     WHERE title = $13 AND organization_name = $14`,
    [
      'Japan Business Leadership Scholarship',
      'Tokyo Global Business Initiative',
      'master',
      'Business, Management',
      'Partial',
      'Tuition support and leadership coaching',
      "A partial funding opportunity for international master's students pursuing business, management, or entrepreneurship studies in Japan.",
      'https://tokyobusinessinitiative.jp/scholarship',
      'Minimum GPA 3.4 required',
      'IELTS: 6.5 or TOEFL: 90',
      ['Japan', 'India', 'China', 'South Korea'],
      ['business', 'management', 'entrepreneurship'],
      'Japan Medicine Research Funding',
      'Tokyo Global Healthcare Scholarship',
    ]
  );

  await query(
    `UPDATE scholarships
     SET title = $1,
         organization_name = $2,
         degree_level = $3,
         field_of_study = $4,
         funding_type = $5,
         amount = $6,
         description = $7,
         application_url = $8,
         gpa_requirements = $9,
         english_requirements = $10,
         eligible_countries = $11,
         eligible_fields = $12
     WHERE title = $13 AND organization_name = $14`,
    [
      'Australia Medical Innovation Scholarship',
      'Melbourne Health Futures Foundation',
      'bachelor',
      'Medicine, Health Sciences',
      'Tuition Only',
      'Full tuition waiver for one year',
      'A scholarship supporting undergraduate students in medicine and health sciences programs at Australian universities.',
      'https://melbournehealthfutures.org/scholarship',
      'Minimum GPA 3.3 required',
      'IELTS: 7.0 or TOEFL: 95',
      ['Australia', 'New Zealand', 'India'],
      ['medicine', 'health sciences', 'biomedical sciences'],
      'Australia Computer Science Bachelor Innovators Scholarship',
      'Sydney Tech Innovators Fund',
    ]
  );

  console.log('Updated existing scholarship entries.');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
