const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        farmerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        cropType: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        category: {
            type: String,
            enum: ["Grains", "Vegetables", "Fruits", "Spices", "Other"],
            default: "Other"
        },
        status: {
            type: String,
            enum: ["DRAFT", "ACTIVE", "SOLD", "DEACTIVATED"],
            default: "DRAFT"
        },
        harvestDate: {
            type: Date
        },
        location: {
            type: String // Captured from User's location at time of listing or custom
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
