const {
  createProfile,
  getProfile,
  updateProfile,
} = require("../usecases/profile/profileUsecases");

/** Stable JSON shape for the frontend (camelCase). */
function formatProfileJson(row) {
  if (!row) return null;
  const gpa =
    row.gpa != null && row.gpa !== ""
      ? Number(row.gpa)
      : null;
  return {
    id: row.id,
    userId: row.user_id,
    gpa: gpa != null && !Number.isNaN(gpa) ? gpa : null,
    degreeLevel: row.degree_level,
    fieldOfStudy: row.field_of_study,
    preferredCountry: row.preferred_country,
    interests: Array.isArray(row.interests) ? row.interests : [],
    completenessScore:
      row.completeness_score != null
        ? Number(row.completeness_score)
        : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await createProfile(userId, req.body || {});
    return res.status(201).json(formatProfileJson(profile));
  } catch (err) {
    return next(err);
  }
}

async function get(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.json(formatProfileJson(profile));
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await updateProfile(userId, req.body || {});
    return res.json(formatProfileJson(profile));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  get,
  update,
};

