/**
 * Delete ALL scholarships and insert rows from data/scholarships.seed.json
 *
 * Usage (from scholar-backend):
 *   set CONFIRM_SCHOLARSHIP_RESEED=yes
 *   node scripts/reseed-scholarships.js
 *
 * Optional:
 *   node scripts/reseed-scholarships.js --file=data/scholarships.seed.json
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");

const ALLOWED_STATUS = new Set(["draft", "pending", "verified", "rejected", "expired"]);
const ALLOWED_DEGREE = new Set(["high_school", "bachelor", "master", "phd"]);
const ALLOWED_FUNDING = new Set(["fully_funded", "partially_funded", "self_funded"]);

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function normalizeDegree(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === "masters") return "master";
  if (v === "phd" || v === "doctorate") return "phd";
  if (ALLOWED_DEGREE.has(v)) return v;
  return v;
}

function normalizeFunding(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (ALLOWED_FUNDING.has(v)) return v;
  return v;
}

function normalizeRecord(raw, index) {
  const title = String(raw.title || "").trim();
  const country = String(raw.country || "").trim();
  const applicationUrl = String(raw.application_url || raw.applicationUrl || "").trim();
  const status = String(raw.status || "verified").trim().toLowerCase();

  const errors = [];
  if (!title) errors.push("title is required");
  if (!country) errors.push("country is required");
  if (!applicationUrl) errors.push("application_url is required");
  if (!ALLOWED_STATUS.has(status)) errors.push(`invalid status: ${status}`);

  const degreeLevel = normalizeDegree(raw.degree_level || raw.degreeLevel);
  if (degreeLevel && !ALLOWED_DEGREE.has(degreeLevel)) {
    errors.push(`invalid degree_level: ${degreeLevel}`);
  }

  const fundingType = normalizeFunding(raw.funding_type || raw.fundingType);
  if (fundingType && !ALLOWED_FUNDING.has(fundingType)) {
    errors.push(`invalid funding_type: ${fundingType}`);
  }

  if (errors.length) {
    throw new Error(`Record #${index + 1} (${title || "untitled"}): ${errors.join("; ")}`);
  }

  return {
    title,
    organization_name: raw.organization_name || raw.organizationName || null,
    country,
    degree_level: degreeLevel,
    field_of_study: raw.field_of_study || raw.fieldOfStudy || null,
    funding_type: fundingType,
    deadline: raw.deadline || null,
    application_start_date: raw.application_start_date || raw.applicationStartDate || null,
    application_end_date: raw.application_end_date || raw.applicationEndDate || null,
    amount: raw.amount || null,
    description: raw.description || null,
    application_url: applicationUrl,
    source_name: raw.source_name || raw.sourceName || null,
    source_url: raw.source_url || raw.sourceUrl || null,
    external_id: raw.external_id || raw.externalId || null,
    status,
    is_recommended_default: Boolean(raw.is_recommended_default ?? raw.isRecommendedDefault ?? false),
  };
}

function loadSeedFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.scholarships;
  if (!Array.isArray(rows)) {
    throw new Error("Seed file must be a JSON array or { scholarships: [...] }");
  }
  return rows.map((row, i) => normalizeRecord(row, i));
}

async function main() {
  if (process.env.CONFIRM_SCHOLARSHIP_RESEED !== "yes") {
    // eslint-disable-next-line no-console
    console.error(
      "Refusing to reseed. Set CONFIRM_SCHOLARSHIP_RESEED=yes to delete all scholarships and insert seed data.",
    );
    process.exit(1);
  }

  const file = parseArg("file", path.join(__dirname, "../data/scholarships.seed.json"));
  const rows = loadSeedFile(file);

  const before = await query(`SELECT COUNT(*)::int AS n FROM scholarships`);
  const bookmarksBefore = await query(`SELECT COUNT(*)::int AS n FROM bookmarks`);
  const appsBefore = await query(`SELECT COUNT(*)::int AS n FROM applications`);

  const deleted = await query(`DELETE FROM scholarships RETURNING id`);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        deleted_scholarships: deleted.rowCount,
        previous_total: before.rows[0]?.n ?? 0,
        note: "Related bookmarks/applications were cascade-deleted by FK rules.",
        bookmarks_before: bookmarksBefore.rows[0]?.n ?? 0,
        applications_before: appsBefore.rows[0]?.n ?? 0,
      },
      null,
      2,
    ),
  );

  let inserted = 0;
  for (const item of rows) {
    await query(
      `INSERT INTO scholarships (
         title,
         organization_name,
         country,
         degree_level,
         field_of_study,
         funding_type,
         deadline,
         application_start_date,
         application_end_date,
         amount,
         description,
         application_url,
         source_name,
         source_url,
         external_id,
         status,
         is_recommended_default,
         posted_by_user_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NULL)`,
      [
        item.title,
        item.organization_name,
        item.country,
        item.degree_level,
        item.field_of_study,
        item.funding_type,
        item.deadline,
        item.application_start_date,
        item.application_end_date,
        item.amount,
        item.description,
        item.application_url,
        item.source_name,
        item.source_url,
        item.external_id,
        item.status,
        item.is_recommended_default,
      ],
    );
    inserted += 1;
  }

  const after = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
            COUNT(*) FILTER (WHERE deadline IS NULL OR deadline >= CURRENT_DATE)::int AS active_deadline
     FROM scholarships`,
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        inserted,
        totals: after.rows[0] || null,
        seed_file: path.resolve(file),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Reseed failed:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
