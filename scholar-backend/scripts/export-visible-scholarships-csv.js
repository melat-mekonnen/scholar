/**
 * Export open verified scholarships to repo-root visible-scholarships-urls.csv
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool, query } = require("../src/infra/db/neonClient");
const { publicOpenScholarshipSql } = require("../src/utils/publicScholarshipVisibility");
const { studyProgrammeNotHubSql } = require("../src/utils/studyProgrammeHubGuard");

function resolveVisibleCsvOutPath() {
  if (process.env.VISIBLE_CSV_OUT) return process.env.VISIBLE_CSV_OUT;
  const repoCandidate = path.join(__dirname, "..", "..", "visible-scholarships-urls.csv");
  try {
    fs.accessSync(path.dirname(repoCandidate), fs.constants.W_OK);
    return repoCandidate;
  } catch {
    return path.join(__dirname, "..", "data", "visible-scholarships-urls.csv");
  }
}

async function exportVisibleCsv() {
  const open = publicOpenScholarshipSql("s");
  const programmeHub = studyProgrammeNotHubSql("p");
  const { rows } = await query(
    `SELECT title, application_url, source_url, organization_name, country, source_name, application_status, record_type
     FROM (
       SELECT s.title,
              s.application_url,
              s.source_url,
              s.organization_name,
              s.country,
              s.source_name,
              s.application_status,
              COALESCE(s.record_type, 'scholarship') AS record_type
       FROM scholarships s
       WHERE s.status = 'verified'
         AND COALESCE(s.record_type, 'scholarship') = 'scholarship'
         AND ${open}
       UNION ALL
       SELECT p.title,
              p.application_url,
              p.source_url,
              p.organization_name,
              p.country,
              'STUDY_PROGRAMME' AS source_name,
              NULL AS application_status,
              'study_programme' AS record_type
       FROM study_programmes p
       WHERE p.status = 'verified'
         AND ${programmeHub}
     ) visible
     ORDER BY title ASC, application_url ASC`,
  );

  function csvEscape(value) {
    const v = String(value ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }

  const lines = [
    "n,title,application_url,source_url,organization,country,source_name,application_status,record_type",
  ];
  rows.forEach((row, index) => {
    lines.push(
      [
        index + 1,
        csvEscape(row.title),
        csvEscape(row.application_url),
        csvEscape(row.source_url),
        csvEscape(row.organization_name),
        csvEscape(row.country),
        csvEscape(row.source_name),
        csvEscape(row.application_status || "open"),
        csvEscape(row.record_type || "scholarship"),
      ].join(","),
    );
  });

  const outPath = resolveVisibleCsvOutPath();
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  return { outPath, rows: rows.length };
}

async function main() {
  const result = await exportVisibleCsv();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}

module.exports = { exportVisibleCsv };

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
