/**
 * Integration checks for Milestone 2 user APIs (requires running API + seeded test users).
 *
 * Usage: npm run verify:milestone2
 * Env: VERIFY_API_BASE_URL (default http://127.0.0.1:PORT), PORT from .env or 4000
 */
const axios = require("axios");
require("dotenv").config();

const BASE =
  process.env.VERIFY_API_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";

const STUDENT_EMAIL = "student.role.test@scholar.local";
const OWNER_EMAIL = "owner.role.test@scholar.local";
const ADMIN_EMAIL = "admin.role.test@scholar.local";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email) {
  const { data, status } = await axios.post(
    `${BASE}/api/auth/login`,
    { email, password: PASSWORD },
    { validateStatus: () => true }
  );
  return { data, status };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Milestone 2 API checks —", BASE, "\n");

  let failed = 0;

  const studentAuth = await login(STUDENT_EMAIL);
  if (studentAuth.status !== 200 || !studentAuth.data?.token) {
    // eslint-disable-next-line no-console
    console.log("FAIL login student", studentAuth.status, studentAuth.data);
    failed += 1;
    process.exitCode = 1;
    return;
  }
  const studentToken = studentAuth.data.token;

  const ownerAuth = await login(OWNER_EMAIL);
  if (ownerAuth.status !== 200 || !ownerAuth.data?.token) {
    // eslint-disable-next-line no-console
    console.log("FAIL login owner", ownerAuth.status, ownerAuth.data);
    failed += 1;
    process.exitCode = 1;
    return;
  }
  const ownerToken = ownerAuth.data.token;

  const adminAuth = await login(ADMIN_EMAIL);
  if (adminAuth.status !== 200 || !adminAuth.data?.token) {
    // eslint-disable-next-line no-console
    console.log("FAIL login admin", adminAuth.status, adminAuth.data);
    failed += 1;
    process.exitCode = 1;
    return;
  }
  const adminToken = adminAuth.data.token;

  // Student cannot list users
  const studentList = await axios.get(`${BASE}/api/users`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (studentList.status !== 403) {
    // eslint-disable-next-line no-console
    console.log("FAIL student GET /api/users expected 403 got", studentList.status);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  student blocked from GET /api/users");
  }

  // Owner list: only student + manager roles
  const ownerList = await axios.get(`${BASE}/api/users?pageSize=50`, {
    headers: authHeaders(ownerToken),
    validateStatus: () => true,
  });
  if (ownerList.status !== 200 || !ownerList.data?.users) {
    // eslint-disable-next-line no-console
    console.log("FAIL owner GET /api/users", ownerList.status, ownerList.data);
    failed += 1;
  } else {
    const bad = ownerList.data.users.filter(
      (u) => u.role !== "student" && u.role !== "manager"
    );
    if (bad.length) {
      // eslint-disable-next-line no-console
      console.log("FAIL owner list contained non-assignable roles", bad);
      failed += 1;
    } else {
      // eslint-disable-next-line no-console
      console.log("OK  owner GET /api/users (student/manager only)");
    }
  }

  const studentId = studentAuth.data.user?.id;
  if (!studentId) {
    // eslint-disable-next-line no-console
    console.log("FAIL missing student id from login");
    failed += 1;
  } else {
    const ownerPromote = await axios.put(
      `${BASE}/api/users/${studentId}/role`,
      { role: "manager" },
      { headers: authHeaders(ownerToken), validateStatus: () => true }
    );
    const ownerDemote = await axios.put(
      `${BASE}/api/users/${studentId}/role`,
      { role: "student" },
      { headers: authHeaders(ownerToken), validateStatus: () => true }
    );
    if (ownerPromote.status !== 200 || ownerDemote.status !== 200) {
      // eslint-disable-next-line no-console
      console.log(
        "FAIL owner role student<->manager",
        ownerPromote.status,
        ownerDemote.status
      );
      failed += 1;
    } else {
      // eslint-disable-next-line no-console
      console.log("OK  owner PUT role student ↔ manager");
    }

    const ownerBadRole = await axios.put(
      `${BASE}/api/users/${studentId}/role`,
      { role: "admin" },
      { headers: authHeaders(ownerToken), validateStatus: () => true }
    );
    if (ownerBadRole.status !== 403) {
      // eslint-disable-next-line no-console
      console.log(
        "FAIL owner assign admin expected 403 got",
        ownerBadRole.status
      );
      failed += 1;
    } else {
      // eslint-disable-next-line no-console
      console.log("OK  owner blocked from assigning admin");
    }
  }

  const adminList = await axios.get(
    `${BASE}/api/users?search=admin.role.test&pageSize=20`,
    {
      headers: authHeaders(adminToken),
      validateStatus: () => true,
    }
  );
  const adminRow = adminList.data?.users?.find((u) => u.role === "admin");
  if (adminList.status === 200 && adminRow?.id) {
    const ownerTouchAdmin = await axios.put(
      `${BASE}/api/users/${adminRow.id}/role`,
      { role: "student" },
      { headers: authHeaders(ownerToken), validateStatus: () => true }
    );
    if (ownerTouchAdmin.status !== 403) {
      // eslint-disable-next-line no-console
      console.log(
        "FAIL owner change admin user expected 403 got",
        ownerTouchAdmin.status
      );
      failed += 1;
    } else {
      // eslint-disable-next-line no-console
      console.log("OK  owner cannot change admin account role");
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("SKIP admin row not found for owner-vs-admin check");
  }

  const selfGet = await axios.get(`${BASE}/api/users/${studentAuth.data.user.id}`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (selfGet.status !== 200) {
    // eslint-disable-next-line no-console
    console.log("FAIL student GET self /api/users/:id", selfGet.status);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  student GET own /api/users/:id");
  }

  if (failed) {
    // eslint-disable-next-line no-console
    console.log("\nSome checks failed.");
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("\nAll milestone 2 API checks passed.");
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
