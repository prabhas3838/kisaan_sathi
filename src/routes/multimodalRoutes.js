const express = require("express");
const router = express.Router();
const controller = require("../controllers/multimodalController");
const {
  protect,
  requireVerifiedUser
} = require("../middleware/authMiddleware");

// Save language preference (logged in users)
router.post(
  "/language",
  protect,
  controller.setLanguagePreference
);

// Unified input handler (verified users only)
router.post(
  "/input",
  protect,
  requireVerifiedUser,
  controller.handleUnifiedInput
);

module.exports = router;
