const express = require("express");
const {
  signup,
  login,
  me,
  passwordResetRequest,
  passwordReset,
  refreshToken,
  googleAuth,
  googleCallback,
  logout,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/register", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.post("/password-reset-request", passwordResetRequest);
router.post("/password-reset", passwordReset);
router.post("/refresh-token", refreshToken);

router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/oauth/google", googleAuth);
router.get("/oauth/google/callback", googleCallback);

module.exports = router;

