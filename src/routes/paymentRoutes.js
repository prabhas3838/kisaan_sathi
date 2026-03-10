const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// Step 1: Buyer initiates payment
router.post("/intent/:dealId", protect, paymentController.createPaymentIntent);

// Step 2: Buyer confirms card UI was successful
router.post("/confirm/:dealId", protect, paymentController.confirmEscrow);

// Step 3: Farmer delivers, funds are captured
router.post("/release/:dealId", protect, paymentController.releaseFunds);

module.exports = router;
