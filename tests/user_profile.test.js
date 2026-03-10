const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

require("dotenv").config();

let token, userId;
const USER_PHONE = "1112223333";

describe("User Profile Management Module", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        try { await User.collection.dropIndexes(); } catch (e) { }

        await User.deleteMany({ phone: USER_PHONE });

        // Register & Login Using OTP
        await request(app).post("/api/auth/send-otp").send({ phone: USER_PHONE });
        await request(app).post("/api/auth/verify-otp").send({ phone: USER_PHONE, otp: (await User.findOne({ phone: USER_PHONE })).otp });
        const res = await request(app).post("/api/auth/signup-complete").send({
            phone: USER_PHONE, pin: "1234", name: "Profile User", role: "farmer"
        });

        userId = res.body.user._id;
        token = res.body.token;

        await User.updateOne({ phone: USER_PHONE }, { otpVerified: true });
    });

    afterAll(async () => {
        await User.deleteMany({ phone: USER_PHONE });
        await mongoose.connection.close();
    });

    test("Update Profile (Name, Language)", async () => {
        const res = await request(app).put("/api/users/profile")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Updated Name",
                language: "hi" // Hindi
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.name).toBe("Updated Name");
        expect(res.body.user.language).toBe("hi");

        // Verify in DB
        const user = await User.findById(userId);
        expect(user.name).toBe("Updated Name");
        expect(user.language).toBe("hi");
    });

    test("Get Public Profile (Restricted Data)", async () => {
        const res = await request(app).get(`/api/users/public/${userId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user.name).toBe("Updated Name");
        expect(res.body.user.role).toBe("farmer");

        // Ensure sensitive data is NOT returned
        expect(res.body.user.password).toBeUndefined();
        expect(res.body.user.otp).toBeUndefined();
        expect(res.body.user.panNumber).toBeUndefined();
        expect(res.body.user.aadhaarNumber).toBeUndefined();
    });
});
