const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get("/dashboard", adminController.getDashboard);
router.get("/scholarships", adminController.listScholarships);
router.get("/scholarships/pending", adminController.getPendingScholarships);
router.get("/scholarships/:id", adminController.getScholarship);
router.put("/scholarships/:id/verify", adminController.verify);
router.put("/scholarships/:id/reject", adminController.reject);

module.exports = router;

