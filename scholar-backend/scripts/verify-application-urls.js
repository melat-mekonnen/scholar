/**
 * Application-URL verifier.
 *
 * For every verified scholarship, confirm the APPLY link (application_url, the
 * URL the "Apply" button opens — not the source/site URL) is:
 *   1. live    — host resolves and returns a non-error status
 *   2. open    — the page does not declare the cycle closed/expired, and the
 *                stored deadline (if any) is still in the future or rolling
 *
 * Default run is a DRY RUN (reports only). Pass --apply to mutate the DB:
 *   - dead link (DNS fail / 404 / 410 / 5xx)       -> status = 'rejected'
 *   - page says closed/expired, or deadline passed -> application_status = 'closed'
 *
 * Usage:
 *   node scripts/verify-application-urls.js                 # dry run, all verified
 *   node scripts/verify-application-urls.js --apply         # apply changes
 *   node scripts/verify-application-urls.js --limit=50      # sample
 *   node scripts/verify-application-urls.js --source=PHASE1_CURATED
 *   node scripts/verify-application-urls.js --concurrency=8
 *   node scripts/verify-application-urls.js --visible-only
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const axios = require("axios");
const { pool, query } = require("../src/infra/db/neonClient");
const { publicOpenScholarshipSql } = require("../src/utils/publicScholarshipVisibility");

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

const CLOSED_PATTERNS = [
  /applications?\s+(are\s+)?(now\s+)?closed/i,
  /application\s+(window\s+)?has\s+closed/i,
  /application\s+period\s+(for\s+[^.]{0,120}\s+)?has\s+ended/i,
  /no\s+longer\s+accepting\s+applications/i,
  /deadline\s+has\s+passed/i,
  /this\s+(scholarship|programme|program|call|round)\s+(is|has)\s+(now\s+)?(closed|ended|expired)/i,
  /applications?\s+for\s+\d{4}\s+(are\s+)?closed/i,
  /intake\s+(is\s+)?closed/i,
  /currently\s+closed/i,
  /treated\s+as\s+reference\s+only/i,
  /thank\s+you\s+to\s+all\s+who\s+applied/i,
  /page not found/i,
  /could not be found/i,
  /the page you are looking for could not be found/i,
];

function parseArg(name, fallback) {
  const arg = process.argv.find((p) => p.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeUrl(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/**
 * Probe categories:
 *   ok       — reachable, window appears open
 *   closed   — reachable, page text declares the cycle closed
 *   dead     — hard failure we trust: DNS/connection refused, or confirmed 404/410
 *   suspect  — ambiguous (403/401/429/5xx/timeout) — server likely blocks bots; do NOT reject
 *
 * @returns {{ category: 'ok'|'closed'|'dead'|'suspect', status: number|null, reason: string }}
 */
async function probeUrl(url) {
  const target = normalizeUrl(url);
  if (!target) return { category: "dead", status: null, reason: "missing_url" };

  // Two GET attempts with a browser UA. Many official sites reject HEAD/bots.
  let last = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    last = await getOnce(target);
    if (last.ok) {
      const closedSignal = CLOSED_PATTERNS.some((re) => re.test(last.body));
      return {
        category: closedSignal ? "closed" : "ok",
        status: last.status,
        reason: closedSignal ? "page_declares_closed" : "ok",
      };
    }
    // Hard DNS / refused → dead immediately, no retry value.
    if (last.netCode && ["ENOTFOUND", "ECONNREFUSED", "EHOSTUNREACH"].includes(last.netCode)) {
      return { category: "dead", status: null, reason: `net_${last.netCode.toLowerCase()}` };
    }
    // Confirmed not-found → dead.
    if (last.status === 404 || last.status === 410) {
      return { category: "dead", status: last.status, reason: `http_${last.status}` };
    }
    // Otherwise (403/401/429/5xx/timeout) retry once, then mark suspect.
  }

  return {
    category: "suspect",
    status: last?.status ?? null,
    reason: last?.status ? `http_${last.status}` : last?.netCode ? `net_${String(last.netCode).toLowerCase()}` : "unreachable",
  };
}

