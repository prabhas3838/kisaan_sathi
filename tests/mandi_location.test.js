const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const MandiPrice = require("../src/models/MandiPrice");
const User = require("../src/models/User");

require("dotenv").config();

let token;

// Coordinates
const DELHI_COORDS = [77.1025, 28.7041];
const MUMBAI_COORDS = [72.8777, 19.0760];
const FAR_DELHI_COORDS = [77.2000, 28.5000]; // ~25km from Delhi center

describe("Nearby Mandi Search Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "5556667777" });

        try { await User.collection.dropIndexes(); } catch (e) { }

        // Register User
        await request(app).post("/api/auth/send-otp").send({ phone: "5556667777" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "5556667777", otp: (await User.findOne({ phone: "5556667777" })).otp });
        const login = await request(app).post("/api/auth/signup-complete").send({
            phone: "5556667777", pin: "1234", name: "Geo User", role: "farmer"
        });

        token = login.body.token;

        // Verify User for access
        await User.updateOne({ phone: "5556667777" }, { otpVerified: true });
    });

    afterAll(async () => {
        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "5556667777" });
        await mongoose.connection.close();
    });

    test("Seed Mandi Data with Locations", async () => {
        // Direct DB insertion to bypass controller (if controller restricted) or use add endpoint
        // Using DB directly for precise coordinate control
        await MandiPrice.create([
            {
                crop: "Wheat",
                mandi: "Azadpur Mandi (Delhi)",
                locationName: "Delhi",
                location: { type: "Point", coordinates: DELHI_COORDS },
                pricePerQuintal: 2000
            },
            {
                crop: "Rice",
                mandi: "APMC Mumbai",
                locationName: "Mumbai",
                location: { type: "Point", coordinates: MUMBAI_COORDS },
                pricePerQuintal: 3000
            }
        ]);
    });

    test("Find Mandi near Delhi (should return Azadpur)", async () => {
        const res = await request(app).get(`/api/mandi/nearby?lat=${DELHI_COORDS[1]}&lng=${DELHI_COORDS[0]}&dist=10`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].mandiId).toBe("Azadpur Mandi (Delhi)");
        expect(res.body.data[0].distanceKm).toBeLessThan(100); // Updated to test distanceKm instead of raw object
    });

    test("Find Mandi from far away (should be empty)", async () => {
        // Search from Chennai coordinates
        const CHENNAI_LAT = 13.0827;
        const CHENNAI_LNG = 80.2707;

        const res = await request(app).get(`/api/mandi/nearby?lat=${CHENNAI_LAT}&lng=${CHENNAI_LNG}&dist=500`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(0);
    });

    test("Find Mandi with larger radius (should include Delhi from outskirts)", async () => {
        // Search from 25km away with 50km radius
        const res = await request(app).get(`/api/mandi/nearby?lat=${FAR_DELHI_COORDS[1]}&lng=${FAR_DELHI_COORDS[0]}&dist=50`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].mandiId).toBe("Azadpur Mandi (Delhi)");
    });
});
