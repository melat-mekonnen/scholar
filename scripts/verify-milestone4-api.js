/**
 * Milestone 4 integration checks (scholarship CRUD).
 *
 * Usage: npm run verify:milestone4
 * Prereq: API running + seeded role users (npm run seed:test-roles)
 */
const axios = require("axios");
require("dotenv").config();

const BASE =
  process.env.VERIFY_API_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";

const STUDENT_EMAIL = "student.role.test@scholar.local";
const MANAGER_EMAIL = "manager.role.test@scholar.local";
const OWNER_EMAIL = "owner.role.test@scholar.local";
const ADMIN_EMAIL = "admin.role.test@scholar.local";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email) {
  const { data, status } = await axios.post(
    `${BASE}/api/auth/login`,
    { email, password: PASSWORD },
    { validateStatus: () => true },
  );
  return { data, status };
}

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Milestone 4 API checks —", BASE, "\n");
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
      // eslint-disable-next-line no-console
      console.log(`FAIL login ${label}`, auth.status, auth.data);
      process.exitCode = 1;
      return;
    }
  }

  const studentToken = studentAuth.data.token;
  const managerToken = managerAuth.data.token;
  const ownerToken = ownerAuth.data.token;
  const adminToken = adminAuth.data.token;

  const createBody = {
    title: `M4 manager post ${Date.now()}`,
    organizationName: "EthioScholar Org",
    country: "Ethiopia",
    degreeLevel: "bachelor",
    fieldOfStudy: "Computer Science",
    fundingType: "fully_funded",
    deadline: tomorrow(),
    amount: "Full",
    description: "Milestone 4 manager-created scholarship",
    applicationUrl: "https://example.org/apply",
  };

  // manager create => pending
  const managerCreate = await axios.post(`${BASE}/api/scholarships`, createBody, {
    headers: authHeaders(managerToken),
    validateStatus: () => true,
  });
  if (managerCreate.status !== 201 || managerCreate.data?.status !== "pending") {
    // eslint-disable-next-line no-console
    console.log("FAIL manager create should be pending", managerCreate.status, managerCreate.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  manager create => pending");
  }
  const managerScholarshipId = managerCreate.data?.id;

  // manager create past deadline => 400
  const managerPast = await axios.post(
    `${BASE}/api/scholarships`,
    { ...createBody, title: "past deadline", deadline: "2001-01-01" },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  if (managerPast.status !== 400) {
    // eslint-disable-next-line no-console
    console.log("FAIL manager create past deadline expected 400 got", managerPast.status);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  manager create past deadline blocked");
  }

  // owner create => verified
  const ownerCreate = await axios.post(
    `${BASE}/api/scholarships`,
    { ...createBody, title: `M4 owner post ${Date.now()}` },
    { headers: authHeaders(ownerToken), validateStatus: () => true },
  );
  if (ownerCreate.status !== 201 || ownerCreate.data?.status !== "verified") {
    // eslint-disable-next-line no-console
    console.log("FAIL owner create should be verified", ownerCreate.status, ownerCreate.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  owner create => verified");
  }
  const ownerScholarshipId = ownerCreate.data?.id;

  // manager updates own => pending
  const managerUpdateOwn = await axios.put(
    `${BASE}/api/scholarships/${managerScholarshipId}`,
    { description: "manager updated" },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  if (managerUpdateOwn.status !== 200 || managerUpdateOwn.data?.status !== "pending") {
    // eslint-disable-next-line no-console
    console.log("FAIL manager update own", managerUpdateOwn.status, managerUpdateOwn.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  manager update own => pending");
  }

  // manager updates another user's scholarship => 403
  const managerUpdateOthers = await axios.put(
    `${BASE}/api/scholarships/${ownerScholarshipId}`,
    { description: "hijack" },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  if (managerUpdateOthers.status !== 403) {
    // eslint-disable-next-line no-console
    console.log("FAIL manager update other expected 403 got", managerUpdateOthers.status);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  manager blocked from updating another scholarship");
  }

  // admin updates any => verified
  const adminUpdate = await axios.put(
    `${BASE}/api/scholarships/${managerScholarshipId}`,
    { description: "admin updated" },
    { headers: authHeaders(adminToken), validateStatus: () => true },
  );
  if (adminUpdate.status !== 200 || adminUpdate.data?.status !== "verified") {
    // eslint-disable-next-line no-console
    console.log("FAIL admin update any", adminUpdate.status, adminUpdate.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  admin update any => verified");
  }

  // student create => 403
  const studentCreate = await axios.post(
    `${BASE}/api/scholarships`,
    { ...createBody, title: "student create should fail" },
    { headers: authHeaders(studentToken), validateStatus: () => true },
  );
  if (studentCreate.status !== 403) {
    // eslint-disable-next-line no-console
    console.log("FAIL student create expected 403 got", studentCreate.status);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  student blocked from create");
  }

  // get by id full details
  const getById = await axios.get(`${BASE}/api/scholarships/${ownerScholarshipId}`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (getById.status !== 200 || !getById.data?.description || !getById.data?.applicationUrl) {
    // eslint-disable-next-line no-console
    console.log("FAIL get scholarship by id full details", getById.status, getById.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  get scholarship by id returns full details");
  }

  // pagination + list
  const list = await axios.get(`${BASE}/api/scholarships?page=1&limit=5`, {
    validateStatus: () => true,
  });
  if (list.status !== 200 || !Array.isArray(list.data?.results) || typeof list.data?.total !== "number") {
    // eslint-disable-next-line no-console
    console.log("FAIL scholarship listing pagination", list.status, list.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  scholarship listing with pagination works");
  }

  // manager my-scholarships endpoint
  const my = await axios.get(`${BASE}/api/scholarships/my-scholarships?page=1&pageSize=10`, {
    headers: authHeaders(managerToken),
    validateStatus: () => true,
  });
  if (my.status !== 200 || !Array.isArray(my.data?.scholarships)) {
    // eslint-disable-next-line no-console
    console.log("FAIL manager my-scholarships", my.status, my.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  manager my-scholarships endpoint works");
  }

  // upload document via /api/scholarships/:id/documents
  const form = new FormData();
  form.append("title", "M4 Doc");
  form.append("type", "guide");
  form.append("file", new Blob(["milestone4 document"], { type: "text/plain" }), "m4-doc.txt");
  const upload = await axios.post(`${BASE}/api/scholarships/${managerScholarshipId}/documents`, form, {
    headers: { ...authHeaders(managerToken) },
    maxBodyLength: Infinity,
    validateStatus: () => true,
  });
  if (upload.status !== 201) {
    // eslint-disable-next-line no-console
    console.log("FAIL scholarship document upload endpoint", upload.status, upload.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  scholarship document upload endpoint works");
  }

  // delete scholarship with application should succeed gracefully
  const apply = await axios.post(
    `${BASE}/api/applications`,
    { scholarshipId: ownerScholarshipId, status: "submitted" },
    { headers: authHeaders(studentToken), validateStatus: () => true },
  );
  if (apply.status !== 201) {
    // eslint-disable-next-line no-console
    console.log("WARN application creation for delete test", apply.status, apply.data);
  }
  const ownerDelete = await axios.delete(`${BASE}/api/scholarships/${ownerScholarshipId}`, {
    headers: authHeaders(ownerToken),
    validateStatus: () => true,
  });
  if (ownerDelete.status !== 204) {
    // eslint-disable-next-line no-console
    console.log("FAIL delete scholarship with relations", ownerDelete.status, ownerDelete.data);
    failed += 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("OK  delete scholarship with applications handled gracefully");
  }

  if (failed) {
    // eslint-disable-next-line no-console
    console.log("\nSome milestone 4 checks failed.");
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("\nAll milestone 4 API checks passed.");
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
