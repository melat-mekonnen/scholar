/**
 * Builds a scholarship candidate pool for AI (recommend + chat): prefer rows that match
 * the student profile, then widen if the pool is too small.
 */
function buildProfileSearchFilters(profile) {
  const countries =
    profile?.preferred_country && String(profile.preferred_country).trim()
      ? [String(profile.preferred_country).trim()]
      : [];
  const degreeLevels =
    profile?.degree_level && String(profile.degree_level).trim()
      ? [String(profile.degree_level).trim()]
      : [];
  const fieldsOfStudy =
    profile?.field_of_study && String(profile.field_of_study).trim()
      ? [String(profile.field_of_study).trim()]
      : [];
  return { countries, degreeLevels, fieldsOfStudy };
}

async function fetchScholarshipPoolForAi(scholarshipRepo, userId, profile, limit = 200) {
  const { countries, degreeLevels, fieldsOfStudy } = buildProfileSearchFilters(profile);
  const base = {
    q: "",
    deadlineFrom: "",
    deadlineTo: "",
    sort: "recent",
    page: 1,
    status: "verified",
    bookmarkUserId: userId,
    fundingTypes: [],
  };

  let search = await scholarshipRepo.searchPublic({
    ...base,
    countries,
    degreeLevels,
    fieldsOfStudy,
    limit,
  });
  let rows = search.results || [];

  if (rows.length < 40 && fieldsOfStudy.length) {
    search = await scholarshipRepo.searchPublic({
      ...base,
      countries,
      degreeLevels,
      fieldsOfStudy: [],
      limit,
    });
    rows = search.results || [];
  }

  if (rows.length < 25 && (countries.length || degreeLevels.length)) {
    search = await scholarshipRepo.searchPublic({
      ...base,
      countries: [],
      degreeLevels: [],
      fieldsOfStudy: [],
      limit,
    });
    rows = search.results || [];
  }

  return search;
}

module.exports = {
  buildProfileSearchFilters,
  fetchScholarshipPoolForAi,
};
