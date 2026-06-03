const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireAdminOrOwner } = require("../middleware/requireAdminOrOwner");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", requireAdmin, adminController.getDashboard);
router.get("/statistics", requireAdmin, adminController.getStatistics);
router.get("/users", requireAdmin, adminController.listUsersForAdmin);
router.post("/users", requireAdmin, adminController.createUser);
router.get("/audit-logs", requireAdmin, adminController.getAuditLogs);
router.get("/scholarships", requireAdminOrOwner, adminController.listScholarships);
router.get("/scholarships/pending", requireAdminOrOwner, adminController.getPendingScholarships);
router.get("/scholarships/:id", requireAdminOrOwner, adminController.getScholarship);
router.put("/scholarships/:id/verify", requireAdminOrOwner, adminController.verify);
router.put("/scholarships/:id/reject", requireAdminOrOwner, adminController.reject);
router.delete("/scholarships/:id", requireAdmin, adminController.deleteScholarship);
router.get("/imports/sources", requireAdmin, adminController.getImportSources);
router.get("/imports/health", requireAdmin, adminController.getImportHealth);
router.get("/imports/runs", requireAdmin, adminController.getImportRuns);
router.get("/imports/errors", requireAdmin, adminController.getImportErrors);
router.post("/imports/run", requireAdmin, adminController.triggerImport);

module.exports = router;

