/**
 * Milestone 6 integration checks (search & filtering).
 */
const axios = require("axios");
require("dotenv").config();

const BASE = process.env.VERIFY_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = "ScholarTest1!";
const OWNER_EMAIL = "owner.role.test@scholar.local";

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

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log("Milestone 6 API checks —", BASE, "\n");
  let failed = 0;

  const owner = await login(OWNER_EMAIL);
  if (owner.status !== 200 || !owner.data?.token) {
    console.log("FAIL owner login", owner.status, owner.data);
    process.exitCode = 1;
    return;
  }
  const ownerToken = owner.data.token;

  // Create a verified scholarship with unique keyword.
  const keyword = `m6-keyword-${Date.now()}`;
  const created = await axios.post(
    `${BASE}/api/scholarships`,
    {
      title: `Advanced ${keyword}`,
      organizationName: "EthioScholar M6 Org",
      country: "Ethiopia",
      degreeLevel: "master",
      fieldOfStudy: "Data Science",
      fundingType: "fully_funded",
      deadline: tomorrow(),
      description: `Description with ${keyword}`,
      applicationUrl: "https://example.org/m6",
    },
    { headers: authHeaders(ownerToken), validateStatus: () => true },
  );
  if (created.status !== 201) {
    console.log("FAIL create seed scholarship", created.status, created.data);
    process.exitCode = 1;
    return;
  }

  // keyword search
  const byKeyword = await axios.get(`${BASE}/api/scholarships/search?q=${encodeURIComponent(keyword)}&limit=20`, {
    validateStatus: () => true,
  });
  if (byKeyword.status !== 200 || !Array.isArray(byKeyword.data?.results) || byKeyword.data.results.length < 1) {
    console.log("FAIL keyword search", byKeyword.status, byKeyword.data);
    failed += 1;
  } else {
    console.log("OK  keyword search returns matches");
  }

  // country filter
  const byCountry = await axios.get(`${BASE}/api/scholarships/search?country=Ethiopia&limit=20`, {
    validateStatus: () => true,
  });
  if (byCountry.status !== 200 || !Array.isArray(byCountry.data?.results)) {
    console.log("FAIL country filter request", byCountry.status, byCountry.data);
    failed += 1;
  } else {
    const hasNonCountry = byCountry.data.results.some((s) => s.country !== "Ethiopia");
    if (hasNonCountry) {
      console.log("FAIL country filter contains non-Ethiopia result");
      failed += 1;
    } else {
      console.log("OK  country filter works");
    }
  }

  // combined filters
  const combined = await axios.get(
    `${BASE}/api/scholarships/search?country=Ethiopia&degree_level=master&funding_type=fully_funded&limit=20`,
    { validateStatus: () => true },
  );
  if (combined.status !== 200 || !Array.isArray(combined.data?.results)) {
    console.log("FAIL combined filters request", combined.status, combined.data);
    failed += 1;
  } else {
    console.log("OK  combined filters request works");
  }

  // sorting + pagination
  const sorted = await axios.get(`${BASE}/api/scholarships/search?sort=deadline_asc&page=1&limit=5`, {
    validateStatus: () => true,
  });
  if (
    sorted.status !== 200 ||
    !Array.isArray(sorted.data?.results) ||
    sorted.data.limit !== 5 ||
    sorted.data.page !== 1
  ) {
    console.log("FAIL pagination/sort", sorted.status, sorted.data);
    failed += 1;
  } else {
    console.log("OK  sort + pagination response shape valid");
  }

  // no results
  const none = await axios.get(`${BASE}/api/scholarships/search?q=${encodeURIComponent("nohit-zzzz-123")}`, {
    validateStatus: () => true,
  });
  if (none.status !== 200 || !Array.isArray(none.data?.results) || none.data.results.length !== 0) {
    console.log("FAIL no results case", none.status, none.data);
    failed += 1;
  } else {
    console.log("OK  no results handled");
  }

  // invalid filters => 400
  const invalidSort = await axios.get(`${BASE}/api/scholarships/search?sort=oldest`, {
    validateStatus: () => true,
  });
  if (invalidSort.status !== 400) {
    console.log("FAIL invalid sort should be 400 got", invalidSort.status);
    failed += 1;
  } else {
    console.log("OK  invalid sort rejected");
  }

  const invalidRange = await axios.get(
    `${BASE}/api/scholarships/search?deadline_from=2026-12-31&deadline_to=2026-01-01`,
    { validateStatus: () => true },
  );
  if (invalidRange.status !== 400) {
    console.log("FAIL invalid date range should be 400 got", invalidRange.status);
    failed += 1;
  } else {
    console.log("OK  invalid date range rejected");
  }

  if (failed) {
    console.log("\nSome milestone 6 checks failed.");
    process.exitCode = 1;
  } else {
    console.log("\nAll milestone 6 API checks passed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
