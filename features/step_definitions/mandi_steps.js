const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const MandiPrice = require('../../src/models/MandiPrice');
const User = require('../../src/models/User');

let expect;
let adminToken;
let adminUserId;
let response;

Before(async function () {
    const chai = await import('chai');
    expect = chai.expect;

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }
    // Clean up test data
    await MandiPrice.deleteMany({});
    await User.deleteMany({ phone: "9999999999" });
});

// --- AUTH ---
Given('an admin is logged in', { timeout: 10000 }, async function () {
    await request(app).post("/api/auth/send-otp").send({ phone: "9999999999" });
    const user = await User.findOne({ phone: "9999999999" });
    const otp = user.otp;
    await request(app).post("/api/auth/verify-otp").send({ phone: "9999999999", otp });
    const res = await request(app).post("/api/auth/signup-complete").send({
        phone: "9999999999", name: "Admin User", role: "admin", pin: "1234"
    });
    adminToken = res.body.token;
    adminUserId = res.body.user._id;

    if (!adminToken) {
        const loginRes = await request(app).post("/api/auth/login").send({ phone: "9999999999", pin: "1234" });
        adminToken = loginRes.body.token;
        adminUserId = loginRes.body.user._id;
    }
    expect(adminToken).to.not.be.undefined;
});

// --- ADD PRICE : MANUAL ---
When('the admin adds a price for {string} at {string} with price {int} per quintal at location {float}, {float}', async function (crop, mandi, price, lat, lng) {
    response = await request(app)
        .post('/api/mandi')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            crop, mandi, pricePerQuintal: price, locationName: mandi,
            location: { type: "Point", coordinates: [lng, lat] }
        });
});

When('the admin attempts to add a price without specifying the crop', async function () {
    response = await request(app)
        .post('/api/mandi')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            mandi: "Invalid Mandi", pricePerQuintal: 100, locationName: "Test",
            location: { type: "Point", coordinates: [77.0, 28.0] }
        });
});

// --- SEED : BACKGROUND ---
Given('the admin has added a price for {string} at {string} with price {int} per quintal at location {float}, {float}', async function (crop, mandi, price, lat, lng) {
    await request(app)
        .post('/api/mandi')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            crop, mandi, pricePerQuintal: price, locationName: mandi,
            location: { type: "Point", coordinates: [lng, lat] }
        });
});


// --- USER LOCATION SETUP ---
Given('a user is at location {float}, {float}', function (lat, lng) {
    this.userLocation = { lat, lng };
});

Given('a user has a profile location set to {float}, {float}', async function (lat, lng) {
    // Update the logged-in admin's profile for simplicity
    const user = await User.findById(adminUserId);
    user.locationCoordinates = {
        type: "Point",
        coordinates: [lng, lat]
    };
    await user.save();
});


// --- SEARCH EXECUTION ---
When('the user searches for mandis within {int} km', async function (dist) {
    const { lat, lng } = this.userLocation;
    response = await request(app)
        .get(`/api/mandi/nearby?lat=${lat}&lng=${lng}&dist=${dist}`)
        .set('Authorization', `Bearer ${adminToken}`);
});

When('the user searches for nearby mandis without providing latitude and longitude', async function () {
    response = await request(app)
        .get(`/api/mandi/nearby`)
        .set('Authorization', `Bearer ${adminToken}`);
});

When('the user searches for {string} sorted by price descending', async function (crop) {
    response = await request(app)
        .get(`/api/mandi?crop=${crop}&sort=price_desc`)
        .set('Authorization', `Bearer ${adminToken}`);
});

When('the user filters prices for crop {string}', async function (crop) {
    response = await request(app)
        .get(`/api/mandi?crop=${crop}`)
        .set('Authorization', `Bearer ${adminToken}`);
});

When('the user filters prices for location {string}', async function (location) {
    response = await request(app)
        .get(`/api/mandi?location=${location}`)
        .set('Authorization', `Bearer ${adminToken}`);
});


// --- VALIDATIONS ---
Then('the response status should be {int}', function (statusCode) {
    expect(response.status).to.equal(statusCode);
});

Then('the response status should be {int} or {int}', function (code1, code2) {
    expect(response.status).to.be.oneOf([code1, code2]);
});

Then('the response should confirm success', function () {
    expect(response.body.success).to.be.true;
});

Then('the returned data should contain {string}', function (mandiName) {
    expect(response.body.data.mandi).to.equal(mandiName);
});

Then('the error message should indicate validation failure', function () {
    expect(response.body.error).to.include("validation failed");
});

Then('the error message should contain {string}', function (msg) {
    expect(response.body.message || response.body.error).to.include(msg);
});

Then('the result list should contain {string}', function (mandiName) {
    const found = response.body.data.some(m => m._id === mandiName);
    expect(found).to.be.true;
});

Then('the result list should be empty', function () {
    expect(response.body.data).to.be.an('array').that.is.empty;
});

Then('the distance to {string} should be less than {int} km', function (mandiName, dist) {
    const item = response.body.data.find(m => m._id === mandiName);
    expect(item).to.not.be.undefined;
    expect(item.distance / 1000).to.be.lessThan(dist);
});

Then('the first result should be {string}', function (mandiName) {
    expect(response.body.data[0]._id).to.equal(mandiName);
});

Then('the second result should be {string}', function (mandiName) {
    expect(response.body.data[1]._id).to.equal(mandiName);
});

Then('the response data should include {string} at {string}', function (cropName, mandiName) {
    const found = response.body.data.some(m => m.crop === cropName && m.mandi === mandiName);
    expect(found).to.be.true;
});

Then('the response data should include {string}', function (mandiName) {
    const found = response.body.data.some(m => m.mandi === mandiName || m.locationName.includes(mandiName) || m.mandi.includes(mandiName));
    expect(found).to.be.true;
});

Then('the first result should be {string} with price {int}', function (mandiName, price) {
    const first = response.body.data[0];
    expect(first.mandi).to.equal(mandiName);
    expect(first.pricePerQuintal).to.equal(price);
});

Then('the second result should be {string} with price {int}', function (mandiName, price) {
    const second = response.body.data[1];
    expect(second.mandi).to.equal(mandiName);
    expect(second.pricePerQuintal).to.equal(price);
});
