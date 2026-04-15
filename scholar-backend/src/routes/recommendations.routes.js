const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const recommendationsController = require("../controllers/recommendationsController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.get("/", recommendationsController.list);

module.exports = router;

