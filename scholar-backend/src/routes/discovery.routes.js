const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const discoveryController = require("../controllers/discoveryController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.post("/refresh", discoveryController.refresh);

module.exports = router;

