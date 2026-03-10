const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

require("dotenv").config();

let token;
const USER_PHONE = "8888889999";

describe("User Location Update Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        try { await User.collection.dropIndexes(); } catch (e) { }

        await User.deleteMany({ phone: USER_PHONE });

        // Register & Login using OTP Flow
        await request(app).post("/api/auth/send-otp").send({ phone: USER_PHONE });
        await request(app).post("/api/auth/verify-otp").send({ phone: USER_PHONE, otp: (await User.findOne({ phone: USER_PHONE })).otp });

        const registerRes = await request(app).post("/api/auth/signup-complete").send({
            phone: USER_PHONE, pin: "1234", name: "Loc User", role: "farmer"
        });
        token = registerRes.body.token;

        await User.updateOne({ phone: USER_PHONE }, { otpVerified: true });
    });

    afterAll(async () => {
        await User.deleteMany({ phone: USER_PHONE });
        await mongoose.connection.close();
    });

    test("Update Location with Coordinates", async () => {
        const res = await request(app).post("/api/users/location")
            .set("Authorization", `Bearer ${token}`)
            .send({
                lat: 28.7041,
                lng: 77.1025,
                address: "Azadpur, Delhi"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.location).toBe("Azadpur, Delhi");
        expect(res.body.user.coordinates[0]).toBe(77.1025); // Longitude
        expect(res.body.user.coordinates[1]).toBe(28.7041); // Latitude

        // Verify in DB
        const user = await User.findOne({ phone: USER_PHONE });
        expect(user.locationCoordinates.coordinates[0]).toBe(77.1025);
        expect(user.locationCoordinates.type).toBe("Point");
    });

    test("Fail if coords missing", async () => {
        const res = await request(app).post("/api/users/location")
            .set("Authorization", `Bearer ${token}`)
            .send({
                address: "Only Address"
            });

        expect(res.statusCode).toBe(400);
    });
});
