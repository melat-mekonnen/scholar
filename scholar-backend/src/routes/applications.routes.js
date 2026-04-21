const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudentOnly } = require("../middleware/requireStudentOnly");
const applicationsController = require("../controllers/applicationsController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireStudentOnly, applicationsController.create);
router.get("/", requireStudentOnly, applicationsController.listMine);
router.get("/:id", applicationsController.getById);
router.put("/:id", requireStudentOnly, applicationsController.update);
router.put("/:id/status", requireStudentOnly, applicationsController.updateStatus);
router.delete("/:id", requireStudentOnly, applicationsController.remove);
router.post("/:id/notes", requireStudentOnly, applicationsController.addNote);

module.exports = router;

