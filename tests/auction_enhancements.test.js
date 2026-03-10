const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Auction = require("../src/models/Auction");

require("dotenv").config();

let farmerToken, buyerToken;
let farmerId, buyerId;

describe("Auction Module Enhancements", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        try { await User.collection.dropIndexes(); } catch (e) { }

        // Clean up
        await User.deleteMany({ phone: { $in: ["1111111111", "2222222222"] } });
        await Auction.deleteMany({});

        // Register Farmer
        await request(app).post("/api/auth/send-otp").send({ phone: "1111111111" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "1111111111", otp: (await User.findOne({ phone: "1111111111" })).otp });
        const farmerRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "1111111111", pin: "1234", name: "Farmer One", role: "farmer"
        });
        farmerId = farmerRes.body.user._id;
        farmerToken = farmerRes.body.token;

        // Register Buyer
        await request(app).post("/api/auth/send-otp").send({ phone: "2222222222" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "2222222222", otp: (await User.findOne({ phone: "2222222222" })).otp });
        const buyerRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "2222222222", pin: "1234", name: "Buyer One", role: "buyer"
        });
        buyerId = buyerRes.body.user._id;
        buyerToken = buyerRes.body.token;

        // Verify Users are Verified (simulated manually)
        await User.updateMany({}, { otpVerified: true });
    }, 30000);

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("Search & Filter Auctions (Task 6.1)", async () => {
        // Create 2 auctions
        await request(app).post("/api/auctions").set("Authorization", `Bearer ${farmerToken}`).send({
            crop: "Wheat A", quantityKg: 100, basePrice: 20
        });
        await request(app).post("/api/auctions").set("Authorization", `Bearer ${farmerToken}`).send({
            crop: "Rice B", quantityKg: 200, basePrice: 50
        });

        // Test Search
        const searchRes = await request(app).get("/api/auctions?search=Rice")
            .set("Authorization", `Bearer ${buyerToken}`);
        expect(searchRes.body.length).toBe(1);
        expect(searchRes.body[0].crop).toBe("Rice B");

        // Test Price Filter
        const priceRes = await request(app).get("/api/auctions?minPrice=30")
            .set("Authorization", `Bearer ${buyerToken}`);
        expect(priceRes.body.length).toBe(1);
        expect(priceRes.body[0].basePrice).toBe(50);
    });

    test("My Bids (Task 6.3)", async () => {
        // Find an auction
        const auctions = await request(app).get("/api/auctions").set("Authorization", `Bearer ${buyerToken}`);
        const auctionId = auctions.body[0]._id;

        // Since we cannot easily simulate sockets in generic API tests, we will MANUALLY push a bid to DB to verify the GET endpoint
        // Or if there is a REST endpoint for bidding? 
        // Checking codebase: Bidding is ONLY via Sockets.
        // So we will simulate a bid by updating the DB directly for this test purpose.

        const auction = await Auction.findById(auctionId);
        auction.bids.push({ buyerId: buyerId, amount: 60 });
        await auction.save();

        // Get My Bids
        const res = await request(app).get("/api/auctions/bids/mine")
            .set("Authorization", `Bearer ${buyerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]._id).toBe(auctionId);
    });
});
