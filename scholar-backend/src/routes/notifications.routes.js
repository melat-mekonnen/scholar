const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const notificationsController = require("../controllers/notificationsController");

const router = express.Router();

router.use(authMiddleware);
router.get("/mine", notificationsController.listMine);
router.put("/mine/read", notificationsController.markMineRead);

module.exports = router;
