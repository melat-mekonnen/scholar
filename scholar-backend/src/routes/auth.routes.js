const express = require("express");
const {
  signup,
  login,
  me,
  googleAuth,
  googleCallback,
  logout,
} = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

module.exports = router;

