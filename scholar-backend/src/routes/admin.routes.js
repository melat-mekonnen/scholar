const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireAdminOrOwner } = require("../middleware/requireAdminOrOwner");
const adminController = require("../controllers/adminController");
const observabilityController = require("../controllers/observabilityController");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", requireAdmin, adminController.getDashboard);
router.get("/statistics", requireAdmin, adminController.getStatistics);
router.get("/analytics", requireAdmin, adminController.getAnalytics);
router.get("/users", requireAdmin, adminController.listUsersForAdmin);
router.get("/audit-logs", requireAdmin, adminController.getAuditLogs);
router.get("/scholarships", requireAdminOrOwner, adminController.listScholarships);
router.get("/scholarships/pending", requireAdminOrOwner, adminController.getPendingScholarships);
router.get("/scholarships/:id", requireAdminOrOwner, adminController.getScholarship);
router.put("/scholarships/:id/verify", requireAdmin, adminController.verify);
router.put("/scholarships/:id/reject", requireAdmin, adminController.reject);
router.get("/discovery/sources", requireAdmin, adminController.listDiscoverySources);
router.post("/discovery/sources", requireAdmin, adminController.upsertDiscoverySource);
router.post("/discovery/run", requireAdmin, adminController.runDiscovery);
router.get("/candidates", requireAdmin, adminController.listCandidates);
router.patch("/candidates/:id/approve", requireAdmin, adminController.approveCandidate);
router.patch("/candidates/:id/reject", requireAdmin, adminController.rejectCandidate);
router.post("/candidates/discovery/run", requireAdmin, adminController.runCandidateDiscovery);

// Observability
router.get("/observability/metrics", requireAdminOrOwner, observabilityController.getMetrics);
router.get("/observability/traces", requireAdminOrOwner, observabilityController.getTraces);

module.exports = router;

