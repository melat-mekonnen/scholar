const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");

const router = express.Router();

// Only protect /profile routes, do not force auth on other /api/* routes
router.use("/profile", authMiddleware);

router.post("/profile", profileController.create);
router.get("/profile", profileController.get);
router.put("/profile", profileController.update);

module.exports = router;

