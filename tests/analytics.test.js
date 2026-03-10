const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const MandiPrice = require("../src/models/MandiPrice");
const User = require("../src/models/User");

require("dotenv").config();

let token;

describe("Epic 4: AI Predictive Analytics Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        try { await User.collection.dropIndexes(); } catch (e) { }
        try { await MandiPrice.collection.dropIndexes(); } catch (e) { }

        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "8881112222" });

        // Directly register user to DB to bypass API auth complexities in unit test
        const user = await User.create({
            name: "Analytics Farmer",
            phone: "8881112222",
            role: "farmer",
            password: "pwd",
            otpVerified: true
        });

        // Generate token directly
        const jwt = require("jsonwebtoken");
        token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        // Seed Mock Historical Data locally for tests
        const DUMMY_HISTORICAL_DATA = [
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2050, offsetDays: -7 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2065, offsetDays: -6 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2060, offsetDays: -5 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2080, offsetDays: -4 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2095, offsetDays: -3 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2110, offsetDays: -2 },
            { crop: "Wheat", mandi: "Azadpur Mandi (Delhi)", locationName: "Delhi", pricePerQuintal: 2105, offsetDays: -1 }
        ];
        const now = new Date();
        const records = DUMMY_HISTORICAL_DATA.map(data => {
            const date = new Date(now);
            date.setDate(now.getDate() + data.offsetDays);
            return { ...data, location: { type: "Point", coordinates: [0, 0] }, date: date };
        });
        await MandiPrice.insertMany(records);
    });

    afterAll(async () => {
        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "8881112222" });
        await mongoose.connection.close();
    });

    test("TC1: Valid Request - Common Crop (Wheat, Azadpur)", async () => {
        const res = await request(app)
            .get("/api/analytics/price-forecast?crop=Wheat&mandi=Azadpur&days=5")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const data = res.body.data;
        expect(data.crop).toBe("Wheat");
        expect(data.mandi).toBe("Azadpur");

        // Check Synthesizer Array (30 days)
        expect(data.historical).toBeDefined();
        expect(data.historical.length).toBe(30);

        // Check Predicted Array (5 days)
        expect(data.predicted).toBeDefined();
        expect(data.predicted.length).toBe(5);

        // Check Recommendation
        expect(data.recommendation).toBeDefined();
        expect(typeof data.recommendation).toBe("string");
    });

    test("TC2: Cache Hit Verification - Same Request Instantly Returns", async () => {
        const startTime = Date.now();
        const res = await request(app)
            .get("/api/analytics/price-forecast?crop=Wheat&mandi=Azadpur&days=5")
            .set("Authorization", `Bearer ${token}`);
        const duration = Date.now() - startTime;

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        // Should be extremely fast because it bypasses Python
        expect(duration).toBeLessThan(500);
    });

    test("TC3: Valid Request - Different Crop Baseline (Tomato, Delhi)", async () => {
        const res = await request(app)
            .get("/api/analytics/price-forecast?crop=Tomato&mandi=Delhi&days=7")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.predicted.length).toBe(7);
        // Tomatoes baseline is lower than wheat, so prices should generally be lower
        expect(res.body.data.predicted[0].price).toBeLessThan(2000);
    });

    test("TC4: Valid Request - Fallback/Unknown Crop (Dragonfruit, Mumbai)", async () => {
        const res = await request(app)
            .get("/api/analytics/price-forecast?crop=Dragonfruit&mandi=Mumbai")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        // Should default to base generator of 2000 INR
        expect(res.body.data.historical[0].price).toBeGreaterThan(1800);
    });

    test("TC5: Edge Case - Requesting Long Forecast (30 Days)", async () => {
        const res = await request(app)
            .get("/api/analytics/price-forecast?crop=Rice&mandi=Kolkata&days=30")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.predicted.length).toBe(30);
    });

    test("TC6: Invalid Request - Missing Parameters", async () => {
        const res = await request(app)
            .get("/api/analytics/price-forecast")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain("required");
    });
});
