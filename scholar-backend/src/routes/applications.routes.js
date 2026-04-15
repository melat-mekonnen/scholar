const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const applicationsController = require("../controllers/applicationsController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.post("/", applicationsController.create);
router.get("/", applicationsController.listMine);
router.put("/:id/status", applicationsController.updateStatus);

module.exports = router;

