const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdminOrOwner } = require("../middleware/requireAdminOrOwner");
const ownerCommunityController = require("../controllers/ownerCommunityController");

const router = express.Router();

router.use(authMiddleware, requireAdminOrOwner);
router.get("/channels", ownerCommunityController.listChannels);
router.post("/channels", ownerCommunityController.createChannel);
router.put("/channels/:id", ownerCommunityController.updateChannel);
router.get("/reports", ownerCommunityController.listReports);
router.put("/reports/:id", ownerCommunityController.resolveReport);
router.put("/messages/:messageId/hide", ownerCommunityController.hideMessage);

module.exports = router;
