const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");

const router = express.Router();

// Authenticated users only (students, managers, owners, admins) — each user’s own profile row.
router.use("/profile", authMiddleware);

router.post("/profile", profileController.create);
router.get("/profile", profileController.get);
router.put("/profile", profileController.update);

module.exports = router;

