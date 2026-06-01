const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const { communityUpload } = require("../middleware/communityUpload");
const communityController = require("../controllers/communityController");

const router = express.Router();

router.get("/attachments/:attachmentId", authMiddleware, requireStudent, communityController.downloadAttachment);

router.use(authMiddleware, requireStudent);

router.get("/channels", communityController.listChannels);
router.get("/channels/:channelId/messages/search", communityController.searchMessages);
router.get("/channels/:channelId/messages", communityController.listMessages);
router.get("/channels/:channelId/stream", communityController.streamChannel);
router.post(
  "/channels/:channelId/messages",
  communityUpload.array("files", 4),
  communityController.createMessage,
);
router.put("/channels/:channelId/pin/:messageId", communityController.pinMessage);
router.delete("/channels/:channelId/pin", communityController.unpinMessage);
router.patch("/messages/:messageId", communityController.updateMessage);
router.delete("/messages/:messageId", communityController.deleteMessage);
router.put("/messages/:messageId/hide", communityController.hideMessage);
router.post("/messages/:messageId/report", communityController.reportMessage);

module.exports = router;
