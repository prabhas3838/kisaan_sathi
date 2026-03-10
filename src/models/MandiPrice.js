const mongoose = require("mongoose");

const mandiPriceSchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true
    },
    mandi: {
      type: String,
      required: true
    },
    // Location Coordinates (GeoJSON)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    // Location Name (e.g., "Azadpur Mandi")
    locationName: {
      type: String,
      required: true
    },
    // NORMALIZED PRICE: ₹ per quintal
    pricePerQuintal: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for Geospatial queries
mandiPriceSchema.index({ location: "2dsphere" });
mandiPriceSchema.index({ crop: 1 });
mandiPriceSchema.index({ mandi: 1 });
mandiPriceSchema.index({ date: -1 });

module.exports = mongoose.model("MandiPrice", mandiPriceSchema);
