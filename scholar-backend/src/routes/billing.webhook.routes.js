const express = require("express");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.post("/stripe", billingController.stripeWebhook);
// Chapa is mounted separately in app.js with express.json()

module.exports = router;
