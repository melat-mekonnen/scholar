const { query } = require('../src/infra/db/neonClient');
const { getTextEmbedding, batchScholarshipEmbeddings, vectorLiteral } = require('../src/services/embeddingService');
const { getRecommendations } = require('../src/usecases/recommendations/getRecommendations');

const TEST_USER_EMAIL = 'test.cs.student@example.com';
const TEST_USER_NAME = 'Test CS Student';
const TEST_USER_PROFILE = {
  degree_level: 'master',
  field_of_study: 'Computer Science',
  gpa: 3.5,
  nationality: 'India',
  preferred_country: 'Canada',
};

const scholarships = [
  {
    title: 'Canada AI Masters Excellence Scholarship',
    organization_name: 'Maple Leaf Tech Foundation',
    country: 'Canada',
    degree_level: 'master',
    field_of_study: 'Computer Science, Artificial Intelligence',
    funding_type: 'Fully Funded',
    amount: 'Full tuition, monthly stipend, travel allowance',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A fully funded scholarship for international students pursuing a master\'s degree in AI and machine learning at top Canadian universities.',
    application_url: 'https://apply.mapleleaftech.ca/ai-masters',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.5 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 100',
    eligible_countries: ['Canada', 'India', 'USA', 'UK', 'Australia'],
    eligible_fields: ['computer science', 'artificial intelligence', 'machine learning'],
  },
  {
    title: 'USA Cybersecurity PhD Research Grant',
    organization_name: 'National Cybersecurity Fellows Program',
    country: 'USA',
    degree_level: 'phd',
    field_of_study: 'Cybersecurity, Computer Science',
    funding_type: 'Fully Funded',
    amount: 'Full tuition, research stipend and conference travel',
    deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'Designed for doctoral students specializing in cybersecurity research with strong technical background and a commitment to public-sector security innovation.',
    application_url: 'https://cyberfellows.us/apply',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.7 required',
    english_requirements: 'TOEFL: 100 or IELTS: 7.5',
    eligible_countries: ['USA', 'Canada', 'UK', 'Germany', 'Australia'],
    eligible_fields: ['cybersecurity', 'computer science', 'information security'],
  },
  {
    title: 'UK Business Leadership Postgraduate Award',
    organization_name: 'London Business Impact Trust',
    country: 'UK',
    degree_level: 'master',
    field_of_study: 'Business, Management, Computer Science',
    funding_type: 'Partial',
    amount: 'Up to £10,000 for tuition support',
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'Supporting postgraduate leaders in business, management or technology-related business analytics programs at UK universities.',
    application_url: 'https://lbimpact.org/postgrad-award',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.0 required',
    english_requirements: 'IELTS: 6.5 preferred',
    eligible_countries: ['UK', 'Canada', 'USA', 'Australia'],
    eligible_fields: ['business', 'management', 'information systems', 'computer science'],
  },
  {
    title: 'Germany Engineering Doctoral Fellowship',
    organization_name: 'Bavarian Engineering Research Council',
    country: 'Germany',
    degree_level: 'phd',
    field_of_study: 'Engineering, Mechanical Engineering',
    funding_type: 'Tuition Only',
    amount: 'Tuition fee waiver and access to research laboratories',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A doctoral fellowship for engineering students focusing on advanced manufacturing, robotics, and energy systems.',
    application_url: 'https://berc.de/doctoral-fellowship',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.8 required',
    english_requirements: 'English proficiency required, IELTS: 7.5 or TOEFL: 105',
    eligible_countries: ['Germany', 'EU', 'UK', 'USA'],
    eligible_fields: ['engineering', 'mechanical engineering', 'robotics'],
  },
  {
    title: 'Japan Business Leadership Scholarship',
    organization_name: 'Tokyo Global Business Initiative',
    country: 'Japan',
    degree_level: 'master',
    field_of_study: 'Business, Management',
    funding_type: 'Partial',
    amount: 'Tuition support and leadership coaching',
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A partial funding opportunity for international master\'s students pursuing business, management, or entrepreneurship studies in Japan.',
    application_url: 'https://tokyobusinessinitiative.jp/scholarship',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.4 required',
    english_requirements: 'IELTS: 6.5 or TOEFL: 90',
    eligible_countries: ['Japan', 'India', 'China', 'South Korea'],
    eligible_fields: ['business', 'management', 'entrepreneurship'],
  },
  {
    title: 'Australia Medical Innovation Scholarship',
    organization_name: 'Melbourne Health Futures Foundation',
    country: 'Australia',
    degree_level: 'bachelor',
    field_of_study: 'Medicine, Health Sciences',
    funding_type: 'Tuition Only',
    amount: 'Full tuition waiver for one year',
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A scholarship supporting undergraduate students in medicine and health sciences programs at Australian universities.',
    application_url: 'https://melbournehealthfutures.org/scholarship',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.3 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 95',
    eligible_countries: ['Australia', 'New Zealand', 'India'],
    eligible_fields: ['medicine', 'health sciences', 'biomedical sciences'],
  },
  {
    title: 'Canada Business Analytics Master Scholarship',
    organization_name: 'Toronto Finance & Data Institute',
    country: 'Canada',
    degree_level: 'master',
    field_of_study: 'Business Analytics, Computer Science',
    funding_type: 'Tuition Only',
    amount: 'Tuition fee waiver and mentorship support',
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A scholarship for graduate students combining business analytics and technology with a focus on data-driven decision making.',
    application_url: 'https://tfdi.ca/business-analytics',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.3 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 95',
    eligible_countries: ['Canada', 'USA', 'UK', 'Australia'],
    eligible_fields: ['business analytics', 'data science', 'computer science'],
  },
  {
    title: "USA Data Science Master's Partial Funding Award",
    organization_name: 'Silicon Valley Data Scholars',
    country: 'USA',
    degree_level: 'master',
    field_of_study: 'Computer Science, Data Science',
    funding_type: 'Partial',
    amount: 'Up to $12,000 for tuition support',
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A partial scholarship for graduate students specializing in data science, analytics, and AI in the United States.',
    application_url: 'https://svdatascholars.org/apply',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.4 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 95',
    eligible_countries: ['USA', 'Canada', 'India', 'UK'],
    eligible_fields: ['data science', 'computer science', 'machine learning'],
  },
  {
    title: 'Germany Software Engineering Fellowship',
    organization_name: 'Hamburg Technology Advancement Fund',
    country: 'Germany',
    degree_level: 'master',
    field_of_study: 'Engineering, Computer Science, Software Engineering',
    funding_type: 'Fully Funded',
    amount: 'Full tuition and monthly stipend',
    deadline: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A fellowship for master\'s students in software engineering and computer science with an emphasis on cloud, embedded systems, and industrial automation.',
    application_url: 'https://hamburgtech.de/fellowship',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.6 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 95',
    eligible_countries: ['Germany', 'EU', 'UK', 'Canada', 'USA'],
    eligible_fields: ['software engineering', 'computer science', 'engineering'],
  },
  {
    title: 'Japan AI Innovation Masters Scholarship',
    organization_name: 'Osaka Future Tech Scholarship',
    country: 'Japan',
    degree_level: 'master',
    field_of_study: 'Artificial Intelligence, Computer Science',
    funding_type: 'Partial',
    amount: 'Partial tuition support and internship placement',
    deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: 'A partial scholarship for international master\'s students focusing on AI innovation, robotics, and intelligent systems in Japan.',
    application_url: 'https://osakatech.jp/ai-innovation',
    status: 'verified',
    gpa_requirements: 'Minimum GPA 3.5 required',
    english_requirements: 'IELTS: 7.0 or TOEFL: 95',
    eligible_countries: ['Japan', 'Canada', 'USA', 'Australia'],
    eligible_fields: ['artificial intelligence', 'computer science', 'robotics'],
  },
];

