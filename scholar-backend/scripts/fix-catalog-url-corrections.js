/**
 * One-off and repeatable URL corrections for known bad application_url values.
 *
 * Usage:
 *   node scripts/fix-catalog-url-corrections.js
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool, query } = require("../src/infra/db/neonClient");

const APPLICATION_URL_FIXES = [
  {
    from: "https://application.master-waves.eu/",
    to: "https://master-waves.eu/waves-applications-menu/waves-applications-2",
  },
  {
    from: "https://application.master-waves.eu",
    to: "https://master-waves.eu/waves-applications-menu/waves-applications-2",
  },
  {
    from: "https://we-team.education/apply-now/",
    to: "https://we-team.education/the-procedure-in-5-steps/",
  },
  {
    from: "https://we-team.education/apply-now",
    to: "https://we-team.education/the-procedure-in-5-steps/",
  },
  {
    from: "https://www.emtccm.org",
    to: "https://www.emtccm.org/application/",
  },
  {
    from: "https://www.emtccm.org/",
    to: "https://www.emtccm.org/application/",
  },
  {
    from: "https://www.theatre-spaces.eu/",
    to: "https://www.theatre-spaces.eu/admission",
  },
  {
    from: "https://tfmasa.com/",
    to: "https://tfmasa.tchooz.app/",
  },
  {
    from: "https://www.tise-master.eu/",
    to: "https://mdl.donau-uni.ac.at/tise/",
  },
  {
    from: "https://transnationalgermanstudies.eu/en/programme/",
    to: "https://transnationalgermanstudies.eu/en/application/",
  },
  {
    from: "https://www.turkiyeburslari.gov.tr/",
    to: "https://www.turkiyeburslari.gov.tr/scholarshipsprograms",
  },
  {
    from: "https://www.turkiyeburslari.gov.tr/about",
    to: "https://www.turkiyeburslari.gov.tr/scholarshipsprograms",
  },
  {
    from: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship.html",
    to: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html",
  },
  {
    from: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/scholarship-types/undergraduate-scholarships/entry-level-and-first-year-scholarships.html",
    to: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html",
  },
  {
    from: "https://www.pp.u-tokyo.ac.jp/en/index.htm",
    to: "https://www.pp.u-tokyo.ac.jp/en/mppip/",
  },
  {
    from: "https://www.u-tokyo.ac.jp/404.html",
    to: "https://www.u-tokyo.ac.jp/en/prospective-students/scholarships.html",
  },
  {
    from: "https://www.dfat.gov.au/people-to-people/australia-awards",
    to: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
  },
  {
    from: "https://www.econ.kyoto-u.ac.jp/kueac/",
    to: "https://www.econ.kyoto-u.ac.jp/kueac/application/masters/",
  },
  {
    from: "https://www.econ.kyoto-u.ac.jp/kueac",
    to: "https://www.econ.kyoto-u.ac.jp/kueac/application/masters/",
  },
  {
    from: "https://www.gsm.kyoto-u.ac.jp/en/admissions/infomation/international/",
    to: "https://www.gsm.kyoto-u.ac.jp/en/admissions/guidelines/international/",
  },
  {
    from: "https://www.gsm.kyoto-u.ac.jp/en/admissions/infomation/international",
    to: "https://www.gsm.kyoto-u.ac.jp/en/admissions/guidelines/international/",
  },
  {
    from: "https://www.iuj.ac.jp/gsir/",
    to: "https://www.iuj.ac.jp/admissions/ir_linkage/",
  },
  {
    from: "https://www.iuj.ac.jp/gsir",
    to: "https://www.iuj.ac.jp/admissions/ir_linkage/",
  },
  {
    from: "https://www.iuj.ac.jp/gsim/",
    to: "https://www.iuj.ac.jp/admissions/im_linkage/",
  },
  {
    from: "https://www.iuj.ac.jp/gsim",
    to: "https://www.iuj.ac.jp/admissions/im_linkage/",
  },
  {
    from: "https://www.iuj.ac.jp/",
    to: "https://www.iuj.ac.jp/admissions/",
  },
  {
    from: "https://www.iuj.ac.jp",
    to: "https://www.iuj.ac.jp/admissions/",
  },
  {
    from: "https://sites.google.com/tohoku.ac.jp/iphs-hsdrr/%E3%83%9B%E3%83%BC%E3%83%A0",
    to: "https://www.kankyo.tohoku.ac.jp/en/adm.html",
  },
  {
    from: "https://sites.google.com/tohoku.ac.jp/iphs-hsdrr/",
    to: "https://www.kankyo.tohoku.ac.jp/en/adm.html",
  },
  {
    from: "https://sites.google.com/tohoku.ac.jp/iphs/home",
    to: "https://www.kankyo.tohoku.ac.jp/en/adm.html",
  },
  {
    from: "https://www.keio.ac.jp/ja/st/",
    to: "https://www.st.keio.ac.jp/en/admissions/scholarships.html",
  },
  {
    from: "https://www.keio.ac.jp/ja/st",
    to: "https://www.st.keio.ac.jp/en/admissions/scholarships.html",
  },
  {
    from: "https://www.kankyo.tohoku.ac.jp/en/",
    to: "https://www.kankyo.tohoku.ac.jp/en/adm.html",
    alsoSource: false,
  },
  {
    from: "https://www.imrd.ugent.be/",
    to: "https://imrd.eu/admission-application/",
  },
  {
    from: "https://www.imrd.ugent.be",
    to: "https://imrd.eu/admission-application/",
  },
  {
    from: "https://unu.edu/ias/masters-degree/sustainability",
    to: "https://unu.edu/ias/admissions",
  },
  {
    from: "https://unu.edu/ias/masters-degree/sustainability/",
    to: "https://unu.edu/ias/admissions",
  },
  {
    from: "https://master-digicrea.univ-st-etienne.fr/",
    to: "https://master-digicrea.univ-st-etienne.fr/en/join-digicrea/how-to-apply.html",
  },
  {
    from: "https://master-nanomed.eu/",
    to: "https://nanomed.u-paris.fr/application/",
  },
  {
    from: "https://master-nanomed.eu",
    to: "https://nanomed.u-paris.fr/application/",
  },
  {
    from: "https://www.campuschina.org/scholarships/index.html",
    to: "https://studyinchina.csc.edu.cn/",
    alsoSource: false,
  },
  {
    from: "https://www.campuschina.org/scholarships/index.html/",
    to: "https://studyinchina.csc.edu.cn/",
    alsoSource: false,
  },
];

const CSC_APPLY = "https://cscuk.fcdo.gov.uk/apply/";
const CSC_SHARED_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/";
const AUSTRALIA_AWARDS_APPLY =
  "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships";

const SHARED_BUSINESS_MANAGEMENT_COURSE_APPLY = {
  "Durham University": "https://www.durham.ac.uk/business/courses/management-n2p109/",
  "Bournemouth University": "https://www.bournemouth.ac.uk/study/postgraduate/how-apply/",
};

const REJECT_APPLICATION_URL_PATTERNS = [
  "%ugc.gov.bd%",
  "%moet.gov.vn/en/Pages/default.aspx%",
];

async function applyUrlFix(from, to, options = {}) {
  const alsoSource = options.alsoSource !== false;
  const result = await query(
    `UPDATE scholarships
     SET application_url = $2,
         source_url = CASE
           WHEN $3 AND (source_url = $1 OR source_url = $1 || '/' OR rtrim(source_url, '/') = rtrim($1::text, '/'))
             THEN $2
           ELSE source_url
         END,
         updated_at = NOW()
     WHERE application_url = $1
        OR application_url = $1 || '/'
        OR rtrim(application_url, '/') = rtrim($1::text, '/')
     RETURNING id, title`,
    [from, to, alsoSource],
  );
  return result.rows;
}

async function fixAustraliaAwardsUrls() {
  const result = await query(
    `UPDATE scholarships
     SET application_url = $1,
         source_url = $1,
         updated_at = NOW()
     WHERE (
       application_url ILIKE '%australia-awards.aspx%'
       OR (
         application_url ILIKE '%dfat.gov.au%people-to-people/australia-awards%'
         AND application_url NOT ILIKE '%australia-awards-scholarships%'
       )
     )
     AND status IN ('verified', 'needs_review', 'pending')
     RETURNING id, title`,
    [AUSTRALIA_AWARDS_APPLY],
  );
  return result.rows;
}

async function fixCommonwealthSharedBrokenHubs() {
  const hubPatterns = [
    "%durham.ac.uk/study/scholarships/postgraduate/commonwealth-shared-scholarships%",
    "%bournemouth.ac.uk/study/fees-funding/scholarships%",
  ];
  const updated = [];
  for (const pattern of hubPatterns) {
    // eslint-disable-next-line no-await-in-loop
    const result = await query(
      `UPDATE scholarships
       SET application_url = $1,
           updated_at = NOW()
       WHERE application_url ILIKE $2
         AND title ILIKE 'Commonwealth Shared Scholarship%'
         AND title NOT ILIKE '%MSc Business and Management%'
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title`,
      [CSC_APPLY, pattern],
    );
    updated.push(...result.rows);
  }
  return updated;
}

async function fixSharedBusinessManagementCourses() {
  const updated = [];
  for (const [university, applyUrl] of Object.entries(SHARED_BUSINESS_MANAGEMENT_COURSE_APPLY)) {
    // eslint-disable-next-line no-await-in-loop
    const result = await query(
      `UPDATE scholarships
       SET application_url = $1,
           updated_at = NOW()
       WHERE title ILIKE $2
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title`,
      [applyUrl, `%MSc Business and Management (${university})%`],
    );
    updated.push(...result.rows);
  }
  return updated;
}

async function fixHtmlEntityTitles() {
  const result = await query(
    `UPDATE scholarships
     SET title = REPLACE(REPLACE(title, 'Art&amp;Science', 'Art & Science'), '&#039;', ''''),
         updated_at = NOW()
     WHERE title LIKE '%&amp;%' OR title LIKE '%&#039;%'
     RETURNING id, title`,
  );
  return result.rows;
}

async function markClosedProgrammes() {
  const patterns = [
    {
      titlePattern: "%WAVES ACOUSTICS VIBRATIONS ENGINEERING SOUND%",
      reason: "master_waves_recruitment_closed",
    },
  ];
  const updated = [];
  for (const { titlePattern, reason } of patterns) {
    // eslint-disable-next-line no-await-in-loop
    const result = await query(
      `UPDATE scholarships
       SET application_status = 'closed',
           updated_at = NOW()
       WHERE title ILIKE $1
         AND status IN ('verified', 'needs_review', 'pending')
       RETURNING id, title`,
      [titlePattern],
    );
    updated.push(...result.rows.map((r) => ({ ...r, reason })));
  }
  return updated;
}

async function rejectBrokenApplyUrls() {
  const result = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'broken_apply_url',
         updated_at = NOW()
     WHERE application_url ILIKE '%/404.html%'
       AND status IN ('verified', 'needs_review', 'pending')
     RETURNING id, title, application_url`,
  );
  return result.rows;
}

async function rejectByPattern(pattern) {
  const result = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'invalid_or_homepage_apply_url',
         updated_at = NOW()
     WHERE (application_url ILIKE $1 OR source_url ILIKE $1)
       AND status IN ('verified', 'needs_review', 'pending')
     RETURNING id, title, application_url`,
    [pattern],
  );
  return result.rows;
}

async function dedupeVanier() {
  const dupes = await query(
    `SELECT application_url, array_agg(id ORDER BY updated_at DESC) AS ids
     FROM scholarships
     WHERE title ILIKE '%Vanier Canada Graduate%'
       AND status = 'verified'
     GROUP BY application_url`,
  );
  let rejected = 0;
  for (const row of dupes.rows) {
    const normalized = String(row.application_url || "").replace(/\/+$/, "");
    const vanierApply =
      "https://www.nserc-crsng.gc.ca/Students-Etudiants/PG-CS/cgrsd-besrd_eng.asp";
    if (normalized !== vanierApply.replace(/\/+$/, "")) continue;
    const [, ...drop] = row.ids;
    for (const id of drop) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships SET status = 'duplicate', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      rejected += 1;
    }
  }
  return rejected;
}

async function exportVisibleCsv() {
  const { publicOpenScholarshipSql } = require("../src/utils/publicScholarshipVisibility");
  const open = publicOpenScholarshipSql("");
  const { rows } = await query(
    `SELECT title, application_url, source_url, organization_name, country, source_name, application_status
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND ${open}
     ORDER BY title ASC, application_url ASC`,
  );

  function csvEscape(value) {
    const v = String(value ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }

  const lines = [
    "n,title,application_url,source_url,organization,country,source_name,application_status",
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
      ].join(","),
    );
  });

  const outPath = path.join(__dirname, "..", "..", "visible-scholarships-urls.csv");
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  return { outPath, rows: rows.length };
}

async function main() {
  const fixed = [];
  for (const { from, to, alsoSource } of APPLICATION_URL_FIXES) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await applyUrlFix(from, to, { alsoSource });
    if (rows.length) fixed.push({ from, to, count: rows.length, titles: rows.map((r) => r.title) });
  }

  const rejected = [];
  for (const pattern of REJECT_APPLICATION_URL_PATTERNS) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await rejectByPattern(pattern);
    if (rows.length) rejected.push({ pattern, count: rows.length, titles: rows.map((r) => r.title) });
  }

  const australia = await fixAustraliaAwardsUrls();
  const commonwealthHubs = await fixCommonwealthSharedBrokenHubs();
  const sharedBusinessCourses = await fixSharedBusinessManagementCourses();
  const broken404 = await rejectBrokenApplyUrls();
  const titleFixes = await fixHtmlEntityTitles();
  const closedProgrammes = await markClosedProgrammes();
  const vanierDupes = await dedupeVanier();
  const csv = await exportVisibleCsv();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        fixed,
        australiaAwards: australia.map((r) => r.title),
        commonwealthSharedHubs: commonwealthHubs.map((r) => r.title),
        sharedBusinessManagementCourses: sharedBusinessCourses.map((r) => r.title),
        broken404Rejected: broken404.map((r) => r.title),
        closedProgrammes: closedProgrammes.map((r) => r.title),
        titleEntityFixes: titleFixes.length,
        rejected,
        vanierDuplicatesRemoved: vanierDupes,
        csv,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
