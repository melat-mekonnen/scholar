/**
 * Milestone 8 integration checks (application tracking).
 *
 * Prereq: API running + seeded role users (npm run seed:test-roles)
 */
const axios = require("axios");
require("dotenv").config();

const BASE = process.env.VERIFY_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";
const STUDENT_EMAIL = "student.role.test@scholar.local";
const MANAGER_EMAIL = "manager.role.test@scholar.local";
const OWNER_EMAIL = "owner.role.test@scholar.local";
const ADMIN_EMAIL = "admin.role.test@scholar.local";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email) {
  const { status, data } = await axios.post(
    `${BASE}/api/auth/login`,
    { email, password: PASSWORD },
    { validateStatus: () => true },
  );
  return { status, data };
}

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function main() {
  console.log("Milestone 8 API checks —", BASE, "\n");
  let failed = 0;

  const [studentAuth, managerAuth, ownerAuth, adminAuth] = await Promise.all([
    login(STUDENT_EMAIL),
    login(MANAGER_EMAIL),
    login(OWNER_EMAIL),
    login(ADMIN_EMAIL),
  ]);
  for (const [label, auth] of [
    ["student", studentAuth],
    ["manager", managerAuth],
    ["owner", ownerAuth],
    ["admin", adminAuth],
  ]) {
    if (auth.status !== 200 || !auth.data?.token) {
      console.log(`FAIL login ${label}`, auth.status, auth.data);
      process.exitCode = 1;
      return;
    }
  }
  const studentToken = studentAuth.data.token;
  const managerToken = managerAuth.data.token;
  const ownerToken = ownerAuth.data.token;
  const adminToken = adminAuth.data.token;

  // Create scholarship owned by manager (pending), then admin verifies so student can apply.
  const created = await axios.post(
    `${BASE}/api/scholarships`,
    {
      title: `M8 application target ${Date.now()}`,
      organizationName: "EthioScholar M8 Org",
      country: "Ethiopia",
      degreeLevel: "bachelor",
      fieldOfStudy: "Computer Science",
      fundingType: "fully_funded",
      deadline: tomorrow(),
      description: "Milestone 8 application target",
      applicationUrl: "https://example.org/m8",
    },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  if (created.status !== 201) {
    console.log("FAIL seed scholarship create", created.status, created.data);
    process.exitCode = 1;
    return;
  }
  const scholarshipId = created.data.id;

  const verified = await axios.put(
    `${BASE}/api/admin/scholarships/${scholarshipId}/verify`,
    {},
    { headers: authHeaders(adminToken), validateStatus: () => true },
  );
  if (verified.status !== 200) {
    console.log("FAIL verify scholarship", verified.status, verified.data);
    process.exitCode = 1;
    return;
  }

  // Student creates application => saved
  const appCreate = await axios.post(
    `${BASE}/api/applications`,
    { scholarshipId },
    { headers: { ...authHeaders(studentToken), "Content-Type": "application/json" }, validateStatus: () => true },
  );
  if (appCreate.status !== 201 || appCreate.data?.status !== "saved") {
    console.log("FAIL create application", appCreate.status, appCreate.data);
    failed += 1;
  } else {
    console.log("OK  student create application => saved");
  }
  const applicationId = appCreate.data?.id;

  // Duplicate => 409
  const dup = await axios.post(
    `${BASE}/api/applications`,
    { scholarshipId },
    { headers: { ...authHeaders(studentToken), "Content-Type": "application/json" }, validateStatus: () => true },
  );
  if (dup.status !== 409) {
    console.log("FAIL duplicate application should be 409 got", dup.status);
    failed += 1;
  } else {
    console.log("OK  duplicate applications blocked");
  }

  // Student list mine
  const mine = await axios.get(`${BASE}/api/applications`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (mine.status !== 200 || !Array.isArray(mine.data?.applications)) {
    console.log("FAIL list mine", mine.status, mine.data);
    failed += 1;
  } else {
    console.log("OK  list mine works");
  }

  // Student update status
  const st = await axios.put(
    `${BASE}/api/applications/${applicationId}/status`,
    { status: "submitted" },
    { headers: { ...authHeaders(studentToken), "Content-Type": "application/json" }, validateStatus: () => true },
  );
  if (st.status !== 200 || st.data?.status !== "submitted") {
    console.log("FAIL update status", st.status, st.data);
    failed += 1;
  } else {
    console.log("OK  update status works");
  }

  // Student add note
  const note = await axios.post(
    `${BASE}/api/applications/${applicationId}/notes`,
    { note: "Gathered transcript and passport copy" },
    { headers: { ...authHeaders(studentToken), "Content-Type": "application/json" }, validateStatus: () => true },
  );
  if (note.status !== 201) {
    console.log("FAIL add note", note.status, note.data);
    failed += 1;
  } else {
    console.log("OK  add note works");
  }

  // Student get by id includes notes/timeline
  const getMine = await axios.get(`${BASE}/api/applications/${applicationId}`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (getMine.status !== 200 || !Array.isArray(getMine.data?.notes) || !Array.isArray(getMine.data?.timeline)) {
    console.log("FAIL get by id shape", getMine.status, getMine.data);
    failed += 1;
  } else {
    console.log("OK  get by id returns notes + timeline");
  }

  // Owner cannot read application
  const forbidden = await axios.get(`${BASE}/api/applications/${applicationId}`, {
    headers: authHeaders(ownerToken),
    validateStatus: () => true,
  });
  if (forbidden.status !== 404) {
    console.log("FAIL non-permitted user should not access application", forbidden.status);
    failed += 1;
  } else {
    console.log("OK  non-permitted user blocked");
  }

  // Manager who owns scholarship can read
  const mgrRead = await axios.get(`${BASE}/api/applications/${applicationId}`, {
    headers: authHeaders(managerToken),
    validateStatus: () => true,
  });
  if (mgrRead.status !== 200) {
    console.log("FAIL manager read should succeed", mgrRead.status, mgrRead.data);
    failed += 1;
  } else {
    console.log("OK  manager can read application for own scholarship");
  }

  // Admin can read
  const adminRead = await axios.get(`${BASE}/api/applications/${applicationId}`, {
    headers: authHeaders(adminToken),
    validateStatus: () => true,
  });
  if (adminRead.status !== 200) {
    console.log("FAIL admin read should succeed", adminRead.status, adminRead.data);
    failed += 1;
  } else {
    console.log("OK  admin can read application");
  }

  // Count endpoint manager-own
  const count = await axios.get(`${BASE}/api/scholarships/${scholarshipId}/applications/count`, {
    headers: authHeaders(managerToken),
    validateStatus: () => true,
  });
  if (count.status !== 200 || typeof count.data?.totalApplications !== "number") {
    console.log("FAIL manager count", count.status, count.data);
    failed += 1;
  } else {
    console.log("OK  manager application count endpoint works");
  }

  // Delete application
  const del = await axios.delete(`${BASE}/api/applications/${applicationId}`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (del.status !== 204) {
    console.log("FAIL delete application", del.status, del.data);
    failed += 1;
  } else {
    console.log("OK  delete application works");
  }

  if (failed) {
    console.log("\nSome milestone 8 checks failed.");
    process.exitCode = 1;
  } else {
    console.log("\nAll milestone 8 API checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

