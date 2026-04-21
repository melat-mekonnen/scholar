/**
 * Milestone 7 integration checks (bookmark system).
 */
const axios = require("axios");
require("dotenv").config();

const BASE = process.env.VERIFY_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";
const STUDENT_EMAIL = "student.role.test@scholar.local";
const OWNER_EMAIL = "owner.role.test@scholar.local";

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
  console.log("Milestone 7 API checks —", BASE, "\n");
  let failed = 0;

  const [studentAuth, ownerAuth] = await Promise.all([login(STUDENT_EMAIL), login(OWNER_EMAIL)]);
  for (const [label, auth] of [
    ["student", studentAuth],
    ["owner", ownerAuth],
  ]) {
    if (auth.status !== 200 || !auth.data?.token) {
      console.log(`FAIL login ${label}`, auth.status, auth.data);
      process.exitCode = 1;
      return;
    }
  }
  const studentToken = studentAuth.data.token;
  const ownerToken = ownerAuth.data.token;

  // Create verified scholarship to bookmark.
  const created = await axios.post(
    `${BASE}/api/scholarships`,
    {
      title: `M7 bookmark target ${Date.now()}`,
      organizationName: "EthioScholar M7 Org",
      country: "Ethiopia",
      degreeLevel: "bachelor",
      fieldOfStudy: "Computer Science",
      fundingType: "fully_funded",
      deadline: tomorrow(),
      description: "Milestone 7 bookmark target",
      applicationUrl: "https://example.org/m7",
    },
    { headers: authHeaders(ownerToken), validateStatus: () => true },
  );
  if (created.status !== 201) {
    console.log("FAIL seed scholarship create", created.status, created.data);
    process.exitCode = 1;
    return;
  }
  const scholarshipId = created.data.id;

  // bookmark success
  const add1 = await axios.post(
    `${BASE}/api/scholarships/${scholarshipId}/bookmark`,
    {},
    { headers: authHeaders(studentToken), validateStatus: () => true },
  );
  if (add1.status !== 201) {
    console.log("FAIL bookmark should succeed", add1.status, add1.data);
    failed += 1;
  } else {
    console.log("OK  bookmark create succeeds");
  }

  // duplicate bookmark => 409
  const add2 = await axios.post(
    `${BASE}/api/scholarships/${scholarshipId}/bookmark`,
    {},
    { headers: authHeaders(studentToken), validateStatus: () => true },
  );
  if (add2.status !== 409) {
    console.log("FAIL duplicate bookmark should be 409 got", add2.status);
    failed += 1;
  } else {
    console.log("OK  duplicate bookmark blocked");
  }

  // list bookmarks paginated
  const list1 = await axios.get(`${BASE}/api/bookmarks?page=1&limit=10`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (list1.status !== 200 || !Array.isArray(list1.data?.results)) {
    console.log("FAIL list bookmarks", list1.status, list1.data);
    failed += 1;
  } else if (!list1.data.results.some((r) => r.id === scholarshipId)) {
    console.log("FAIL bookmarked scholarship not found in list");
    failed += 1;
  } else {
    console.log("OK  list bookmarks with pagination works");
  }

  // bookmark count + is_bookmarked reflected in scholarship list
  const listScholarships = await axios.get(`${BASE}/api/scholarships?limit=20`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (listScholarships.status !== 200 || !Array.isArray(listScholarships.data?.results)) {
    console.log("FAIL scholarship listing for bookmark fields", listScholarships.status, listScholarships.data);
    failed += 1;
  } else {
    const row = listScholarships.data.results.find((r) => r.id === scholarshipId);
    if (!row || row.isBookmarked !== true || Number(row.bookmarkCount || 0) < 1) {
      console.log("FAIL bookmark fields not reflected", row);
      failed += 1;
    } else {
      console.log("OK  bookmark status/count reflected in scholarship list");
    }
  }

  // remove bookmark success
  const remove1 = await axios.delete(`${BASE}/api/scholarships/${scholarshipId}/bookmark`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (remove1.status !== 204) {
    console.log("FAIL remove bookmark should be 204 got", remove1.status, remove1.data);
    failed += 1;
  } else {
    console.log("OK  remove bookmark succeeds");
  }

  // remove non-existent bookmark => 404
  const remove2 = await axios.delete(`${BASE}/api/scholarships/${scholarshipId}/bookmark`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (remove2.status !== 404) {
    console.log("FAIL removing non-existent bookmark should be 404 got", remove2.status);
    failed += 1;
  } else {
    console.log("OK  removing non-existent bookmark returns 404");
  }

  // deleted scholarship removes bookmarks via cascade
  const add3 = await axios.post(
    `${BASE}/api/scholarships/${scholarshipId}/bookmark`,
    {},
    { headers: authHeaders(studentToken), validateStatus: () => true },
  );
  if (add3.status !== 201) {
    console.log("FAIL re-bookmark before delete", add3.status, add3.data);
    failed += 1;
  }
  const delScholarship = await axios.delete(`${BASE}/api/scholarships/${scholarshipId}`, {
    headers: authHeaders(ownerToken),
    validateStatus: () => true,
  });
  if (delScholarship.status !== 204) {
    console.log("FAIL owner delete scholarship", delScholarship.status, delScholarship.data);
    failed += 1;
  }
  const listAfterDelete = await axios.get(`${BASE}/api/bookmarks?page=1&limit=10`, {
    headers: authHeaders(studentToken),
    validateStatus: () => true,
  });
  if (listAfterDelete.status !== 200 || listAfterDelete.data.results.some((r) => r.id === scholarshipId)) {
    console.log("FAIL deleted scholarship still present in bookmarks", listAfterDelete.status, listAfterDelete.data);
    failed += 1;
  } else {
    console.log("OK  deleted scholarship removed from bookmarks");
  }

  if (failed) {
    console.log("\nSome milestone 7 checks failed.");
    process.exitCode = 1;
  } else {
    console.log("\nAll milestone 7 API checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