function formatArray(value) {
  if (!value) return null;
  return value;
}

async function ensureTestUser() {
  const userRow = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [TEST_USER_EMAIL]);
  if (userRow.rows.length) {
    return userRow.rows[0].id;
  }

  const insertUser = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id`,
    [TEST_USER_NAME, TEST_USER_EMAIL, 'seeded-test-password']
  );
  return insertUser.rows[0].id;
}

async function ensureStudentProfile(userId) {
  const profileRow = await query('SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1', [userId]);
  if (profileRow.rows.length) {
    await query(
      `UPDATE student_profiles
       SET degree_level = $1,
           field_of_study = $2,
           gpa = $3,
           preferred_country = $4,
           language_proficiency = $5,
           updated_at = NOW()
       WHERE user_id = $6`,
      [TEST_USER_PROFILE.degree_level, TEST_USER_PROFILE.field_of_study, TEST_USER_PROFILE.gpa, TEST_USER_PROFILE.preferred_country, [], userId]
    );
    return profileRow.rows[0].id;
  }

  const insertProfile = await query(
    `INSERT INTO student_profiles (user_id, field_of_study, gpa, degree_level, preferred_country, language_proficiency)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, TEST_USER_PROFILE.field_of_study, TEST_USER_PROFILE.gpa, TEST_USER_PROFILE.degree_level, TEST_USER_PROFILE.preferred_country, []]
  );
  return insertProfile.rows[0].id;
}

