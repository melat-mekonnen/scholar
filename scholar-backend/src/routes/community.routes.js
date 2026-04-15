const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const communityController = require("../controllers/communityController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.get("/channels", communityController.listChannels);
router.get("/channels/:channelId/messages", communityController.listMessages);
router.post("/channels/:channelId/messages", communityController.createMessage);
router.delete("/messages/:messageId", communityController.deleteMessage);

module.exports = router;
