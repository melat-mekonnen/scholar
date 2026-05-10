const bcrypt = require("bcryptjs");
const { query } = require("../src/infra/db/neonClient");

const PASSWORD = "ScholarTest1!";

const TEST_STUDENTS = [
  {
    email: "free.ai.student@scholar.local",
    full_name: "Free AI Student",
    plan_type: "free",
    profile: {
      field_of_study: "Computer Science, Artificial Intelligence",
      gpa: 3.6,
      degree_level: "master",
      preferred_country: "Canada",
      interests: ["AI", "robotics", "machine learning"],
      language_proficiency: ["IELTS 7.5"],
      goals: "Pursue AI research and internships in Canada.",
      preferred_funding_type: "Fully Funded",
      completeness_score: 85,
    },
  },
  {
    email: "free.business.student@scholar.local",
    full_name: "Free Business Student",
    plan_type: "free",
    profile: {
      field_of_study: "Business, Management",
      gpa: 3.2,
      degree_level: "master",
      preferred_country: "Japan",
      interests: ["management", "leadership", "entrepreneurship"],
      language_proficiency: ["IELTS 6.5"],
      goals: "Study business leadership in Asia and develop startup skills.",
      preferred_funding_type: "Partial",
      completeness_score: 70,
    },
  },
  {
    email: "free.medical.student@scholar.local",
    full_name: "Free Medical Student",
    plan_type: "free",
    profile: {
      field_of_study: "Medicine, Health Sciences",
      gpa: 3.4,
      degree_level: "bachelor",
      preferred_country: "Australia",
      interests: ["health research", "public health"],
      language_proficiency: ["IELTS 7.0"],
      goals: "Gain an undergraduate medical scholarship and research experience.",
      preferred_funding_type: "Tuition Only",
      completeness_score: 75,
    },
  },
  {
    email: "premium.cyber.student@scholar.local",
    full_name: "Premium Cybersecurity Student",
    plan_type: "premium",
    profile: {
      field_of_study: "Cybersecurity, Computer Science",
      gpa: 3.8,
      degree_level: "phd",
      preferred_country: "USA",
      interests: ["cybersecurity", "research", "public-sector security"],
      language_proficiency: ["TOEFL 105"],
      goals: "Lead cybersecurity research and policy innovation in the US.",
      preferred_funding_type: "Fully Funded",
      completeness_score: 90,
    },
  },
  {
    email: "premium.engineering.student@scholar.local",
    full_name: "Premium Engineering Student",
    plan_type: "premium",
    profile: {
      field_of_study: "Engineering, Software Engineering",
      gpa: 3.7,
      degree_level: "master",
      preferred_country: "Germany",
      interests: ["software engineering", "embedded systems", "cloud"],
      language_proficiency: ["IELTS 7.0"],
      goals: "Secure a premium fellowship for software engineering and industrial automation.",
      preferred_funding_type: "Fully Funded",
      completeness_score: 88,
    },
  },
];

async function upsertUser(student, passwordHash) {
  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, auth_provider, role, plan_type, ai_requests_today, ai_requests_reset_at, subscription_status, is_active)
     VALUES ($1, $2, $3, 'local', 'student', $4, 0, NOW(), 'active', TRUE)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       plan_type = EXCLUDED.plan_type,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id`,
    [student.full_name, student.email.toLowerCase(), passwordHash, student.plan_type],
  );
  return result.rows[0].id;
}

async function upsertProfile(userId, profile) {
  await query(
    `INSERT INTO student_profiles (user_id, field_of_study, gpa, degree_level, preferred_country, interests, language_proficiency, goals, preferred_funding_type, completeness_score, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       field_of_study = EXCLUDED.field_of_study,
       gpa = EXCLUDED.gpa,
       degree_level = EXCLUDED.degree_level,
       preferred_country = EXCLUDED.preferred_country,
       interests = EXCLUDED.interests,
       language_proficiency = EXCLUDED.language_proficiency,
       goals = EXCLUDED.goals,
       preferred_funding_type = EXCLUDED.preferred_funding_type,
       completeness_score = EXCLUDED.completeness_score,
       updated_at = NOW()`,
    [
      userId,
      profile.field_of_study,
      profile.gpa,
      profile.degree_level,
      profile.preferred_country,
      profile.interests,
      profile.language_proficiency,
      profile.goals,
      profile.preferred_funding_type,
      profile.completeness_score,
    ],
  );
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const seeded = [];

  for (const student of TEST_STUDENTS) {
    const userId = await upsertUser(student, passwordHash);
    await upsertProfile(userId, student.profile);
    seeded.push({ email: student.email, plan_type: student.plan_type });
  }

  console.log("Seeded student profiles and users:");
  seeded.forEach((item) => {
    console.log(`- ${item.email} (${item.plan_type})`);
  });
  console.log("All students share the password:", PASSWORD);
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