async function insertScholarships() {
  const inserted = [];
  const existingRows = await query('SELECT title FROM scholarships WHERE title = ANY($1)', [scholarships.map((item) => item.title)]);
  const existingTitles = new Set(existingRows.rows.map((row) => row.title));

  for (const data of scholarships) {
    if (existingTitles.has(data.title)) {
      console.log(`Skipping existing scholarship: ${data.title}`);
      continue;
    }
    const result = await query(
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
         gpa_requirements,
         english_requirements,
         eligible_countries,
         eligible_fields,
         created_at,
         updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())
       RETURNING id, title`,
      [
        data.title,
        data.organization_name,
        data.country,
        data.degree_level,
        data.field_of_study,
        data.funding_type,
        data.deadline,
        data.amount,
        data.description,
        data.application_url,
        data.status,
        data.gpa_requirements,
        data.english_requirements,
        formatArray(data.eligible_countries),
        formatArray(data.eligible_fields),
      ]
    );
    inserted.push({ ...data, id: result.rows[0].id });
  }

  return inserted;
}

async function embedScholarships(inserted) {
  if (!inserted.length) return [];
  try {
    const embeddings = await batchScholarshipEmbeddings(inserted);
    const updated = [];
    for (const { scholarship, embedding } of embeddings) {
      const row = inserted.find((item) => item.title === scholarship.title);
      if (!row) continue;
      await query(
        `UPDATE scholarships SET embedding = $1 WHERE title = $2`,
        [vectorLiteral(embedding), scholarship.title]
      );
      updated.push(scholarship.title);
    }
    return updated;
  } catch (error) {
    console.warn('Embedding generation skipped:', error.message);
    return [];
  }
}

async function printRecommendations(userId, queryText) {
  try {
    const results = await getRecommendations({ userId, topN: 10, q: queryText });
    console.log(`\nRecommendations for query: "${queryText}"`);
    for (const rec of results.results) {
      console.log(`- ${rec.title}`);
      console.log(`  country: ${rec.country}, degree: ${rec.degree_level}, field: ${rec.field_of_study}`);
      console.log(`  funding: ${rec.funding_type}, deadline: ${rec.deadline}`);
      console.log(`  semanticScore: ${rec.semanticScore?.toFixed(4) || 0}`);
      console.log(`  eligibility: ${rec.eligibility ? rec.eligibility.status : 'none'}`);
      if (rec.eligibility) {
        console.log(`  eligibility score: ${rec.eligibility.score}`);
        console.log(`  explanation: ${rec.eligibility.explanation}`);
      }
      if (rec.rankingReasons && rec.rankingReasons.length) {
        console.log(`  rankingReasons: ${rec.rankingReasons.join('; ')}`);
      }
      console.log('');
    }
  } catch (err) {
    console.error('Failed to fetch recommendations:', err.message);
  }
}

async function run() {
  const userId = await ensureTestUser();
  await ensureStudentProfile(userId);
  const inserted = await insertScholarships();
  if (!inserted.length) {
    console.log('No new scholarships were inserted.');
  } else {
    console.log('\nInserted scholarship titles:');
    inserted.forEach((item) => console.log(`- ${item.title}`));
  }

  const updatedEmbeddings = await embedScholarships(inserted);
  if (updatedEmbeddings.length) {
    console.log('\nEmbeddings generated for:');
    updatedEmbeddings.forEach((title) => console.log(`- ${title}`));
  } else if (process.env.OPENAI_API_KEY) {
    console.log('\nEmbeddings generation was attempted but did not complete.');
  } else {
    console.log('\nOpenAI API key was not configured; skipping embedding generation.');
  }

  await printRecommendations(userId, 'Canada AI Masters');
  await printRecommendations(userId, 'cybersecurity phd');
  await printRecommendations(userId, 'business scholarships in japan');
  await printRecommendations(userId, 'urgent AI scholarships');
}

run()
  .then(() => {
    console.log('\nSeeding complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
