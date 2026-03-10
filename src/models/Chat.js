const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String, // Text message or Image URL
        required: true
    },
    type: {
        type: String,
        enum: ["text", "image"],
        default: "text"
    },
    read: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Deal" // Optional: Link to a specific Deal/Negotiation
    },
    messages: [messageSchema],
    lastMessage: {
        type: Date,
        default: Date.now
    }
});

chatSchema.index({ participants: 1 });

module.exports = mongoose.model("Chat", chatSchema);
