const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const chatbotController = require("../controllers/chatbotController");

const router = express.Router();

router.use(authMiddleware, requireStudent);
router.post("/query", chatbotController.query);

module.exports = router;

