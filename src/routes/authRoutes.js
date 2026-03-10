const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");

// router.post("/register", controller.registerUser); // Deprecated
router.post("/send-otp", controller.sendOTP);
router.post("/verify-otp", controller.verifyOTP);
router.post("/signup-complete", controller.completeSignup);
router.post("/login", controller.loginUser);

module.exports = router;
