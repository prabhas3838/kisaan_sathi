const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ["farmer", "buyer", "admin"]
  },
  language: {
    type: String,
    default: "en"
  },
  trustScore: {
    type: Number,
    default: 0
  },

  otp: {
    type: String
  },
  otpVerified: {
    type: Boolean,
    default: false
  },


  totalTransactions: {
    type: Number,
    default: 0
  },

  location: {
    type: String, // Address string
    default: ""
  },

  // Geospatial Coordinates
  locationCoordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },

  // Verification Details
  verificationStatus: {
    type: String,
    enum: ["none", "pending", "approved", "rejected"],
    default: "none"
  },
  aadhaarNumber: {
    type: String
  },
  panNumber: {
    type: String
  },
  verificationComment: {
    type: String // Reason for rejection
  },
  totalLandArea: {
    type: Number,
    default: 0
  },
  totalLandAreaUnit: {
    type: String,
    enum: ["acres", "hectares"],
    default: "acres"
  }

}, { timestamps: true });

// Encrypt password using bcrypt
const bcrypt = require("bcryptjs");

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Index for Geospatial queries
userSchema.index({ locationCoordinates: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