async function getOnce(target) {
  try {
    const res = await axios.get(target, {
      headers: REQUEST_HEADERS,
      timeout: 22000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    if (res.status >= 200 && res.status < 400) {
      return { ok: true, status: res.status, body: String(res.data || "").slice(0, 200000) };
    }
    return { ok: false, status: res.status, netCode: null };
  } catch (err) {
    return { ok: false, status: null, netCode: err.code || null, message: err.message };
  }
}

function errReason(err) {
  if (err.code) return `net_${String(err.code).toLowerCase()}`;
  if (err.message) return `net_${String(err.message).slice(0, 40)}`;
  return "net_error";
}

function deadlinePassed(row) {
  if (row.is_rolling) return false;
  if (!row.deadline) return false;
  const d = new Date(row.deadline);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

async function loadRows({ source, limit, visibleOnly }) {
  const params = [];
  let where = `status = 'verified' AND COALESCE(record_type, 'scholarship') = 'scholarship'`;
  if (source) {
    params.push(source);
    where += ` AND source_name = $${params.length}`;
  }
  if (visibleOnly) {
    where += ` AND ${publicOpenScholarshipSql("scholarships")}`;
  }
  let sql = `SELECT id, title, application_url, source_url, deadline, is_rolling, application_status, source_name
             FROM scholarships
             WHERE ${where}
             ORDER BY updated_at DESC`;
  if (limit) {
    params.push(Number(limit));
    sql += ` LIMIT $${params.length}`;
  }
  const { rows } = await query(sql, params);
  return rows;
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    const i = cursor;
    cursor += 1;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    await next();
  }
  const starters = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) {
    starters.push(next());
  }
  await Promise.all(starters);
  return results;
}

async function main() {
  const apply = hasFlag("apply");
  const source = parseArg("source", null);
  const limit = parseArg("limit", null);
  const visibleOnly = hasFlag("visible-only");
  const concurrency = Math.max(1, Number(parseArg("concurrency", "6")) || 6);

  const rows = await loadRows({ source, limit, visibleOnly });
  // eslint-disable-next-line no-console
  console.log(
    `Verifying ${rows.length} verified scholarships (${apply ? "APPLY" : "DRY RUN"}, concurrency=${concurrency})${source ? ` source=${source}` : ""}`,
  );

  const buckets = { ok: [], closed: [], dead: [], suspect: [], deadline: [] };

  await runPool(rows, concurrency, async (row) => {
    const url = row.application_url || row.source_url;
    const probe = await probeUrl(url);

    if (probe.category === "dead") {
      buckets.dead.push({ id: row.id, title: row.title, url, reason: probe.reason, status: probe.status });
      return;
    }
    if (deadlinePassed(row)) {
      buckets.deadline.push({ id: row.id, title: row.title, url, deadline: row.deadline });
      return;
    }
    if (probe.category === "closed") {
      buckets.closed.push({ id: row.id, title: row.title, url });
      return;
    }
    if (probe.category === "suspect") {
      buckets.suspect.push({ id: row.id, title: row.title, url, reason: probe.reason });
      return;
    }
    buckets.ok.push({ id: row.id });
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        ok: buckets.ok.length,
        page_closed: buckets.closed.length,
        deadline_passed: buckets.deadline.length,
        dead_link: buckets.dead.length,
        suspect_bot_blocked: buckets.suspect.length,
      },
      null,
      2,
    ),
  );

  if (buckets.dead.length) {
    // eslint-disable-next-line no-console
    console.log("\nDEAD APPLY LINKS (DNS dead or confirmed 404/410 — will be rejected with --apply):");
    buckets.dead.forEach((d) =>
      // eslint-disable-next-line no-console
      console.log(`  [${d.reason}${d.status ? ` ${d.status}` : ""}] ${d.title} -> ${d.url}`),
    );
  }
  if (buckets.closed.length) {
    // eslint-disable-next-line no-console
    console.log("\nPAGE DECLARES CLOSED (will be marked application_status=closed with --apply):");
    buckets.closed.forEach((d) =>
      // eslint-disable-next-line no-console
      console.log(`  ${d.title} -> ${d.url}`),
    );
  }
  if (buckets.suspect.length) {
    // eslint-disable-next-line no-console
    console.log("\nSUSPECT (bot-blocked 403/429/5xx/timeout — KEPT, review manually):");
    buckets.suspect.forEach((d) =>
      // eslint-disable-next-line no-console
      console.log(`  [${d.reason}] ${d.title} -> ${d.url}`),
    );
  }

  const reportPath = parseArg("report", null);
  if (reportPath) {
    require("fs").writeFileSync(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          summary: {
            total: rows.length,
            ok: buckets.ok.length,
            page_closed: buckets.closed.length,
            deadline_passed: buckets.deadline.length,
            dead_link: buckets.dead.length,
            suspect_bot_blocked: buckets.suspect.length,
          },
          dead: buckets.dead,
          closed: buckets.closed,
          suspect: buckets.suspect,
        },
        null,
        2,
      ),
    );
    // eslint-disable-next-line no-console
    console.log(`\nReport written to ${reportPath}`);
  }

  if (!apply) {
    // eslint-disable-next-line no-console
    console.log("\nDry run only. Re-run with --apply to update the database (suspect rows are never auto-rejected).");
    return;
  }

  let rejected = 0;
  let closed = 0;

  for (const d of buckets.dead) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [d.id, `apply link unreachable (${d.reason})`],
    );
    rejected += 1;
  }

  for (const d of [...buckets.closed, ...buckets.deadline]) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET application_status = 'closed',
           is_rolling = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [d.id],
    );
    closed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { applied: true, rejected_dead: rejected, marked_closed: closed, kept_suspect: buckets.suspect.length },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("verify-application-urls failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
