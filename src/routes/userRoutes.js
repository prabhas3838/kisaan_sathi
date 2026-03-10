const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Create user (PUBLIC – registration)
router.post("/", userController.createUser);

// Get all users (PROTECTED)
router.get(
  "/",
  protect,
  userController.getUsers
);

// Request Verification (PROTECTED)
router.post(
  "/verify",
  protect,
  userController.requestVerification
);

// Update Verification Status (ADMIN ONLY)
router.put(
  "/:id/verify-status",
  protect,
  authorize("admin"),
  userController.updateVerificationStatus
);

// Get My Profile (PROTECTED)
router.get(
  "/profile",
  protect,
  userController.getUserProfile
);

// Update Location (PROTECTED)
router.post(
  "/location",
  protect,
  userController.updateLocation
);

// Update Profile (Name, Language) - PROTECTED
router.put(
  "/profile",
  protect,
  userController.updateProfile
);

// Get Public Profile (Public Data) - PUBLIC/PROTECTED
router.get(
  "/public/:id",
  userController.getPublicProfile
);

// Get saved location (PROTECTED)
router.get("/location", protect, userController.getMyLocation);

// PIN and Password (PROTECTED)
router.post("/verify-pin", protect, userController.verifyPin);
router.post("/change-password", protect, userController.changePassword);




module.exports = router;
