const Chat = require("../models/Chat");
const { createNotification } = require("../controllers/notificationController");
const User = require("../models/User");

module.exports = (io) => {
    const chatNamespace = io.of("/chat");

    chatNamespace.on("connection", (socket) => {
        console.log("User connected to Chat namespace:", socket.id);

        // Join a specific chat room (Chat ID)
        socket.on("joinChat", (chatId) => {
            socket.join(chatId);
            console.log(`Socket ${socket.id} joined Chat ${chatId}`);
        });

        // Join a specific deal room to receive live deal status updates
        socket.on("joinDeal", (dealRoomId) => {
            socket.join(dealRoomId);
            console.log(`Socket ${socket.id} joined Deal Room ${dealRoomId}`);
        });

        // Join personal user room to receive global messages
        socket.on("joinUserRoom", (userId) => {
            socket.join(`user_${userId}`);
            console.log(`Socket ${socket.id} joined personal room user_${userId}`);
        });

        // Send Message
        socket.on("sendMessage", async (data) => {
            try {
                const { chatId, senderId, content, type } = data;

                // 1. Save to DB
                const chat = await Chat.findByIdAndUpdate(
                    chatId,
                    {
                        $push: {
                            messages: {
                                sender: senderId,
                                content: content,
                                type: type || "text",
                                timestamp: new Date()
                            }
                        },
                        lastMessage: new Date()
                    },
                    { new: true }
                ).populate("participants");

                if (chat) {
                    const newMessage = chat.messages[chat.messages.length - 1];

                    // 2. Broadcast to Chat Room
                    chatNamespace.to(chatId).emit("newMessage", {
                        chatId,
                        message: newMessage
                    });

                    // 3. Notify recipient (Persistent & Real-time via main io)
                    const recipient = chat.participants.find(p => p._id.toString() !== senderId.toString());
                    const sender = chat.participants.find(p => p._id.toString() === senderId.toString());

                    // Broadcast to recipient's personal room for global unread counter updates
                    if (recipient) {
                        chatNamespace.to(`user_${recipient._id.toString()}`).emit("newMessage", {
                            chatId,
                            message: newMessage
                        });
                    }

                    if (recipient) {
                        await createNotification(io, {
                            userId: recipient._id,
                            role: recipient.role,
                            title: `New Message from ${sender?.name || "User"}`,
                            message: type === "image" ? "Sent an image" : content.substring(0, 50),
                            type: "chat",
                            relatedEntityId: chatId
                        });
                    }
                }

            } catch (err) {
                console.error("Error sending message:", err);
                socket.emit("error", "Failed to send message");
            }
        });

        // Mark Messages as Read
        socket.on("markRead", async (data) => {
            try {
                const { chatId, userId } = data;

                await Chat.updateOne(
                    { _id: chatId },
                    { $set: { "messages.$[elem].read": true } },
                    { arrayFilters: [{ "elem.sender": { $ne: userId } }] }
                );

                chatNamespace.to(chatId).emit("messagesRead", { chatId, readerId: userId });
            } catch (err) {
                console.error("Error marking read:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected from Chat:", socket.id);
        });
    });
};
