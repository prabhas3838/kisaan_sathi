const User = require("../models/User");
const { updateTrustScore } = require("../services/trustService");
const jwt = require("jsonwebtoken");


/**
 * Register user
 */
exports.registerUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        otpVerified: user.otpVerified,
        trustScore: user.trustScore
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
};

/**
 * Send OTP (SIMULATED) - Step 1 of Sign Up / Login (if passwordless)
 * Now handles both new and existing users.
 */
exports.sendOTP = async (req, res) => {
  try {
    let { phone } = req.body;
    phone = phone.replace(/\D/g, '').slice(-10);

    let user = await User.findOne({ phone });
    if (!user) {
      // Create a temporary user with just the phone number
      user = await User.create({ phone });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpVerified = false;
    await user.save();

    // OTP is returned ONLY for demo/testing
    res.json({
      success: true,
      message: "OTP sent (simulated)",
      otp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Verify OTP - Step 2 of Sign Up
 */
exports.verifyOTP = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    phone = phone.replace(/\D/g, '').slice(-10);

    const user = await User.findOne({ phone });
    if (!user || user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    user.otpVerified = true;
    user.otp = null; // Clear OTP after usage

    await user.save();

    res.json({
      success: true,
      message: "OTP verified. Please proceed to set PIN.",
      user: {
        _id: user._id,
        phone: user.phone,
        otpVerified: user.otpVerified
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Complete Signup - Step 3 (Set PIN and Profile Details)
 */
exports.completeSignup = async (req, res) => {
  try {
    let { phone, pin, name, role } = req.body;

    if (!phone || !pin || !name || !role) {
      return res.status(400).json({ success: false, message: "Please provide phone, pin, name, and role." });
    }
    phone = phone.replace(/\D/g, '').slice(-10);

    // Validate PIN (Digits only, 4-6 length)
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: "PIN must be 4-6 digits only." });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.otpVerified) {
      return res.status(403).json({ success: false, message: "Please verify OTP first." });
    }

    user.name = name;
    user.role = role;
    user.password = pin; // Uses the pre-save hook to hash this "pin"
    user.trustScore = updateTrustScore(user);

    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        trustScore: user.trustScore
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Login User (Phone + PIN)
 */
exports.loginUser = async (req, res) => {
  try {
    let { phone, pin } = req.body;

    // Validate phone & pin
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: "Please provide phone and pin" });
    }
    phone = phone.replace(/\D/g, '').slice(-10);

    // Check for user
    const user = await User.findOne({ phone }).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Ensure the user actually has a password set (some users may have bailed halfway through OTP signup)
    if (!user.password) {
      return res.status(400).json({ success: false, message: "Account setup incomplete. Please complete signup to set a PIN." });
    }

    // Check if password (PIN) matches
    const isMatch = await user.matchPassword(pin);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        otpVerified: user.otpVerified,
        trustScore: user.trustScore
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
