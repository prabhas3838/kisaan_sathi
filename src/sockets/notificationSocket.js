const jwt = require("jsonwebtoken");

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected to Notification System:", socket.id);

        /**
         * Joint a private room for specific user notifications
         * Expects { userId }
         */
        socket.on("joinNotifications", (data) => {
            const { userId } = data;
            if (userId) {
                socket.join(userId.toString());
                console.log(`Socket ${socket.id} joined notification room: ${userId}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected from notifications:", socket.id);
        });
    });
};
