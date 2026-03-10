const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Auction = require("../src/models/Auction");

require("dotenv").config();

let farmerToken, buyerToken, otherFarmerToken;
let farmerId, buyerId, auctionId;

describe("Auction Module Full Verification", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        try {
            await User.collection.dropIndexes();
        } catch (e) { /* Ignore if it doesn't exist */ }
        await User.deleteMany({ phone: { $in: ["3333333333", "4444444444", "5555555555"] } });
        await Auction.deleteMany({});

        // 1. Register & Login Farmer
        await request(app).post("/api/auth/send-otp").send({ phone: "3333333333" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "3333333333", otp: (await User.findOne({ phone: "3333333333" })).otp });
        const fRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "3333333333", pin: "1234", name: "Farmer Two", role: "farmer"
        });
        farmerId = fRes.body.user._id;
        farmerToken = fRes.body.token;

        // 2. Register & Login Buyer
        await request(app).post("/api/auth/send-otp").send({ phone: "4444444444" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "4444444444", otp: (await User.findOne({ phone: "4444444444" })).otp });
        const bRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "4444444444", pin: "1234", name: "Buyer Two", role: "buyer"
        });
        buyerId = bRes.body.user._id;
        buyerToken = bRes.body.token;

        // 3. Register & Login Other Farmer (for negative test)
        await request(app).post("/api/auth/send-otp").send({ phone: "5555555555" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "5555555555", otp: (await User.findOne({ phone: "5555555555" })).otp });
        const ofRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "5555555555", pin: "1234", name: "Farmer Three", role: "farmer"
        });
        otherFarmerToken = ofRes.body.token;

        // Verify Users
        await User.updateMany({}, { otpVerified: true });
    }, 30000);

    afterAll(async () => {
        await User.deleteMany({ phone: { $in: ["3333333333", "4444444444", "5555555555"] } });
        await Auction.deleteMany({});
        await mongoose.connection.close();
    });

    test("Farmer can create and close an auction (Happy Path)", async () => {
        // Create
        const createRes = await request(app).post("/api/auctions")
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({ crop: "Corn X", quantityKg: 500, basePrice: 15 });

        expect(createRes.statusCode).toBe(201);
        auctionId = createRes.body.data._id;

        // Simulate a bid properly pushed to DB (since we are testing REST API logic not sockets here)
        const auction = await Auction.findById(auctionId);
        auction.bids.push({ buyerId: buyerId, amount: 20 });
        await auction.save();

        // Close
        const closeRes = await request(app).post(`/api/auctions/${auctionId}/close`)
            .set("Authorization", `Bearer ${farmerToken}`);

        expect(closeRes.statusCode).toBe(200);
        expect(closeRes.body.success).toBe(true);
        expect(closeRes.body.winningBid).toBeDefined();
        expect(closeRes.body.winningBid.amount).toBe(20);
        expect(closeRes.body.winningBid.buyerId.toString()).toBe(buyerId.toString());

        // Verify status in DB
        const updatedAuction = await Auction.findById(auctionId);
        expect(updatedAuction.status).toBe("CLOSED");
    });

    test("Other farmer cannot close someone else's auction (Security)", async () => {
        // Create another auction
        const createRes = await request(app).post("/api/auctions")
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({ crop: "Corn Y", quantityKg: 100, basePrice: 10 });

        const otherAuctionId = createRes.body.data._id;

        // Try to close with WRONG token
        const closeRes = await request(app).post(`/api/auctions/${otherAuctionId}/close`)
            .set("Authorization", `Bearer ${otherFarmerToken}`); // Different farmer

        expect(closeRes.statusCode).toBe(403);
    });
});
