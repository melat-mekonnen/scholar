const { confirmApplicationByToken } = require("../services/studentScholarshipNotifications");

async function confirmByToken(req, res, next) {
  try {
    const token = String(req.params?.token || "").trim();
    if (!token) {
      const err = new Error("Confirmation token is required");
      err.statusCode = 400;
      throw err;
    }

    const result = await confirmApplicationByToken(token);
    return res.json({
      success: true,
      alreadySubmitted: result.alreadySubmitted,
      scholarshipTitle: result.scholarshipTitle,
      applicationId: result.applicationId || null,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  confirmByToken,
};
