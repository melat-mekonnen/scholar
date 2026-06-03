const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireOwner } = require("../middleware/requireOwner");
const ownerController = require("../controllers/ownerController");
const ownerDiscoveryController = require("../controllers/ownerDiscoveryController");

const router = express.Router();

router.use(authMiddleware, requireOwner);

router.get("/dashboard", ownerController.dashboard);
router.post("/discovery/import-trusted", ownerDiscoveryController.importTrusted);

module.exports = router;
