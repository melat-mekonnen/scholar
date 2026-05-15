const express = require("express");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.post("/", billingController.chapaWebhook);

module.exports = router;
