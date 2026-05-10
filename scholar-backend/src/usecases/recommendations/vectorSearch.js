const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const {
  getTextEmbedding,
  vectorLiteral,
} = require("../../services/embeddingService");
const {
  rankScholarships,
  buildStrictQueryText,
  isStrictQuery,
} = require("./hybridRanking");
const { evaluateEligibility } = require("./eligibilityEngine");

const scholarshipRepo = new ScholarshipRepository();

function normalizeMulti(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

async function searchScholarships({
  q,
  countries,
  degreeLevels,
  fieldsOfStudy,
  fundingTypes,
  deadlineFrom,
  deadlineTo,
  sort,
  page,
  limit,
  status,
  bookmarkUserId,
  studentProfile,
  isPremium = false,
}) {
  const normalizedCountries = normalizeMulti(countries);
  const normalizedDegreeLevels = normalizeMulti(degreeLevels);
  const normalizedFieldsOfStudy = normalizeMulti(fieldsOfStudy);
  const normalizedFundingTypes = normalizeMulti(fundingTypes);
  const strictMode = isStrictQuery(q);
  const strictQueryText = buildStrictQueryText(q);

  let semanticResults = null;
  if (q && q.trim()) {
    try {
      const embedding = await getTextEmbedding(q);
      semanticResults = await scholarshipRepo.searchPublicByVector({
        queryEmbedding: vectorLiteral(embedding),
        q,
        strictQueryText,
        countries: normalizedCountries,
        degreeLevels: normalizedDegreeLevels,
        fieldsOfStudy: normalizedFieldsOfStudy,
        fundingTypes: normalizedFundingTypes,
        deadlineFrom,
        deadlineTo,
        sort,
        page,
        limit,
        status,
        bookmarkUserId,
      });
    } catch (err) {
      // Fallback to keyword search if embedding generation or pgvector lookup fails.
      semanticResults = null;
    }
  }

  if (!semanticResults) {
    const fallback = await scholarshipRepo.searchPublic({
      q,
      countries: normalizedCountries,
      degreeLevels: normalizedDegreeLevels,
      fieldsOfStudy: normalizedFieldsOfStudy,
      fundingTypes: normalizedFundingTypes,
      deadlineFrom,
      deadlineTo,
      sort,
      page,
      limit,
      status,
      bookmarkUserId,
    });

    const rankedFallback = rankScholarships({
      scholarships: fallback.results.map((scholarship) => ({ ...scholarship, semanticScore: 0 })),
      query: q,
      filters: {
        countries: normalizedCountries,
        degreeLevels: normalizedDegreeLevels,
        fieldsOfStudy: normalizedFieldsOfStudy,
        fundingTypes: normalizedFundingTypes,
      },
      strictMode,
      studentProfile,
      isPremium,
    });

    return {
      results: rankedFallback,
      total: fallback.total,
      page: fallback.page,
      limit: fallback.limit,
    };
  }

  const rankedResults = rankScholarships({
    scholarships: semanticResults.results,
    query: q,
    filters: {
      countries: normalizedCountries,
      degreeLevels: normalizedDegreeLevels,
      fieldsOfStudy: normalizedFieldsOfStudy,
      fundingTypes: normalizedFundingTypes,
    },
    strictMode,
    studentProfile,
    isPremium,
  });

  return {
    results: rankedResults,
    total: semanticResults.total,
    page: semanticResults.page,
    limit: semanticResults.limit,
  };
}

module.exports = {
  searchScholarships,
};
