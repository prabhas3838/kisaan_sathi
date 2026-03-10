const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phone: { type: String, required: true },
    issueType: { type: String, required: true },
    status: { type: String, enum: ["pending", "in-progress", "resolved"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
