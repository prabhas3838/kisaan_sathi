const axios = require("axios");

const BASE_URL = "http://localhost:5001/api";
const PHONE = "9988776655"; // Use a distinct test number
const PIN = "123456";

async function registerAndLogin() {
    try {
        // 1. Send OTP
        console.log("1. Sending OTP...");
        await axios.post(`${BASE_URL}/auth/send-otp`, { phone: PHONE });

        // 2. Verify OTP (Simulated OTP is usually returned or fixed for dev, let's assume '123456' or fetch from response if needed, but previous code showed it returns it)
        // Actually, looking at authController, it generates a random one.
        // Hack: I need to know the OTP. 
        // Wait... in dev mode `sendOTP` returns the OTP in the response body!
        const sendRes = await axios.post(`${BASE_URL}/auth/send-otp`, { phone: PHONE });
        const otp = sendRes.data.otp;
        console.log(`   -> OTP Received: ${otp}`);

        console.log("2. Verifying OTP...");
        await axios.post(`${BASE_URL}/auth/verify-otp`, { phone: PHONE, otp });

        // 3. Complete Signup
        console.log("3. Completing Signup...");
        const completeRes = await axios.post(`${BASE_URL}/auth/signup-complete`, {
            phone: PHONE,
            pin: PIN,
            name: "Watchlist Tester",
            role: "farmer"
        });

        return completeRes.data.token;

    } catch (err) {
        if (err.response) {
            // If "User already exists" or similar error during signup flow, try logging in
            if (err.response.data && err.response.data.message === "User already exists") {
                console.log("   -> User likely exists, trying login...");
            } else if (err.response.status === 400 || err.response.status === 403) {
                console.log(`   -> Encountered error ${err.response.status}: ${err.response.data.message}. Trying login...`);
            }

            try {
                const loginRes = await axios.post(`${BASE_URL}/auth/login`, { phone: PHONE, pin: PIN });
                return loginRes.data.token;
            } catch (loginErr) {
                console.error("Login also failed:", loginErr.response ? loginErr.response.data : loginErr.message);
                process.exit(1);
            }
        }
        console.error("Registration Failed (No Response):", err.code || err.message);
        console.error(err);
        process.exit(1);
    }
}

async function subscribe(token, crop, mandi) {
    try {
        const res = await axios.post(
            `${BASE_URL}/watchlist`,
            { crop, mandi },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Subscribed:", res.data);
    } catch (err) {
        console.error("Subscribe Failed:", err.response ? err.response.data : err.message);
    }
}

async function addPrice(token, crop, mandi, price) {
    try {
        const res = await axios.post(
            `${BASE_URL}/mandi`,
            { crop, mandi, pricePerQuintal: price, locationName: mandi, location: { type: "Point", coordinates: [77.2, 28.6] } },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("Price Added:", res.data);
    } catch (err) {
        console.error("Add Price Failed:", err.response ? err.response.data : err.message);
    }
}

async function run() {
    console.log("--- Testing Watchlist Notifications ---");

    const token = await registerAndLogin();
    console.log("   -> Logged in successfully.");

    console.log("\n4. Subscribing to Wheat @ Azadpur...");
    await subscribe(token, "Wheat", "Azadpur");

    console.log("\n5. Adding Price for Wheat @ Azadpur (Should Trigger Alert)...");
    await addPrice(token, "Wheat", "Azadpur", 2500);

    console.log("\n--- Check Server Logs for [ALERT] ---");
}

run();
