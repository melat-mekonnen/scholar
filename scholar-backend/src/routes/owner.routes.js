const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireOwner } = require("../middleware/requireOwner");
const ownerController = require("../controllers/ownerController");
const observabilityController = require("../controllers/observabilityController");

const router = express.Router();

router.use(authMiddleware, requireOwner);

router.get("/dashboard", ownerController.dashboard);

// Observability
router.get("/observability/metrics", observabilityController.getMetrics);
router.get("/observability/traces", observabilityController.getTraces);

module.exports = router;
