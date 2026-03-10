const SupportRequest = require("../models/SupportRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createRequest = async (req, res) => {
    try {
        const { phone, issueType } = req.body;
        const userId = req.user.id;

        const request = await SupportRequest.create({
            userId,
            phone,
            issueType,
        });

        // Notify Admins
        const admins = await User.find({ role: "admin" });
        const notificationPromises = admins.map((admin) =>
            Notification.create({
                userId: admin._id,
                title: "New Support Request",
                message: `Callback requested by ${req.user.name} for ${issueType}. Phone: ${phone}`,
                type: "support_request",
                relatedId: request._id,
            })
        );
        await Promise.all(notificationPromises);

        res.status(201).json({
            success: true,
            data: request,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRequests = async (req, res) => {
    try {
        const requests = await SupportRequest.find()
            .populate("userId", "name role email")
            .sort("-createdAt");
        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const request = await SupportRequest.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );
        if (!request) return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, data: request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
