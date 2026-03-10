const express = require("express");
const router = express.Router();
const controller = require("../controllers/mandiController");
const {
    protect,
    requireVerifiedUser
} = require("../middleware/authMiddleware");

// Add mandi price data (only verified users)
router.post(
    "/",
    protect,
    requireVerifiedUser,
    controller.addMandiPrice
);

// Get nearby mandis

// Get mandi prices
router.get("/", controller.getMandiPrices);

// Get nearby mandis
// Get nearby mandis
router.get("/nearby", protect, controller.getNearbyMandis);

module.exports = router;
