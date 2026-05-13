/**
 * End-to-end HTTP checks for main API areas. Requires a working `.env` with DB + auth secrets.
 * Seed role users first: `npm run seed:test-roles`
 *
 * Optional env overrides:
 * - TEST_STUDENT_EMAIL, TEST_MANAGER_EMAIL, TEST_OWNER_EMAIL, TEST_ADMIN_EMAIL
 * - TEST_USER_PASSWORD (default: ScholarTest1!)
 */
const { describe, test, before } = require("node:test");
const assert = require("node:assert/strict");

require("../helpers/loadIntegrationEnv");
const { integrationEnvReady } = require("../helpers/loadIntegrationEnv");

const { ok: envOk, missing } = integrationEnvReady();
if (!envOk) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] Skipping live API tests. Set:",
    missing.join(", "),
    "— and run npm run seed:test-roles for login users.",
  );
}

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "ScholarTest1!";
const USERS = {
  student: process.env.TEST_STUDENT_EMAIL || "student.role.test@scholar.local",
  manager: process.env.TEST_MANAGER_EMAIL || "manager.role.test@scholar.local",
  owner: process.env.TEST_OWNER_EMAIL || "owner.role.test@scholar.local",
  admin: process.env.TEST_ADMIN_EMAIL || "admin.role.test@scholar.local",
};

