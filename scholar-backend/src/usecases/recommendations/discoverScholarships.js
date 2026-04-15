const axios = require("axios");
const { env } = require("../../config/env");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");

const profileRepo = new StudentProfileRepository();
const scholarshipRepo = new ScholarshipRepository();

function safeStr(v) {
  return v == null ? "" : String(v);
}

async function discoverScholarships({ userId, topN = 20 }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);
  if (!profile) {
    const err = new Error("Complete your profile to discover scholarships");
    err.statusCode = 400;
    throw err;
  }

  const aiUrl = `${env.aiServiceUrl.replace(/\/+$/, "")}/ai/discover`;
  const { data } = await axios.post(
    aiUrl,
    {
      student: {
        fieldOfStudy: profile.field_of_study,
        degreeLevel: profile.degree_level,
        gpa: profile.gpa != null ? Number(profile.gpa) : null,
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        preferredCountry: profile.preferred_country,
      },
      topN: Math.min(Math.max(Number(topN) || 20, 1), 50),
      providers: ["mock"],
    },
    { timeout: 15000 },
  );

  const results = Array.isArray(data?.results) ? data.results : [];
  const saved = [];
  for (const r of results) {
    if (!r?.sourceUrl || !r?.title || !r?.country) continue;
    const row = await scholarshipRepo.upsertDiscoveredScholarship({
      title: safeStr(r.title).trim(),
      country: safeStr(r.country).trim(),
      degreeLevel: r.degreeLevel ? safeStr(r.degreeLevel).trim() : null,
      fieldOfStudy: r.fieldOfStudy ? safeStr(r.fieldOfStudy).trim() : null,
      fundingType: null,
      deadline: r.deadline ? safeStr(r.deadline).trim() : null,
      amount: null,
      description: r.description ? safeStr(r.description).trim() : null,
      applicationUrl: safeStr(r.sourceUrl).trim(),
      sourceName: r.sourceName ? safeStr(r.sourceName).trim() : "AI discovery",
      sourceUrl: safeStr(r.sourceUrl).trim(),
      externalId: null,
      aiConfidence: r.confidence,
    });
    if (row) saved.push(row);
  }

  return {
    query: safeStr(data?.query || ""),
    discovered: results.length,
    saved: saved.length,
    pendingScholarships: saved,
  };
}

module.exports = { discoverScholarships };

