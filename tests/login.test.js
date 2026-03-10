const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

require("dotenv").config();

describe("Auth Module - OTP & PIN Login", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await User.deleteMany({ phone: "8888888888" });
    }, 30000);

    afterAll(async () => {
        await mongoose.connection.close();
    });

    let otp;

    test("1. Send OTP (Simulated)", async () => {
        const res = await request(app).post("/api/auth/send-otp").send({
            phone: "8888888888"
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.otp).toBeDefined();
        otp = res.body.otp; // Capture OTP for next step
    });

    test("2. Verify OTP", async () => {
        const res = await request(app).post("/api/auth/verify-otp").send({
            phone: "8888888888",
            otp: otp
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.otpVerified).toBe(true);
    });

    test("3. Complete Signup (Set PIN)", async () => {
        const res = await request(app).post("/api/auth/signup-complete").send({
            phone: "8888888888",
            name: "Test User",
            role: "farmer",
            pin: "1234" // PIN instead of password
        });

        expect(res.statusCode).toBe(201); // Created
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe("farmer");
    });

    test("4. Login with Correct PIN", async () => {
        const res = await request(app).post("/api/auth/login").send({
            phone: "8888888888",
            pin: "1234"
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
    });

    test("5. Login with Incorrect PIN", async () => {
        const res = await request(app).post("/api/auth/login").send({
            phone: "8888888888",
            pin: "0000"
        });

        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});
