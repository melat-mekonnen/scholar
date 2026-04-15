const {
  createProfile,
  getProfile,
  updateProfile,
} = require("../usecases/profile/profileUsecases");

async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await createProfile(userId, req.body || {});
    return res.status(201).json(profile);
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
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await updateProfile(userId, req.body || {});
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  get,
  update,
};

