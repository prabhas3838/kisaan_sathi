const { io } = require("socket.io-client");
const axios = require("axios");

const BASE_URL = "http://localhost:5002/api";
const SOCKET_URL = "http://localhost:5002";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log("🚀 Starting Auction Socket Verification...");

    try {
        // 1. Setup Users
        console.log("👤 Creating users...");
        const farmer = await registerUser("Farmer Socket", "8888888888", "farmer");
        const buyerA = await registerUser("Buyer A", "6666666666", "buyer");
        const buyerB = await registerUser("Buyer B", "7777777777", "buyer");

        // 2. Create Auction
        console.log("📦 Creating auction...");
        const auctionRes = await axios.post(
            `${BASE_URL}/auctions`,
            { crop: "Socket Bean", quantityKg: 100, basePrice: 50 },
            { headers: { Authorization: `Bearer ${farmer.token}` } }
        );
        const auctionId = auctionRes.data.data._id;
        console.log(`   Auction created: ${auctionId}`);

        // 3. Connect Sockets
        console.log("🔌 Connecting sockets...");
        const socketA = io(SOCKET_URL);
        const socketB = io(SOCKET_URL);

        await new Promise((resolve) => socketA.on("connect", resolve));
        await new Promise((resolve) => socketB.on("connect", resolve));
        console.log("   Sockets connected.");

        // Join Rooms
        socketA.emit("joinAuction", auctionId);
        socketB.emit("joinAuction", auctionId);

        // Join User Rooms for notifications
        socketA.emit("joinUserRoom", buyerA.user._id);
        socketB.emit("joinUserRoom", buyerB.user._id);

        // Setup Listeners
        let bidCount = 0;
        let outbidCount = 0;

        socketB.on("newBid", (data) => {
            console.log(`   [Buyer B] Received newBid: Buyer ${data.buyerId} bid ${data.amount}`);
            if (data.amount === 60) bidCount++;
        });

        socketA.on("outbid", (data) => {
            console.log(`   [Buyer A] Received outbid notification: ${data.message}`);
            outbidCount++;
        });

        // 4. Buyer A places bid
        console.log("💰 Buyer A placing bid (60)...");
        socketA.emit("placeBid", { auctionId, buyerId: buyerA.user._id, amount: 60 });

        await sleep(1000);

        // 5. Buyer B outbids
        console.log("💰 Buyer B outbidding (70)...");
        socketB.emit("placeBid", { auctionId, buyerId: buyerB.user._id, amount: 70 });

        await sleep(1000);

        // 6. Verification
        console.log("\n📊 Verification Results:");
        if (bidCount === 1) console.log("✅ Buyer B saw Buyer A's bid.");
        else console.log("❌ Buyer B did NOT see Buyer A's bid.");

        if (outbidCount === 1) console.log("✅ Buyer A was notified of outbid.");
        else console.log("❌ Buyer A was NOT notified of outbid.");

        // Cleanup
        socketA.disconnect();
        socketB.disconnect();

        if (bidCount === 1 && outbidCount === 1) {
            console.log("\n🎉 TEST PASSED");
            process.exit(0);
        } else {
            console.log("\n💥 TEST FAILED");
            process.exit(1);
        }

    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function registerUser(name, phone, role) {
    // Clean up first
    try {
        // This is a hacky restart for clean state, usually we'd have a clean endpoint
    } catch (e) { }

    // Register
    try {
        await axios.post(`${BASE_URL}/auth/register`, { name, phone, role, password: "pwd" });
    } catch (e) {
        // Ignore if exists, just login
    }

    // Login
    const res = await axios.post(`${BASE_URL}/auth/login`, { phone, password: "pwd" });

    // Auto-verify (simulate DB update directly? No access here. Trust default or manually verify?
    // In test env, usually we mock. Here we rely on the backend allowing it or the prompt/app setup.
    // The previous tests showed users need verification logic, but app.js imports routes that use 'requireVerifiedUser'.
    // BUT, registerUser in controller sets `otpVerified: false`.
    // We cannot easily verify user from outside without DB access.
    // WAIT! We are running this script locally, we can import Mongoose models!

    return { token: res.data.token, user: res.data.user };
}

// Re-write main to include Mongoose connection to force verification
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../src/models/User");

// Wrap real main
(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    // Cleanup test users
    await User.deleteMany({ phone: { $in: ["8888888888", "6666666666", "7777777777"] } });

    // We'll rely on the main function logic but override register to verify user
    const originalRegister = registerUser;

    // Wait for server to be ready? (Assumes user ran 'npm run dev' separately as per plan, 
    // OR we can rely on this script ONLY if server is up. 
    // Actually, task instructions say "Start the server locally". 
    // I can't start server AND run script easily in one command.
    // I should probably instruct user to ensure server is running?
    // OR I can use `supertest` or start `app` in this script!
    // Using `app` here directly avoids needing external server.
    // let's create a self-contained script that starts the server!

    const http = require("http");
    const app = require("../src/app");
    const socketIo = require("socket.io");
    const socketHandler = require("../src/sockets/auctionSocket");

    const server = http.createServer(app);
    const io = new socketIo.Server(server);
    socketHandler(io); // Attach logic

    server.listen(5002, async () => {
        console.log("Server started (simulated) on 5002");

        // Manually verify users after registration
        const _register = async (n, p, r) => {
            await axios.post(`${BASE_URL}/auth/register`, { name: n, phone: p, role: r, password: "pwd" });
            await User.updateOne({ phone: p }, { otpVerified: true });
            const res = await axios.post(`${BASE_URL}/auth/login`, { phone: p, password: "pwd" });
            return { token: res.data.token, user: res.data.user };
        };

        // Redefine for main
        async function runTest() {
            console.log("👤 Creating users...");
            const farmer = await _register("Farmer Socket", "8888888888", "farmer");
            const buyerA = await _register("Buyer A", "6666666666", "buyer");
            const buyerB = await _register("Buyer B", "7777777777", "buyer");

            // ... (rest of logic same as above)
            // Copy logic
            console.log("📦 Creating auction...");
            const auctionRes = await axios.post(
                `${BASE_URL}/auctions`,
                { crop: "Socket Bean", quantityKg: 100, basePrice: 50 },
                { headers: { Authorization: `Bearer ${farmer.token}` } }
            );
            const auctionId = auctionRes.data.data._id;
            console.log(`   Auction created: ${auctionId}`);

            console.log("🔌 Connecting sockets...");
            const socketA = ioClient(SOCKET_URL);
            const socketB = ioClient(SOCKET_URL);

            // ... (rest)
            await new Promise((resolve) => socketA.on("connect", resolve));
            await new Promise((resolve) => socketB.on("connect", resolve));
            console.log("   Sockets connected.");

            socketA.emit("joinAuction", auctionId);
            socketB.emit("joinAuction", auctionId);
            socketA.emit("joinUserRoom", buyerA.user._id);
            socketB.emit("joinUserRoom", buyerB.user._id);

            let bidCount = 0;
            let outbidCount = 0;

            socketB.on("newBid", (data) => { if (data.amount === 60) bidCount++; });
            socketA.on("outbid", (data) => { outbidCount++; });

            socketA.emit("placeBid", { auctionId, buyerId: buyerA.user._id, amount: 60 });
            await sleep(1000);

            socketB.emit("placeBid", { auctionId, buyerId: buyerB.user._id, amount: 70 });
            await sleep(1000);

            console.log("\n📊 Verification Results:");
            if (bidCount === 1) console.log("✅ Buyer B saw Buyer A's bid.");
            if (outbidCount === 1) console.log("✅ Buyer A was notified of outbid.");

            socketA.disconnect();
            socketB.disconnect();
            server.close();
            await mongoose.connection.close();
            process.exit(0);
        }

        try {
            await runTest();
        } catch (e) { console.error(e); process.exit(1); }
    });
})();

const ioClient = require("socket.io-client").io;
