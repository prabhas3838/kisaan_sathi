const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

require("dotenv").config();

let farmerToken, adminToken;
let farmerId;

describe("User Verification Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        try { await User.collection.dropIndexes(); } catch (e) { }

        await User.deleteMany({ phone: { $in: ["6666666666", "7777777777"] } });

        // Register Farmer
        await request(app).post("/api/auth/send-otp").send({ phone: "6666666666" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "6666666666", otp: (await User.findOne({ phone: "6666666666" })).otp });
        const farmerRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "6666666666", pin: "1234", name: "Farmer Verify", role: "farmer"
        });
        farmerId = farmerRes.body.user._id;
        farmerToken = farmerRes.body.token;

        // Register & Create Admin
        await request(app).post("/api/auth/send-otp").send({ phone: "7777777777" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "7777777777", otp: (await User.findOne({ phone: "7777777777" })).otp });
        const adminRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "7777777777", pin: "1234", name: "Admin User", role: "admin"
        });
        adminToken = adminRes.body.token;

        await User.findByIdAndUpdate(adminRes.body.user._id, { role: "admin", otpVerified: true });
    });

    afterAll(async () => {
        await User.deleteMany({ phone: { $in: ["6666666666", "7777777777"] } });
        await mongoose.connection.close();
    });

    test("Farmer can submit verification request", async () => {
        const res = await request(app).post("/api/users/verify")
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({
                aadhaarNumber: "123412341234",
                panNumber: "ABCDE1234F"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain("submitted");

        // Verify pending status in DB
        const user = await User.findById(farmerId);
        expect(user.verificationStatus).toBe("pending");
        expect(user.aadhaarNumber).toBe("123412341234");
    });

    test("Admin can approve verification", async () => {
        const res = await request(app).put(`/api/users/${farmerId}/verify-status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                status: "approved",
                comment: "All looks good"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.verificationStatus).toBe("approved");

        const user = await User.findById(farmerId);
        expect(user.verificationStatus).toBe("approved");
    });

    test("Profile should show verification status", async () => {
        const res = await request(app).get("/api/users/profile")
            .set("Authorization", `Bearer ${farmerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user.verificationStatus).toBe("approved");
    });
});
