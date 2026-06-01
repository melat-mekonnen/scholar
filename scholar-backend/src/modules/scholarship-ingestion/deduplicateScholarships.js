const { normalizeUrl, titleSimilarity } = require("./urlNormalize");
const { normalizeOrg } = require("./scholarshipClassifier");
const { shouldPreferIncoming } = require("./detectDuplicates");

const ACTIVE_STATUSES = ["verified", "pending", "needs_review"];

const STATUS_RANK = {
  verified: 3,
  needs_review: 2,
  pending: 1,
};

const TIER_RANK = {
  government_trusted: 3,
  other: 2,
  aggregator: 1,
};

function tierRank(row) {
  return TIER_RANK[row.ingestion_tier || row.ingestionTier] || 0;
}

function providerKey(row) {
  return (
    normalizeOrg(row.organization_name || row.organizationName) ||
    normalizeOrg(row.source_name || row.sourceName) ||
    normalizeOrg(String(row.title || "").split("|")[0])
  );
}

function toIncomingRecord(row) {
  return {
    title: row.title,
    country: row.country,
    description: row.description,
    applicationUrl: row.application_url || row.applicationUrl,
    sourceUrl: row.source_url || row.sourceUrl,
    organizationName: row.organization_name || row.organizationName,
    sourceName: row.source_name || row.sourceName,
    degreeLevel: row.degree_level || row.degreeLevel,
    ingestionTier: row.ingestion_tier || row.ingestionTier,
    externalId: row.external_id || row.externalId,
  };
}

/**
 * @returns {string|null} duplicate reason code when two rows should cluster
 *
 * Only collapse exact re-imports from the same data source. Different programmes
 * stay separate even when they share a funding hub URL, and different sources may
 * reference the same official apply link.
 */
function matchDuplicateReason(a, b) {
  const sourceA = String(a.source_name || a.sourceName || "").toUpperCase();
  const sourceB = String(b.source_name || b.sourceName || "").toUpperCase();
  const sameSource = sourceA && sourceB && sourceA === sourceB;

  const extA = a.external_id || a.externalId;
  const extB = b.external_id || b.externalId;
  if (sameSource && extA && extB && extA === extB) {
    return "same_source_and_external_id";
  }

  const srcA = normalizeUrl(a.normalized_source_url || a.source_url || a.sourceUrl);
  const srcB = normalizeUrl(b.normalized_source_url || b.source_url || b.sourceUrl);
  if (sameSource && srcA && srcB && srcA === srcB) {
    return "same_source_url";
  }

  return null;
}

function statusRank(row) {
  return STATUS_RANK[row.status] || 0;
}

/**
 * @returns {number} negative if `a` should win over `b`
 */
function compareRowsForWinner(a, b) {
  const statusDiff = statusRank(a) - statusRank(b);
  if (statusDiff !== 0) return statusDiff;

  const tierDiff = tierRank(a) - tierRank(b);
  if (tierDiff !== 0) return tierDiff;

  const incomingA = toIncomingRecord(a);
  const incomingB = toIncomingRecord(b);
  if (shouldPreferIncoming(b, incomingA)) return -1;
  if (shouldPreferIncoming(a, incomingB)) return 1;

  const qualityDiff = (a.quality_score || 0) - (b.quality_score || 0);
  if (qualityDiff !== 0) return qualityDiff;

  const descDiff = String(a.description || "").length - String(b.description || "").length;
  if (descDiff !== 0) return descDiff;

  if (a.external_id && !b.external_id) return 1;
  if (b.external_id && !a.external_id) return -1;

  return String(a.created_at || "").localeCompare(String(b.created_at || ""));
}

function pickWinner(cluster) {
  return cluster.reduce((best, row) => {
    if (!best) return row;
    return compareRowsForWinner(row, best) > 0 ? row : best;
  }, null);
}

function buildDuplicateClusters(rows) {
  if (rows.length < 2) return [];

  const parent = rows.map((_, index) => index);

  function find(index) {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (matchDuplicateReason(rows[i], rows[j])) {
        union(i, j);
      }
    }
  }

  const grouped = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const root = find(i);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(rows[i]);
  }

  return [...grouped.values()].filter((cluster) => cluster.length > 1);
}

/**
 * @param {object[]} rows scholarship rows from DB
 * @returns {{ clusters: object[][], actions: object[], summary: object }}
 */
function planDeduplication(rows) {
  const candidates = rows.filter(
    (row) =>
      ACTIVE_STATUSES.includes(row.status) &&
      (row.record_type == null || row.record_type === "scholarship"),
  );

  const clusters = buildDuplicateClusters(candidates);
  const actions = [];

  for (const cluster of clusters) {
    const winner = pickWinner(cluster);
    for (const row of cluster) {
      if (row.id === winner.id) continue;
      actions.push({
        loserId: row.id,
        loserTitle: row.title,
        loserStatus: row.status,
        loserSource: row.source_name,
        winnerId: winner.id,
        winnerTitle: winner.title,
        winnerStatus: winner.status,
        winnerSource: winner.source_name,
        reason: matchDuplicateReason(row, winner) || matchDuplicateReason(winner, row),
      });
    }
  }

  const loserIds = new Set(actions.map((action) => action.loserId));
  return {
    clusters,
    actions,
    summary: {
      scanned: candidates.length,
      clusterCount: clusters.length,
      duplicateRows: actions.length,
      verifiedBefore: candidates.filter((row) => row.status === "verified").length,
      verifiedAfter: candidates.filter((row) => row.status === "verified").length - actions.filter(
        (action) => action.loserStatus === "verified",
      ).length,
    },
  };
}

module.exports = {
  ACTIVE_STATUSES,
  providerKey,
  matchDuplicateReason,
  compareRowsForWinner,
  pickWinner,
  buildDuplicateClusters,
  planDeduplication,
};
