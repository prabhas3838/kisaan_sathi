const mongoose = require("mongoose");

const AnalyticsCacheSchema = new mongoose.Schema({
    crop: {
        type: String,
        required: true,
        lowercase: true,
    },
    mandi: {
        type: String,
        required: true,
        lowercase: true,
    },
    dateCached: {
        type: String, // Stored as YYYY-MM-DD
        required: true,
    },
    historical: {
        type: Array,
        required: true
    },
    predicted: {
        type: Array,
        required: true
    },
    recommendation: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Ensure fast lookups for specific crop+mandi+date combos
AnalyticsCacheSchema.index({ crop: 1, mandi: 1, dateCached: 1 }, { unique: true });

module.exports = mongoose.model("AnalyticsCache", AnalyticsCacheSchema);
