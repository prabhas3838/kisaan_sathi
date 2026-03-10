const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const Deal = require('../models/Deal');

// 1. Create a Payment Intent (Authorizes card, does not capture funds)
exports.createPaymentIntent = async (req, res) => {
    try {
        const { dealId } = req.params;
        const deal = await Deal.findById(dealId);

        if (!deal) return res.status(404).json({ message: "Deal not found" });
        if (deal.status !== "ACCEPTED") return res.status(400).json({ message: "Only ACCEPTED deals can be paid" });
        if (deal.paymentStatus !== "unpaid") return res.status(400).json({ message: "Deal is already paid or in escrow" });

        // Amount in paise (INR) -> 1 INR = 100 Paise
        const amount = Math.round(deal.currentOffer * deal.quantityKg * 100);

        // Fallback for local testing without Stripe keys
        if (!process.env.STRIPE_SECRET_KEY) {
            console.log("⚠️ Running in Mock Stripe Mode");
            deal.stripePaymentIntentId = "pi_mock_" + Date.now();
            await deal.save();
            return res.json({ success: true, clientSecret: deal.stripePaymentIntentId + "_secret_mock" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'inr',
            capture_method: 'manual', // REQUIRED FOR ESCROW (Holds funds for up to 7 days)
            metadata: { dealId: deal._id.toString() }
        });

        deal.stripePaymentIntentId = paymentIntent.id;
        await deal.save();

        res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error("Stripe Intent Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// 2. Confirm Escrow (Called by Frontend after User successfully inputs Card)
exports.confirmEscrow = async (req, res) => {
    try {
        const { dealId } = req.params;
        const deal = await Deal.findById(dealId);

        if (!deal) return res.status(404).json({ message: "Deal not found" });

        if (deal.stripePaymentIntentId && deal.stripePaymentIntentId.startsWith("pi_mock_")) {
            deal.paymentStatus = "held_in_escrow";
            await deal.save();
            return res.json({ success: true, deal });
        }

        const intent = await stripe.paymentIntents.retrieve(deal.stripePaymentIntentId);

        // requires_capture means the bank approved the hold, but money hasn't moved yet = ESCROW!
        if (intent.status === "requires_capture" || intent.status === "succeeded") {
            deal.paymentStatus = "held_in_escrow";
            await deal.save();
            res.json({ success: true, deal });
        } else {
            res.status(400).json({ message: "Payment not authorized yet", status: intent.status });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Farmer marks as delivered, capturing the Escrow funds
exports.releaseFunds = async (req, res) => {
    try {
        const { dealId } = req.params;
        const deal = await Deal.findById(dealId).populate("seller").populate("buyer");

        if (!deal) return res.status(404).json({ message: "Deal not found" });
        if (deal.seller._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the farmer can mark as delivered" });
        }
        if (deal.paymentStatus !== "held_in_escrow") return res.status(400).json({ message: "Funds are not in escrow" });

        if (deal.stripePaymentIntentId && deal.stripePaymentIntentId.startsWith("pi_mock_")) {
            deal.deliveryStatus = "delivered";
            deal.paymentStatus = "released";
            await deal.save();
            return res.json({ success: true, message: "Funds released (Mock Mode)", deal });
        }

        // CAPTURE == Actual movement of money from Buyer's CC to Farmer's Account
        const intent = await stripe.paymentIntents.capture(deal.stripePaymentIntentId);

        deal.deliveryStatus = "delivered";
        deal.paymentStatus = "released";
        await deal.save();

        res.json({ success: true, message: "Funds successfully captured and released", deal });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
