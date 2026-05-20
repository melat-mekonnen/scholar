const { fetchTrustedScholarships } = require("../../../services/trustedScholarshipSources");

function externalIdFromUrl(url) {
  const m = String(url || "").match(/\/scholarships\/(\d+)-/i);
  return m ? `fastweb-${m[1]}` : `fastweb-${Buffer.from(url || "").toString("base64url").slice(0, 24)}`;
}

async function fetchFastwebScholarships() {
  const { results, errors } = await fetchTrustedScholarships();
  if (errors.length > 0) {
    const err = new Error(errors.map((e) => `${e.sourceName}: ${e.message}`).join("; "));
    err.partialResults = results;
    throw err;
  }

  return results.map((row) => ({
    externalId: externalIdFromUrl(row.sourceUrl),
    title: row.title,
    organizationName: "Fastweb",
    country: row.country || "USA",
    degreeLevel: row.degreeLevel,
    fieldOfStudy: row.fieldOfStudy,
    fundingType: row.fundingType || "partial",
    deadline: row.deadline || null,
    amount: row.amount || null,
    description: row.description,
    applicationUrl: row.sourceUrl,
    sourceUrl: row.sourceUrl,
    aiConfidence: row.confidence ?? 0.65,
  }));
}

module.exports = { fetchFastwebScholarships };
