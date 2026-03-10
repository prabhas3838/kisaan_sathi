const Chat = require("../models/Chat");
const User = require("../models/User");

// Get or Create Chat between two users (or by Deal ID)
exports.getOrCreateChat = async (req, res) => {
    try {
        const { recipientId, dealId } = req.body;
        const senderId = req.user._id;

        if (!recipientId) {
            return res.status(400).json({ message: "Recipient ID required" });
        }

        // Check if chat exists
        let query = {
            participants: { $all: [senderId, recipientId] }
        };

        if (dealId) {
            query.dealId = dealId;
        }

        let chat = await Chat.findOne(query).populate("participants", "name phone role");

        if (!chat) {
            chat = await Chat.create({
                participants: [senderId, recipientId],
                dealId: dealId || null,
                messages: []
            });
            chat = await chat.populate("participants", "name phone role");
        }

        res.json({ success: true, chat });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Chat History (Messages)
exports.getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId)
            .populate("participants", "name phone")
            .select("messages participants dealId");

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Ensure user is participant
        const isParticipant = chat.participants.some(p => p._id.toString() === req.user._id.toString());
        if (!isParticipant) {
            return res.status(403).json({ message: "Not authorized to view this chat" });
        }

        res.json({ success: true, chat });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all chats for the current user
exports.getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all chats where the user is a participant
        const chats = await Chat.find({ participants: userId })
            .populate("participants", "name phone role")
            .sort({ updatedAt: -1 });

        // Format to include lastMessage snippet
        const formattedChats = chats.map(chat => {
            const chatObj = chat.toObject();
            const lastMsg = chat.messages?.length ? chat.messages[chat.messages.length - 1] : null;
            return {
                ...chatObj,
                lastMessage: lastMsg?.content || "",
                lastMessageTime: lastMsg?.timestamp || chat.updatedAt
            };
        });

        res.json({ success: true, chats: formattedChats });
    } catch (err) {
        console.error("Error in getUserChats:", err);
        res.status(500).json({ error: err.message });
    }
};

// Upload Image (Mock for now - usually upload to S3/Cloudinary)
exports.uploadImage = async (req, res) => {
    // In a real app, middleware like 'multer' would handle file upload
    // and provide the URL. Here we simulate it.
    try {
        if (!req.body.imageUrl) {
            // If we were handling multipart/form-data, logic would differ.
            // For "mock", let's assume client sends a URL or base64.
            // If client sends actual file, we'd need multer.
            // Let's return a placeholder if not provided, for testing.
            return res.json({
                success: true,
                imageUrl: "https://via.placeholder.com/300?text=Uploaded+Image"
            });
        }
        res.json({ success: true, imageUrl: req.body.imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
