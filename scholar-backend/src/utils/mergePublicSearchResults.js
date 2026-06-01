function parseDateMs(value) {
  if (value == null || value === "") return null;
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Compare two public scholarship/programme rows using the same sort modes as searchPublic.
 */
function comparePublicSearchResults(a, b, sort, q) {
  switch (sort) {
    case "deadline_asc": {
      const aKey = parseDateMs(a.deadline || a.endDate) ?? Number.POSITIVE_INFINITY;
      const bKey = parseDateMs(b.deadline || b.endDate) ?? Number.POSITIVE_INFINITY;
      if (aKey !== bKey) return aKey - bKey;
      break;
    }
    case "deadline_desc": {
      const aKey = parseDateMs(a.deadline || a.endDate) ?? Number.NEGATIVE_INFINITY;
      const bKey = parseDateMs(b.deadline || b.endDate) ?? Number.NEGATIVE_INFINITY;
      if (aKey !== bKey) return bKey - aKey;
      break;
    }
    case "recent": {
      const aKey = parseDateMs(a.createdAt) ?? 0;
      const bKey = parseDateMs(b.createdAt) ?? 0;
      if (aKey !== bKey) return bKey - aKey;
      break;
    }
    case "funding_amount": {
      const cmp = String(b.amount || "").localeCompare(String(a.amount || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (cmp !== 0) return cmp;
      break;
    }
    case "relevance":
    default: {
      if (q) {
        const needle = String(q).toLowerCase();
        const aTitle = String(a.title || "").toLowerCase().includes(needle) ? 0 : 1;
        const bTitle = String(b.title || "").toLowerCase().includes(needle) ? 0 : 1;
        if (aTitle !== bTitle) return aTitle - bTitle;
      }
      const aKey = parseDateMs(a.createdAt) ?? 0;
      const bKey = parseDateMs(b.createdAt) ?? 0;
      if (aKey !== bKey) return bKey - aKey;
      break;
    }
  }

  return String(a.title || "").localeCompare(String(b.title || ""), undefined, {
    sensitivity: "base",
  });
}

function mergePublicSearchResults(scholarshipRows, programmeResults, { sort, q, limit }) {
  const items = [...scholarshipRows, ...(programmeResults || [])];
  const effectiveSort = sort || "relevance";
  items.sort((a, b) => comparePublicSearchResults(a, b, effectiveSort, q));
  return items.slice(0, limit);
}

module.exports = {
  comparePublicSearchResults,
  mergePublicSearchResults,
};
