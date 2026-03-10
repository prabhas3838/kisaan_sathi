const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/auth';
const TEST_PHONE = '9876543210';
const TEST_PIN = '1234';

async function testAuthFlow() {
    try {
        console.log("1. Sending OTP...");
        const sendOtpRes = await axios.post(`${BASE_URL}/send-otp`, { phone: TEST_PHONE });
        console.log("OTP Sent:", sendOtpRes.data);
        const otp = sendOtpRes.data.otp;

        console.log(`2. Verifying OTP: ${otp}...`);
        const verifyOtpRes = await axios.post(`${BASE_URL}/verify-otp`, { phone: TEST_PHONE, otp });
        console.log("OTP Verified:", verifyOtpRes.data);

        console.log("3. Completing Signup...");
        const signupRes = await axios.post(`${BASE_URL}/signup-complete`, {
            phone: TEST_PHONE,
            pin: TEST_PIN,
            name: "Test Farmer",
            role: "farmer"
        });
        console.log("Signup Completed:", signupRes.data);

        console.log("4. Logging in...");
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            phone: TEST_PHONE,
            pin: TEST_PIN
        });
        console.log("Login Successful:", loginRes.data);

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testAuthFlow();
