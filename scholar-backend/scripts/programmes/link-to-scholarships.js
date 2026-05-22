/**
 * Link study programmes to related funding scholarships (Phase 4).
 * Matches by organization name and Warwick course slugs in URLs.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { StudyProgrammeRepository } = require("../../src/repositories/StudyProgrammeRepository");

function slugFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

async function main() {
  const repo = new StudyProgrammeRepository();
  const programmes = await pool.query(
    `SELECT id, title, organization_name, application_url, source_url
     FROM study_programmes WHERE status = 'verified'`,
  );
  const scholarships = await pool.query(
    `SELECT id, title, organization_name, application_url, source_url
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'`,
  );

  let linked = 0;

  for (const programme of programmes.rows) {
    const org = String(programme.organization_name || "").toLowerCase();
    const progSlug = slugFromUrl(programme.application_url || programme.source_url);

    for (const scholarship of scholarships.rows) {
      const schOrg = String(scholarship.organization_name || "").toLowerCase();
      const schUrl = String(scholarship.application_url || scholarship.source_url || "").toLowerCase();
      const titleHay = String(scholarship.title || "").toLowerCase();

      const sameOrg =
        (org.includes("warwick") && schOrg.includes("warwick")) ||
        org.split(" ")[0].length > 3 && schOrg.includes(org.split(" ")[0]);

      if (!sameOrg) continue;

      const slugMatch =
        progSlug &&
        (schUrl.includes(progSlug) || titleHay.includes(progSlug.replace(/-/g, " ")));

      const institutionShared =
        titleHay.includes("shared scholarship") && !schUrl.includes("#course-");

      if (slugMatch || (institutionShared && org.includes("warwick"))) {
        // eslint-disable-next-line no-await-in-loop
        await repo.linkToScholarship(programme.id, scholarship.id, slugMatch ? "course" : "institution");
        linked += 1;
      }
    }
  }

  const count = await pool.query(`SELECT COUNT(*)::int AS links FROM programme_scholarships`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ linkedAttempts: linked, totalLinks: count.rows[0].links }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
