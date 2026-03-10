const Deal = require("../models/Deal");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { createNotification } = require("./notificationController");

// Create a new Deal Negotiation
exports.createDeal = async (req, res) => {
    try {
        const { crop, buyerId, originalPrice, quantityKg } = req.body;
        const sellerId = req.user._id;

        // Basic validation
        if (!crop || !buyerId || !originalPrice || !quantityKg) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const deal = await Deal.create({
            crop,
            seller: sellerId,
            buyer: buyerId,
            originalPrice,
            quantityKg,
            currentOffer: originalPrice,
            status: "PENDING",
            lastOfferBy: sellerId,
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        });

        // Notify Buyer
        const io = req.app.get("io");
        if (io) {
            await createNotification(io, {
                userId: buyerId,
                role: "buyer",
                title: "New Purchase Request",
                message: `Farmer ${req.user.name} sent a deal for ${crop}`,
                type: "deal",
                relatedEntityId: deal._id
            });
        }

        res.status(201).json({ success: true, deal });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Make an Offer / Counter-Offer
exports.makeOffer = async (req, res) => {
    try {
        const { price } = req.body;
        const dealId = req.params.id;

        const deal = await Deal.findById(dealId);
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        // Ensure status is valid
        if (["ACCEPTED", "REJECTED", "EXPIRED"].includes(deal.status)) {
            return res.status(400).json({ message: `Cannot offer on a ${deal.status} deal` });
        }

        // Update Deal
        deal.currentOffer = price;
        deal.lastOfferBy = req.user._id;
        deal.status = "PENDING";
        deal.expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // Extend Expiry

        // Add to history
        deal.history.push({
            price,
            offeredBy: req.user._id
        });

        await deal.save();

        // Notify Other Party
        const io = req.app.get("io");
        if (io) {
            const recipientId = deal.seller.toString() === req.user._id.toString() ? deal.buyer : deal.seller;
            const recipientRole = deal.seller.toString() === req.user._id.toString() ? "buyer" : "farmer";

            await createNotification(io, {
                userId: recipientId,
                role: recipientRole,
                title: "New Counter Offer",
                message: `${req.user.name} offered ₹${price} for ${deal.crop}`,
                type: "deal",
                relatedEntityId: deal._id
            });
        }

        res.json({ success: true, message: "Offer sent", deal });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Accept Offer
exports.acceptOffer = async (req, res) => {
    try {
        console.log(`➡️  Accept Offer: Deal ID ${req.params.id} by User ${req.user._id}`);
        const deal = await Deal.findById(req.params.id);
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        if (deal.status !== "PENDING") {
            return res.status(400).json({ message: "Deal is not in pending state" });
        }

        // Check expiry
        if (deal.expiresAt < Date.now()) {
            deal.status = "EXPIRED";
            await deal.save();
            return res.status(400).json({ message: "Deal has expired" });
        }

        // Check permission: You cannot accept your own offer!
        // Ideally, if lastOfferBy == req.user._id, you are the one who made the offer.
        // The OTHER party must accept.
        if (deal.lastOfferBy.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot accept your own offer. Wait for the other party." });
        }

        deal.status = "ACCEPTED";
        await deal.save();

        // Notify Offer Maker
        const io = req.app.get("io");
        if (io) {
            const recipientId = deal.lastOfferBy;
            const recipientRole = recipientId.toString() === deal.buyer.toString() ? "buyer" : "farmer";

            await createNotification(io, {
                userId: recipientId,
                role: recipientRole,
                title: "Deal Accepted!",
                message: `${req.user.name} accepted your offer for ${deal.crop}`,
                type: "deal",
                relatedEntityId: deal._id
            });
            // Tell the chat room to refresh the deal UI instantly
            io.to(`deal_${deal._id}`).emit("dealUpdated", deal);
        }

        res.json({ success: true, message: "Deal Accepted!", deal });

    } catch (err) {
        console.error("❌  Error in acceptOffer:", err);
        res.status(500).json({ error: err.message });
    }
};

// Reject Offer
exports.rejectOffer = async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        if (deal.status !== "PENDING") {
            return res.status(400).json({ message: "Deal is not in pending state" });
        }

        deal.status = "REJECTED";
        await deal.save();

        // Notify Offer Maker
        const io = req.app.get("io");
        if (io) {
            const recipientId = deal.lastOfferBy;
            const recipientRole = recipientId.toString() === deal.buyer.toString() ? "buyer" : "farmer";

            await createNotification(io, {
                userId: recipientId,
                role: recipientRole,
                title: "Deal Rejected",
                message: `${req.user.name} rejected the offer for ${deal.crop}`,
                type: "deal",
                relatedEntityId: deal._id
            });
        }

        res.json({ success: true, message: "Deal Rejected", deal });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Deal (with auto-expiry check)
exports.getDeal = async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate("buyer", "name phone")
            .populate("seller", "name phone");

        if (!deal) return res.status(404).json({ message: "Deal not found" });

        // Auto-Expire Check on Read
        if (deal.status === "PENDING" && deal.expiresAt < Date.now()) {
            deal.status = "EXPIRED";
            await deal.save();
        }

        res.json({ success: true, deal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
