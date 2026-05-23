/**
 * Inserts one local user per role (student, manager, owner, admin) for manual routing checks.
 * Same password for all — dev only. Re-run safe: inserts only if missing.
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

  let insertedCount = 0;
  let skippedCount = 0;

  try {
    for (const u of TEST_USERS) {
      const result = await client.query(
        `INSERT INTO users (full_name, email, password_hash, auth_provider, role, is_active)
         VALUES ($1, $2, $3, 'local', $4, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [u.fullName, u.email.toLowerCase(), passwordHash, u.role]
      );

      if (result.rowCount === 1) {
        insertedCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  } finally {
    await client.end();
  }

  // eslint-disable-next-line no-console
  console.log(
    `Role test users seed complete (inserted: ${insertedCount}, existing: ${skippedCount}).`
  );
  // eslint-disable-next-line no-console
  console.log("Password for inserted users:", PASSWORD);
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
