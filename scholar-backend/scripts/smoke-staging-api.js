/**
 * Milestone 3: HTTP smoke test against a running API (local or staging).
 *
 * Usage:
 *   npm run smoke:api
 *   STAGING_API_URL=https://api.example.com npm run smoke:api
 */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const base =
  (process.env.STAGING_API_URL || process.env.VERIFY_API_BASE_URL || "").replace(/\/$/, "") ||
  `http://127.0.0.1:${process.env.PORT || "4000"}`;

async function getJson(pathname) {
  const url = `${base}${pathname}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { url, status: res.status, body };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`API smoke test → ${base}\n`);

  const checks = [
    { name: "health", path: "/health?deep=1", expect: (r) => r.status === 200 && r.body?.status === "ok" },
    {
      name: "scholarship filters",
      path: "/api/scholarships/filters",
      expect: (r) => r.status === 200 && Array.isArray(r.body?.countries),
    },
    {
      name: "scholarship search",
      path: "/api/scholarships?limit=1",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.body?.results ?? r.body?.scholarships ?? r.body?.items),
    },
  ];

  let failed = 0;
  for (const check of checks) {
    try {
      const result = await getJson(check.path);
      const ok = check.expect(result);
      // eslint-disable-next-line no-console
      console.log(`${ok ? "✓" : "✗"} ${check.name} (${result.status}) ${result.url}`);
      if (!ok) {
        failed += 1;
        // eslint-disable-next-line no-console
        console.log("  ", JSON.stringify(result.body).slice(0, 200));
      }
    } catch (err) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.log(`✗ ${check.name} — ${err.message}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log("\n✓ Smoke checks passed.");
}

main();
