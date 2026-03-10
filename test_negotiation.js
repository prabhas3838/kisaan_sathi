const axios = require("axios");

const BASE_URL = "http://localhost:5001/api";
const SELLER_PHONE = "7777777777";
const BUYER_PHONE = "8888888888";
const PIN = "123456";

async function loginOrRegister(phone, name, role) {
    try {
        // Try Login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, { phone, pin: PIN });
        return { token: loginRes.data.token, userId: loginRes.data.user._id };
    } catch (err) {
        if (err.response && err.response.status === 401) {
            // Register
            await axios.post(`${BASE_URL}/auth/send-otp`, { phone });
            // Verify (assuming mock OTP)
            // Need to catch the OTP from send response or use fixed if mock
            // Re-send to get OTP
            const otpRes = await axios.post(`${BASE_URL}/auth/send-otp`, { phone });
            const otp = otpRes.data.otp;

            await axios.post(`${BASE_URL}/auth/verify-otp`, { phone, otp });

            const regRes = await axios.post(`${BASE_URL}/auth/signup-complete`, {
                phone, pin: PIN, name, role
            });
            return { token: regRes.data.token, userId: regRes.data.user._id };
        }
        console.error("Auth Failed:", err.message);
        process.exit(1);
    }
}

async function run() {
    console.log("--- Testing Negotiation Logic ---");

    // 1. Setup Users
    console.log("\n1. Setting up Seller and Buyer...");
    const seller = await loginOrRegister(SELLER_PHONE, "Seller Sam", "farmer");
    const buyer = await loginOrRegister(BUYER_PHONE, "Buyer Bob", "buyer");
    console.log("   -> Seller ID:", seller.userId);
    console.log("   -> Buyer ID:", buyer.userId);

    // 2. Create Deal (Seller starts)
    console.log("\n2. Creating Deal (Seller -> Buyer)...");
    let dealId;
    try {
        const dealRes = await axios.post(`${BASE_URL}/deals`, {
            crop: "Wheat",
            buyerId: buyer.userId,
            originalPrice: 2000,
            quantityKg: 100
        }, { headers: { Authorization: `Bearer ${seller.token}` } });
        dealId = dealRes.data.deal._id;
        console.log("   -> Deal Created. Status:", dealRes.data.deal.status);
    } catch (e) { console.error("Create Deal Error:", e.response?.data || e.message); }

    // 3. Buyer Counters
    console.log("\n3. Buyer Counters with 1800...");
    try {
        const counterRes = await axios.post(`${BASE_URL}/deals/${dealId}/offer`, {
            price: 1800
        }, { headers: { Authorization: `Bearer ${buyer.token}` } });
        console.log("   -> Counter Sent. Current Offer:", counterRes.data.deal.currentOffer);
        console.log("   -> Status:", counterRes.data.deal.status);
    } catch (e) { console.error("Counter Error:", e.response?.data || e.message); }

    // 4. Seller Accepts
    console.log("\n4. Seller Accepts 1800...");
    try {
        const acceptRes = await axios.post(`${BASE_URL}/deals/${dealId}/accept`, {},
            { headers: { Authorization: `Bearer ${seller.token}` } });
        console.log("   -> Deal Status:", acceptRes.data.deal.status);
    } catch (e) { console.error("Accept Error:", e.response?.data || e.message); }

    // 5. Chat Init
    console.log("\n5. Initializing Chat...");
    try {
        const chatRes = await axios.post(`${BASE_URL}/chat/init`, {
            recipientId: buyer.userId,
            dealId: dealId
        }, { headers: { Authorization: `Bearer ${seller.token}` } });
        console.log("   -> Chat Created. ID:", chatRes.data.chat._id);
    } catch (e) { console.error("Chat Init Error:", e.response?.data || e.message); }

    console.log("\n--- Test Complete ---");
}

run();
