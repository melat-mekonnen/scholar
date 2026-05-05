const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireOwner } = require("../middleware/requireOwner");
const ownerController = require("../controllers/ownerController");

const router = express.Router();

router.use(authMiddleware, requireOwner);

router.get("/dashboard", ownerController.dashboard);

module.exports = router;
