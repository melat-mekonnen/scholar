const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireStudent } = require("../middleware/requireStudent");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.use(authMiddleware, requireStudent);

router.get("/subscription", billingController.getSubscription);
router.post("/subscription/cancel", billingController.cancelSubscription);
router.post("/checkout/stripe", billingController.stripeCheckout);
router.post("/checkout/chapa", billingController.chapaCheckout);
router.post("/chapa/confirm", billingController.chapaConfirm);

module.exports = router;
