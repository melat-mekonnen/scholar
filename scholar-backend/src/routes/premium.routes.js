const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const { requirePremium } = require("../middleware/subscriptionMiddleware");
const premiumController = require("../controllers/premiumController");

const router = express.Router();

router.use(authMiddleware, requireStudent, requirePremium);

router.get("/profile-suggestions", premiumController.profileSuggestions);
router.get("/application-advice", premiumController.applicationAdvice);
router.get("/early-alerts", premiumController.earlyAlerts);

module.exports = router;
