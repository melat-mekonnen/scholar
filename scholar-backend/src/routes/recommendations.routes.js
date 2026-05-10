const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const { enforceFreeTierLimits } = require("../middleware/subscriptionMiddleware");
const recommendationsController = require("../controllers/recommendationsController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.get("/", enforceFreeTierLimits, recommendationsController.list);
router.post("/feedback", recommendationsController.logFeedback);

module.exports = router;

