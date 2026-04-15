const express = require("express");
const scholarshipsController = require("../controllers/scholarshipsController");
const bookmarkController = require("../controllers/bookmarkController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { optionalAuthMiddleware } = require("../middleware/optionalAuthMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const { requireManager } = require("../middleware/requireManager");

const router = express.Router();

router.post("/", authMiddleware, requireManager, scholarshipsController.create);
router.get("/filters", scholarshipsController.getFilters);
router.get("/search", optionalAuthMiddleware, scholarshipsController.search);

router.post(
  "/:id/bookmark",
  authMiddleware,
  requireStudent,
  bookmarkController.addBookmark
);
router.delete(
  "/:id/bookmark",
  authMiddleware,
  requireStudent,
  bookmarkController.removeBookmark
);

router.get("/:id", optionalAuthMiddleware, scholarshipsController.getById);

module.exports = router;
