const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Inventory = require("../src/models/Inventory");

require("dotenv").config();

let server;
let farmerToken;
let farmerId;

describe("Inventory Module", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI);
        // Clean up
        await User.deleteMany({ phone: "9999999999" });
        await Inventory.deleteMany({});

        try { await User.collection.dropIndexes(); } catch (e) { }

        // Create Farmer via OTP Action
        await request(app).post("/api/auth/send-otp").send({ phone: "9999999999" });
        await request(app).post("/api/auth/verify-otp").send({ phone: "9999999999", otp: (await User.findOne({ phone: "9999999999" })).otp });

        const verifyRes = await request(app).post("/api/auth/signup-complete").send({
            phone: "9999999999", pin: "1234", name: "Test Farmer", role: "farmer"
        });

        farmerToken = verifyRes.body.token;
        farmerId = verifyRes.body.user._id;
    }, 30000);

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test("Create Draft Listing (Task 5.1.2)", async () => {
        const res = await request(app)
            .post("/api/inventory")
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({
                cropType: "Wheat",
                quantity: 100,
                price: 20,
                status: "DRAFT"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.listing.status).toBe("DRAFT");
    });

    test("Create Active Listing with Location (Task 5.1.3)", async () => {
        const res = await request(app)
            .post("/api/inventory")
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({
                cropType: "Rice",
                quantity: 500,
                price: 50,
                harvestDate: new Date(),
                location: "Village A",
                status: "ACTIVE"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.listing.location).toBe("Village A");
    });

    test("Get Inventory (Active) (Task 5.2.1)", async () => {
        const res = await request(app)
            .get("/api/inventory/mine?status=ACTIVE")
            .set("Authorization", `Bearer ${farmerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].status).toBe("ACTIVE");
    });

    test("Edit Listing (Task 5.2.2)", async () => {
        // First get an item
        const listRes = await request(app)
            .get("/api/inventory/mine")
            .set("Authorization", `Bearer ${farmerToken}`);

        const itemId = listRes.body[0]._id;

        const res = await request(app)
            .put(`/api/inventory/${itemId}`)
            .set("Authorization", `Bearer ${farmerToken}`)
            .send({ quantity: 999 });

        expect(res.statusCode).toBe(200);
        expect(res.body.listing.quantity).toBe(999);
    });

    test("Deactivate Listing (Task 5.2.3)", async () => {
        // Create a temp item
        const createRes = await request(app).post("/api/inventory").set("Authorization", `Bearer ${farmerToken}`).send({
            cropType: "Temp", quantity: 1, price: 1
        });
        const itemId = createRes.body.listing._id;

        const res = await request(app)
            .delete(`/api/inventory/${itemId}`)
            .set("Authorization", `Bearer ${farmerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.listing.status).toBe("DEACTIVATED");
    });

    test("Expiry Logic (Task 5.3.2)", async () => {
        // Create an old listing
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10); // 10 days old harvest

        const createRes = await request(app).post("/api/inventory").set("Authorization", `Bearer ${farmerToken}`).send({
            cropType: "Old Apple", quantity: 1, price: 1, harvestDate: oldDate, status: "ACTIVE"
        });

        const res = await request(app)
            .get("/api/inventory/mine")
            .set("Authorization", `Bearer ${farmerToken}`);

        const item = res.body.find(i => i.cropType === "Old Apple");
        expect(item.expiresSoon).toBe(true);
    });

});
