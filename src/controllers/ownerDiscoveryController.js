const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { fetchTrustedScholarships } = require("../services/trustedScholarshipSources");

const scholarshipRepo = new ScholarshipRepository();

function safeStr(v) {
  return v == null ? "" : String(v);
}

async function importTrusted(req, res, next) {
  try {
    const { results, errors } = await fetchTrustedScholarships();
    const saved = [];
    for (const r of results) {
      if (!r?.sourceUrl || !r?.title || !r?.country) continue;
      const row = await scholarshipRepo.upsertDiscoveredScholarship({
        title: safeStr(r.title).trim(),
        country: safeStr(r.country).trim(),
        degreeLevel: r.degreeLevel ? safeStr(r.degreeLevel).trim() : null,
        fieldOfStudy: r.fieldOfStudy ? safeStr(r.fieldOfStudy).trim() : null,
        fundingType: r.fundingType ? safeStr(r.fundingType).trim() : null,
        deadline: r.deadline ? safeStr(r.deadline).trim() : null,
        amount: r.amount ? safeStr(r.amount).trim() : null,
        description: r.description ? safeStr(r.description).trim() : null,
        applicationUrl: safeStr(r.sourceUrl).trim(),
        sourceName: r.sourceName ? safeStr(r.sourceName).trim() : "Trusted source",
        sourceUrl: safeStr(r.sourceUrl).trim(),
        externalId: null,
        aiConfidence: r.confidence != null ? Number(r.confidence) : null,
      });
      if (row) saved.push(row);
    }
    return res.json({
      discovered: results.length,
      saved: saved.length,
      errors,
      pendingScholarships: saved,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  importTrusted,
};
