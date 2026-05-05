const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const communityController = require("../controllers/communityController");

const router = express.Router();

router.use(authMiddleware);

router.get("/channels", communityController.listChannels);
router.get("/channels/:channelId/messages", communityController.listMessages);
router.get("/channels/:channelId/stream", communityController.streamChannel);
router.post("/channels/:channelId/messages", communityController.createMessage);
router.delete("/messages/:messageId", communityController.deleteMessage);
router.post("/messages/:messageId/report", communityController.reportMessage);

module.exports = router;
