const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  }
});

const auctionSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    crop: {
      type: String,
      required: true
    },

    quantityKg: {
      type: Number,
      required: true
    },

    basePrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN"
    },

    extendedHours: {
      type: Number,
      default: 0
    },

    bids: [bidSchema],

    winningBid: {
      buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      amount: Number
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", auctionSchema);
