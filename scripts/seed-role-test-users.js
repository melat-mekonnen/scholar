/**
 * Inserts one local user per role (student, manager, owner, admin) for manual routing checks.
 * Same password for all — dev only. Re-run safe: upserts on email.
 *
 * Usage: npm run seed:test-roles
 */
const bcrypt = require("bcryptjs");
const { Client } = require("pg");
require("dotenv").config();

const PASSWORD = "ScholarTest1!";

const TEST_USERS = [
  {
    email: "student.role.test@scholar.local",
    fullName: "Test Student",
    role: "student",
  },
  {
    email: "manager.role.test@scholar.local",
    fullName: "Test Manager",
    role: "manager",
  },
  {
    email: "owner.role.test@scholar.local",
    fullName: "Test Owner",
    role: "owner",
  },
  {
    email: "admin.role.test@scholar.local",
    fullName: "Test Admin",
    role: "admin",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const u of TEST_USERS) {
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, auth_provider, role, is_active)
         VALUES ($1, $2, $3, 'local', $4, TRUE)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           auth_provider = 'local',
           is_active = TRUE,
           updated_at = NOW()`,
        [u.fullName, u.email.toLowerCase(), passwordHash, u.role]
      );
    }
  } finally {
    await client.end();
  }

  // eslint-disable-next-line no-console
  console.log("Seeded 4 role test users (password for all):", PASSWORD);
  // eslint-disable-next-line no-console
  console.log("");
  for (const u of TEST_USERS) {
    // eslint-disable-next-line no-console
    console.log(`  ${u.role.padEnd(8)}  ${u.email}`);
  }
  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log("After sign-in, frontend should route:");
  // eslint-disable-next-line no-console
  console.log("  student -> /dashboard");
  // eslint-disable-next-line no-console
  console.log("  manager -> /manager");
  // eslint-disable-next-line no-console
  console.log("  owner   -> /owner");
  // eslint-disable-next-line no-console
  console.log("  admin   -> /admin");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
