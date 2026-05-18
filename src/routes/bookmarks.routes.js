const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const bookmarkController = require("../controllers/bookmarkController");

const router = express.Router();

router.get("/", authMiddleware, requireStudent, bookmarkController.listBookmarks);

module.exports = router;
