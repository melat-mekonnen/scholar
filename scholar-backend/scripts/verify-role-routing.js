/**
 * Calls POST /api/auth/login for each seeded test user and prints role + expected UI path.
 * Requires API running (npm run dev) and seeded users (npm run seed:test-roles).
 *
 * Usage: npm run verify:role-routing
 */
const axios = require("axios");
require("dotenv").config();

const BASE =
  process.env.VERIFY_API_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";

const ACCOUNTS = [
  { email: "student.role.test@scholar.local", expectedPath: "/dashboard" },
  { email: "manager.role.test@scholar.local", expectedPath: "/manager" },
  { email: "owner.role.test@scholar.local", expectedPath: "/owner" },
  { email: "admin.role.test@scholar.local", expectedPath: "/admin" },
];

function pathForRole(role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "owner":
      return "/owner";
    case "manager":
      return "/manager";
    default:
      return "/dashboard";
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("API:", BASE, "\n");

  let failed = 0;
  for (const a of ACCOUNTS) {
    try {
      const { data } = await axios.post(
        `${BASE}/api/auth/login`,
        { email: a.email, password: PASSWORD },
        { validateStatus: () => true }
      );
      if (!data?.user?.role || !data?.token) {
        // eslint-disable-next-line no-console
        console.log("FAIL", a.email, data?.message || "no token");
        failed += 1;
        continue;
      }
      const role = data.user.role;
      const path = pathForRole(role);
      const ok = path === a.expectedPath;
      if (!ok) failed += 1;
      // eslint-disable-next-line no-console
      console.log(
        ok ? "OK  " : "BAD ",
        role.padEnd(8),
        "->",
        path,
        " ",
        a.email
      );
    } catch (err) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.log("FAIL", a.email, err.message);
    }
  }

  if (failed) {
    // eslint-disable-next-line no-console
    console.log("\nSome checks failed. Is the API up? Users seeded?");
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("\nAll role responses match frontend getPostAuthPath() mapping.");
  }
}

main();
