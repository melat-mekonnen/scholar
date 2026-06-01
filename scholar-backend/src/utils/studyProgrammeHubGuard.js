/** Path segments and titles that indicate a course directory hub, not a single programme. */
const HUB_PATH_SEGMENTS = new Set([
  "course-list",
  "courses",
  "course-finder",
  "find-a-course",
  "search",
  "index",
]);

const HUB_TITLES = new Set(["course list", "courses", "course finder", "find a course"]);

function lastPathSegment(url) {
  try {
    const u = new URL(String(url || "").trim());
    const parts = u.pathname.split("/").filter(Boolean);
    return (parts[parts.length - 1] || "").toLowerCase();
  } catch {
    return "";
  }
}

function isStudyProgrammeHubUrl(url) {
  return HUB_PATH_SEGMENTS.has(lastPathSegment(url));
}

function isValidStudyProgrammeListing({ title, sourceUrl, applicationUrl } = {}) {
  const url = sourceUrl || applicationUrl;
  if (!url || isStudyProgrammeHubUrl(url)) return false;
  const normalizedTitle = String(title || "")
    .trim()
    .toLowerCase();
  if (HUB_TITLES.has(normalizedTitle)) return false;
  return true;
}

/** SQL fragment: exclude verified programmes that point at listing hubs. */
function studyProgrammeNotHubSql(alias = "p") {
  const segList = [...HUB_PATH_SEGMENTS].map((s) => s.replace(/'/g, "''")).join("|");
  const titleList = [...HUB_TITLES].map((t) => `'${t.replace(/'/g, "''")}'`).join(", ");
  return `(COALESCE(${alias}.source_url, '') !~* '/(${segList})/?$'
    AND LOWER(TRIM(${alias}.title)) NOT IN (${titleList}))`;
}

module.exports = {
  HUB_PATH_SEGMENTS,
  HUB_TITLES,
  lastPathSegment,
  isStudyProgrammeHubUrl,
  isValidStudyProgrammeListing,
  studyProgrammeNotHubSql,
};
