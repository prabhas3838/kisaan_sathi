const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // GeoJSON point 
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: "Coordinates must be [lng, lat]"
        }
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// For geospatial queries
locationSchema.index({ locationCoordinates: "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);
