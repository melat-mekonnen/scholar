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
router.get("/audit-logs", requireAdmin, adminController.getAuditLogs);
router.get("/scholarships", requireAdminOrOwner, adminController.listScholarships);
router.get("/scholarships/pending", requireAdminOrOwner, adminController.getPendingScholarships);
router.get("/scholarships/:id", requireAdminOrOwner, adminController.getScholarship);
router.put("/scholarships/:id/verify", requireAdminOrOwner, adminController.verify);
router.put("/scholarships/:id/reject", requireAdminOrOwner, adminController.reject);
router.post("/scholarships/:id/flag", requireAdminOrOwner, adminController.flag);

module.exports = router;

