const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const MandiPrice = require("../src/models/MandiPrice");
const User = require("../src/models/User");

require("dotenv").config();

let token;

// Coordinates (dummy for this test)
const COORDS = [77.1025, 28.7041];

describe("Mandi Price Comparison Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        try { await User.collection.dropIndexes(); } catch (e) { }

        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "9990001111" });

        // Register & Login using OTP Flow
        await request(app).post("/api/auth/send-otp").send({ phone: "9990001111" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "9990001111", otp: (await User.findOne({ phone: "9990001111" })).otp });

        const registerRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "9990001111", pin: "1234", name: "Price User", role: "farmer"
        });
        token = registerRes.body.token;

        await User.updateOne({ phone: "9990001111" }, { otpVerified: true });
    });

    afterAll(async () => {
        await MandiPrice.deleteMany({});
        await User.deleteMany({ phone: "9990001111" });
        await mongoose.connection.close();
    });

    test("Seed Price Data", async () => {
        await MandiPrice.create([
            {
                crop: "Tomato",
                mandi: "Mandi Low",
                locationName: "Loc A",
                location: { type: "Point", coordinates: COORDS },
                pricePerQuintal: 1000
            },
            {
                crop: "Tomato",
                mandi: "Mandi High",
                locationName: "Loc B",
                location: { type: "Point", coordinates: COORDS },
                pricePerQuintal: 3000
            },
            {
                crop: "Tomato",
                mandi: "Mandi Mid",
                locationName: "Loc C",
                location: { type: "Point", coordinates: COORDS },
                pricePerQuintal: 2000
            }
        ]);
    });

    test("Sort Prices High-to-Low", async () => {
        const res = await request(app).get("/api/mandi?crop=Tomato&sort=price_desc")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.count).toBe(3);

        // Check Order
        expect(res.body.data[0].pricePerQuintal).toBe(3000);
        expect(res.body.data[0].mandi).toBe("Mandi High");

        expect(res.body.data[1].pricePerQuintal).toBe(2000);
        expect(res.body.data[2].pricePerQuintal).toBe(1000);
    });

    test("Check for Best Price Indicator", async () => {
        const res = await request(app).get("/api/mandi?crop=Tomato&sort=price_desc")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);

        // First item should be best price
        expect(res.body.data[0].isBestPrice).toBe(true);

        // Others should not
        expect(res.body.data[1].isBestPrice).toBe(false);
    });
});
