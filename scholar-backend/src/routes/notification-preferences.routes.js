const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const notificationPreferencesController = require("../controllers/notificationPreferencesController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.get("/", notificationPreferencesController.getMine);
router.put("/", notificationPreferencesController.updateMine);

module.exports = router;
