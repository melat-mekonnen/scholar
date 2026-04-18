const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireManager } = require("../middleware/requireManager");
const managerController = require("../controllers/managerController");

const router = express.Router();

router.use(authMiddleware, requireManager);

router.get("/dashboard", managerController.dashboard);
router.get("/profile", managerController.profileGet);
router.put("/profile", managerController.profilePut);
router.get("/scholarships", managerController.scholarships);
router.get("/scholarships/:id/analytics", managerController.scholarshipAnalytics);
router.get("/statistics", managerController.statistics);

module.exports = router;

