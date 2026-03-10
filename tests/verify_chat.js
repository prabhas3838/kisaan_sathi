const { io } = require("socket.io-client");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Chat = require("../src/models/Chat");
require("dotenv").config();
const jwt = require("jsonwebtoken");

async function verifyChat() {
    console.log("==========================================");
    console.log("💬 INITIALIZING P2P CHAT VERIFICATION...");
    console.log("==========================================\n");

    let server;
    let buyerSocket, farmerSocket;

    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Ensure test users exist
        let farmer = await User.findOne({ phone: "8881112222" });
        if (!farmer) farmer = await User.create({ name: "Raju Farmer", phone: "8881112222", role: "farmer", password: "pwd", otpVerified: true });

        let buyer = await User.findOne({ phone: "9998887777" });
        if (!buyer) buyer = await User.create({ name: "BigCity Corp", phone: "9998887777", role: "buyer", password: "pwd", otpVerified: true });

        const farmerToken = jwt.sign({ id: farmer._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const buyerToken = jwt.sign({ id: buyer._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // 1. Create a Chat Room via REST API
        console.log("⏳ 1. Buyer initiates chat with Farmer via REST API...");
        const chatRes = await request(app)
            .post("/api/chat")
            .set("Authorization", `Bearer ${buyerToken}`)
            .send({ recipientId: farmer._id.toString() });

        if (!chatRes.body.success) {
            console.error("❌ BACKEND ERROR:", chatRes.body);
            throw new Error("Chat creation failed");
        }

        const chatId = chatRes.body.chat._id;
        console.log(`✅ Chat Room Created! ID: ${chatId}`);

        // Start local server to test Sockets
        const http = require("http");
        server = http.createServer(app);
        const { Server } = require("socket.io");
        const ioServer = new Server(server, { cors: { origin: "*" } });
        require("../src/sockets/chatSocket")(ioServer);

        await new Promise((resolve) => server.listen(0, resolve));
        const port = server.address().port;

        console.log("\n⏳ 2. Both users connect their WebSockets...");

        // 2. Connect Sockets to the /chat namespace
        buyerSocket = io(`http://localhost:${port}/chat`);
        farmerSocket = io(`http://localhost:${port}/chat`);

        await new Promise((resolve) => {
            let connectedCount = 0;
            const checkConnect = () => {
                connectedCount++;
                if (connectedCount === 2) resolve();
            };
            buyerSocket.on("connect", checkConnect);
            farmerSocket.on("connect", checkConnect);
        });

        console.log(`✅ WebSockets Connected!`);

        // 3. Join the Room
        buyerSocket.emit("joinChat", chatId);
        farmerSocket.emit("joinChat", chatId);

        // 4. Test Bidirectional Real-Time Chat
        console.log("\n⏳ 3. Testing Real-Time Bidirectional Messaging...");

        // Promise to capture Farmers receipt of Buyers message
        const farmerReceivedMsg = new Promise((resolve) => {
            farmerSocket.on("newMessage", (data) => {
                console.log(`\n👨‍🌾 [FARMER'S PHONE RECIEVED]: "${data.message.content}"`);
                resolve();
            });
        });

        // Promise to capture Buyers receipt of Farmers reply
        const buyerReceivedReply = new Promise((resolve) => {
            buyerSocket.on("newMessage", (data) => {
                console.log(`\n🏢 [BUYER'S DESKTOP RECIEVED]: "${data.message.content}"`);
                resolve();
            });
        });

        // Buyer sends first message
        console.log(`\n🏢 [BUYER SENDS]: "Hello Farmer Raju, is the Wheat ready?"`);
        buyerSocket.emit("sendMessage", {
            chatId: chatId,
            senderId: buyer._id.toString(),
            content: "Hello Farmer Raju, is the Wheat ready?"
        });

        await farmerReceivedMsg;

        // Farmer replies
        console.log(`\n👨‍🌾 [FARMER REPLIES]: "Yes sir, loading the truck now."`);
        farmerSocket.emit("sendMessage", {
            chatId: chatId,
            senderId: farmer._id.toString(),
            content: "Yes sir, loading the truck now."
        });

        await buyerReceivedReply;

        // 5. Verify DB Persistence
        const finalChat = await Chat.findById(chatId);
        console.log(`\n✅ Database Verified: Chat successfully saved ${finalChat.messages.length} messages permanently.`);

    } catch (err) {
        console.error("Script Error:", err);
    } finally {
        if (buyerSocket) buyerSocket.disconnect();
        if (farmerSocket) farmerSocket.disconnect();
        if (server) await new Promise(resolve => server.close(resolve));
        await mongoose.disconnect();
        console.log("\n==========================================");
        console.log("🏁 CHAT VERIFICATION COMPLETE!");
        console.log("==========================================\n");
    }
}

verifyChat();
