/**
 * Milestone 5 integration checks (verification & moderation).
 *
 * Usage: npm run verify:milestone5
 * Prereq: API running + seeded role users
 */
const axios = require("axios");
require("dotenv").config();

const BASE = process.env.VERIFY_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";

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
  console.log("Milestone 5 API checks —", BASE, "\n");
  let failed = 0;

  const [managerAuth, ownerAuth, adminAuth] = await Promise.all([
    login(MANAGER_EMAIL),
    login(OWNER_EMAIL),
    login(ADMIN_EMAIL),
  ]);
  for (const [label, auth] of [
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
  const managerToken = managerAuth.data.token;
  const ownerToken = ownerAuth.data.token;
  const adminToken = adminAuth.data.token;

  // Manager creates => pending.
  const create = await axios.post(
    `${BASE}/api/scholarships`,
    {
      title: `M5 pending ${Date.now()}`,
      organizationName: "EthioScholar Org",
      country: "Ethiopia",
      degreeLevel: "bachelor",
      fieldOfStudy: "Computer Science",
      fundingType: "fully_funded",
      deadline: tomorrow(),
      description: "Milestone 5 pending post",
      applicationUrl: "https://example.org/apply",
    },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  if (create.status !== 201 || create.data?.status !== "pending") {
    console.log("FAIL manager create not pending", create.status, create.data);
    failed += 1;
  } else {
    console.log("OK  manager creates pending");
  }
  const scholarshipId = create.data?.id;

  // Pending queue should include created one.
  const queue = await axios.get(`${BASE}/api/admin/scholarships/pending`, {
    headers: authHeaders(ownerToken),
    validateStatus: () => true,
  });
  if (queue.status !== 200 || !Array.isArray(queue.data?.scholarships)) {
    console.log("FAIL pending queue unavailable", queue.status, queue.data);
    failed += 1;
  } else if (!queue.data.scholarships.some((s) => s.id === scholarshipId)) {
    console.log("FAIL pending queue does not include new scholarship");
    failed += 1;
  } else {
    console.log("OK  pending queue includes manager post");
  }

  // Verify path.
  const verify = await axios.put(
    `${BASE}/api/admin/scholarships/${scholarshipId}/verify`,
    {},
    { headers: authHeaders(adminToken), validateStatus: () => true },
  );
  if (verify.status !== 200 || verify.data?.status !== "verified") {
    console.log("FAIL verify endpoint", verify.status, verify.data);
    failed += 1;
  } else {
    console.log("OK  approve endpoint works");
  }

  // Public search defaults to verified only.
  const publicList = await axios.get(`${BASE}/api/scholarships?limit=5`, {
    validateStatus: () => true,
  });
  if (publicList.status !== 200 || !Array.isArray(publicList.data?.results)) {
    console.log("FAIL public list unavailable", publicList.status, publicList.data);
    failed += 1;
  } else if (!publicList.data.results.some((s) => s.id === scholarshipId)) {
    console.log("FAIL verified scholarship not visible publicly");
    failed += 1;
  } else {
    console.log("OK  public list defaults to verified");
  }

  // Rejection path with reason should produce notification.
  const create2 = await axios.post(
    `${BASE}/api/scholarships`,
    {
      title: `M5 reject ${Date.now()}`,
      organizationName: "EthioScholar Org",
      country: "Ethiopia",
      degreeLevel: "master",
      fieldOfStudy: "Data Science",
      fundingType: "partially_funded",
      deadline: tomorrow(),
      description: "Milestone 5 rejection flow",
      applicationUrl: "https://example.org/reject-me",
    },
    { headers: authHeaders(managerToken), validateStatus: () => true },
  );
  const rejectedId = create2.data?.id;
  const reject = await axios.put(
    `${BASE}/api/admin/scholarships/${rejectedId}/reject`,
    { reason: "Needs better eligibility details" },
    { headers: authHeaders(ownerToken), validateStatus: () => true },
  );
  if (reject.status !== 200 || reject.data?.status !== "rejected" || !reject.data?.rejectionReason) {
    console.log("FAIL reject endpoint", reject.status, reject.data);
    failed += 1;
  } else {
    console.log("OK  reject endpoint stores reason");
  }

  const notifications = await axios.get(`${BASE}/api/notifications/mine?limit=20`, {
    headers: authHeaders(managerToken),
    validateStatus: () => true,
  });
  if (notifications.status !== 200 || !Array.isArray(notifications.data?.notifications)) {
    console.log("FAIL notifications endpoint", notifications.status, notifications.data);
    failed += 1;
  } else if (!notifications.data.notifications.some((n) => n.scholarshipId === rejectedId)) {
    console.log("FAIL rejection notification not found for manager");
    failed += 1;
  } else {
    console.log("OK  moderation notification created");
  }

  // Flag endpoint.
  const flag = await axios.post(
    `${BASE}/api/admin/scholarships/${scholarshipId}/flag`,
    { reason: "Potential duplicate listing" },
    { headers: authHeaders(adminToken), validateStatus: () => true },
  );
  if (flag.status !== 201) {
    console.log("FAIL flag endpoint", flag.status, flag.data);
    failed += 1;
  } else {
    console.log("OK  flag endpoint works");
  }

  // Admin can view all statuses.
  const allStatuses = await axios.get(`${BASE}/api/admin/scholarships?status=pending,verified,rejected,expired`, {
    headers: authHeaders(adminToken),
    validateStatus: () => true,
  });
  if (allStatuses.status !== 200 || !Array.isArray(allStatuses.data?.scholarships)) {
    console.log("FAIL admin all-status list", allStatuses.status, allStatuses.data);
    failed += 1;
  } else {
    console.log("OK  admin can view all statuses");
  }

  if (failed) {
    console.log("\nSome milestone 5 checks failed.");
    process.exitCode = 1;
  } else {
    console.log("\nAll milestone 5 API checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
