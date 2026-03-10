const Watchlist = require("../models/Watchlist");

// Subscribe to alerts
exports.subscribe = async (req, res) => {
    try {
        const { crop, mandi } = req.body;

        if (!crop || !mandi) {
            return res.status(400).json({ message: "Crop and Mandi are required" });
        }

        const watchlist = await Watchlist.create({
            user: req.user._id,
            crop,
            mandi
        });

        res.status(201).json({
            success: true,
            message: `Subscribed to alerts for ${crop} at ${mandi}`,
            data: watchlist
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "You are already watching this crop at this mandi" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Get my watchlist
exports.getMyWatchlist = async (req, res) => {
    try {
        const watchlist = await Watchlist.find({ user: req.user._id });
        res.json({
            success: true,
            count: watchlist.length,
            data: watchlist
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Unsubscribe
exports.unsubscribe = async (req, res) => {
    try {
        const watchlist = await Watchlist.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!watchlist) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        res.json({
            success: true,
            message: "Unsubscribed successfully"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
