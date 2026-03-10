const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    crop: {
        type: String,
        required: true
    },
    mandi: {
        type: String, // Or ref to Mandi if you have a Mandi model, currently MandiPrice uses string
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate watches for same user+crop+mandi
watchlistSchema.index({ user: 1, crop: 1, mandi: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", watchlistSchema);
