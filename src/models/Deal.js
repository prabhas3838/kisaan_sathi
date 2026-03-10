const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    crop: {
        type: String, // Store Name for now, or Ref to Inventory
        required: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    currentOffer: {
        type: Number,
        required: true
    },
    quantityKg: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
        default: "PENDING"
    },
    lastOfferBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    // ---- Stripe Escrow Fields ----
    paymentStatus: {
        type: String,
        enum: ["unpaid", "held_in_escrow", "released", "refunded"],
        default: "unpaid"
    },
    stripePaymentIntentId: {
        type: String,
        default: null
    },
    deliveryStatus: {
        type: String,
        enum: ["pending", "delivered"],
        default: "pending"
    },
    // ------------------------------
    history: [{
        price: Number,
        offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to check expiry on find
dealSchema.post('findOne', function (doc) {
    if (doc && doc.status === 'PENDING' && doc.expiresAt < Date.now()) {
        doc.status = 'EXPIRED';
        doc.save(); // Async save (might need better handling for critical expiration logic)
    }
});

module.exports = mongoose.model("Deal", dealSchema);
