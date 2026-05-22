/** Map scraped / connector values to schema enum. */
function normalizeDegreeLevel(raw) {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "masters" || v === "master's" || v === "masters_degree") return "master";
  if (v === "master") return "master";
  if (v === "phd" || v === "doctorate" || v === "doctoral") return "phd";
  if (v === "bachelor" || v === "bachelors" || v === "undergraduate") return "bachelor";
  if (v === "high_school" || v === "highschool") return "high_school";
  if (v.includes("phd") || v.includes("doctoral")) return "phd";
  if (v.includes("master")) return "master";
  if (v.includes("bachelor") || v.includes("undergrad")) return "bachelor";
  if (v.includes("fellowship") || v.includes("professional")) return "master";
  return null;
}

function inferDegreeLevelFromUrl(url) {
  const path = String(url || "").toLowerCase();
  if (path.includes("phd") || path.includes("doctoral") || path.includes("split-site")) return "phd";
  if (path.includes("fellowship") && !path.includes("startup")) return "master";
  if (path.includes("master") || path.includes("shared") || path.includes("distance-learning")) {
    return "master";
  }
  return null;
}

module.exports = { normalizeDegreeLevel, inferDegreeLevelFromUrl };
