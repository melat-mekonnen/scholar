const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const applicationsController = require("../controllers/applicationsController");
const applicationConfirmController = require("../controllers/applicationConfirmController");

const router = express.Router();

router.get("/confirm/:token", applicationConfirmController.confirmByToken);

router.use(authMiddleware, requireStudent);

router.post("/", applicationsController.create);
router.get("/", applicationsController.listMine);
router.put("/:id/status", applicationsController.updateStatus);

module.exports = router;