describe("Main API integration (live DB + .env)", { skip: !envOk }, () => {
  let request;
  let app;

  before(() => {
    // eslint-disable-next-line global-require
    ({ app } = require("../../src/app"));
    // eslint-disable-next-line global-require
    request = require("supertest")(app);
  });

  async function login(email, password = TEST_PASSWORD) {
    const res = await request.post("/api/auth/login").send({ email, password });
    assert.equal(
      res.status,
      200,
      `login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`,
    );
    assert.ok(res.body?.token, "login response should include token");
    return res.body.token;
  }

  function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
  }

  test("GET /health", async () => {
    const res = await request.get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body?.status, "ok");
  });

  test("scholarship filters + search (student token — /api user router enforces auth first)", async () => {
    const token = await login(USERS.student);
    const h = authHeader(token);

    const filters = await request.get("/api/scholarships/filters").set(h);
    assert.equal(filters.status, 200);
    assert.ok(typeof filters.body === "object");

    const search = await request
      .get("/api/scholarships/search?sort=relevance&page=1&limit=5&status=verified")
      .set(h);
    assert.ok([200].includes(search.status), `search status ${search.status}`);
    assert.ok(Array.isArray(search.body?.results) || search.body?.results === undefined);
  });

  test("GET /api/auth/me without token → 401", async () => {
    const res = await request.get("/api/auth/me");
    assert.equal(res.status, 401);
  });

  test("student: auth, dashboard, applications, bookmarks, profile, community, recommendations, notifications, discovery", async () => {
    const token = await login(USERS.student);

    const me = await request.get("/api/auth/me").set(authHeader(token));
    assert.equal(me.status, 200);
    assert.equal(me.body?.role, "student");

    const summary = await request.get("/dashboard/summary").set(authHeader(token));
    assert.ok([200, 304].includes(summary.status), `dashboard summary ${summary.status}`);

    const applications = await request.get("/api/applications").set(authHeader(token));
    assert.ok([200].includes(applications.status), `applications ${applications.status}`);

    const bookmarks = await request.get("/api/bookmarks").set(authHeader(token));
    assert.equal(bookmarks.status, 200);

    const profile = await request.get("/api/profile").set(authHeader(token));
    assert.ok([200].includes(profile.status), `profile ${profile.status}`);

    const channels = await request.get("/api/community/channels").set(authHeader(token));
    assert.equal(channels.status, 200);
    assert.ok(Array.isArray(channels.body?.channels));

    const ch0 = channels.body.channels[0];
    if (ch0?.id) {
      const messages = await request
        .get(`/api/community/channels/${ch0.id}/messages?limit=5`)
        .set(authHeader(token));
      assert.ok([200].includes(messages.status), `messages ${messages.status}`);
    }

    const rec = await request.get("/api/recommendations").set(authHeader(token));
    assert.ok(
      [200, 500].includes(rec.status),
      `recommendations ${rec.status} (500 if AI_SERVICE_URL unreachable)`,
    );

    const notif = await request.get("/api/notifications/mine?limit=10").set(authHeader(token));
    assert.ok([200].includes(notif.status), `notifications ${notif.status}`);

    if (process.env.RUN_SLOW_INTEGRATION === "1") {
      const disc = await request
        .post("/api/discovery/refresh")
        .set(authHeader(token))
        .send({ topN: 3 });
      assert.ok([200, 500].includes(disc.status), `discovery refresh ${disc.status}`);
    }
  });

  test("student: scholarship detail by id from search", async () => {
    const token = await login(USERS.student);
    const h = authHeader(token);
    const search = await request.get(
      "/api/scholarships/search?sort=relevance&page=1&limit=1&status=verified",
    ).set(h);
    assert.equal(search.status, 200);
    const id = search.body?.results?.[0]?.id;
    if (!id) return;

    const detail = await request.get(`/api/scholarships/${id}`).set(h);
    assert.ok([200].includes(detail.status), `scholarship detail ${detail.status}`);
  });

  test("GET /api/documents list (authenticated student)", async () => {
    const token = await login(USERS.student);
    const res = await request.get("/api/documents?limit=5").set(authHeader(token));
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body?.documents));
  });

  test("manager: dashboard + profile + scholarships list", async () => {
    const token = await login(USERS.manager);

    const dash = await request.get("/api/manager/dashboard").set(authHeader(token));
    assert.equal(dash.status, 200);

    const prof = await request.get("/api/manager/profile").set(authHeader(token));
    assert.ok([200].includes(prof.status), `manager profile ${prof.status}`);

    const sch = await request.get("/api/manager/scholarships").set(authHeader(token));
    assert.ok([200].includes(sch.status), `manager scholarships ${sch.status}`);

    const stats = await request.get("/api/manager/statistics").set(authHeader(token));
    assert.ok([200].includes(stats.status), `manager statistics ${stats.status}`);
  });

  test("owner: dashboard + community channels", async () => {
    const token = await login(USERS.owner);

    const dash = await request.get("/api/owner/dashboard").set(authHeader(token));
    assert.equal(dash.status, 200);

    const ch = await request.get("/api/owner/community/channels").set(authHeader(token));
    assert.equal(ch.status, 200);
    assert.ok(Array.isArray(ch.body?.channels));
  });

  test("admin: dashboard, statistics, users, audit logs, pending scholarships", async () => {
    const token = await login(USERS.admin);

    const dash = await request.get("/api/admin/dashboard").set(authHeader(token));
    assert.equal(dash.status, 200);

    const stats = await request.get("/api/admin/statistics").set(authHeader(token));
    assert.equal(stats.status, 200);

    const users = await request.get("/api/users").set(authHeader(token));
    assert.ok([200].includes(users.status), `GET /api/users ${users.status}`);

    const audit = await request.get("/api/admin/audit-logs?limit=5").set(authHeader(token));
    assert.ok([200].includes(audit.status), `audit logs ${audit.status}`);

    const pending = await request.get("/api/admin/scholarships/pending").set(authHeader(token));
    assert.ok([200].includes(pending.status), `pending scholarships ${pending.status}`);
  });

  test("admin: list scholarships + import runs (read-only)", async () => {
    const token = await login(USERS.admin);

    const list = await request.get("/api/admin/scholarships?status=all&search=").set(authHeader(token));
    assert.ok([200].includes(list.status), `admin scholarships list ${list.status}`);

    const runs = await request.get("/api/admin/imports/runs").set(authHeader(token));
    assert.ok(
      [200, 500].includes(runs.status),
      `import runs ${runs.status} (500 if ingestion tables not migrated)`,
    );
  });
});
