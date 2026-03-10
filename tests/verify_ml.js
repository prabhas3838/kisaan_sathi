const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
require("dotenv").config();
const User = require("../src/models/User");

// Temporary utility to cleanly run verification queries against the API payload
async function verifyMlPipeline() {
    console.log("==========================================");
    console.log("🚀 INITIALIZING ML GEO-VERIFICATION...");
    console.log("==========================================\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const jwt = require("jsonwebtoken");

        // Grab an admin/farmer token
        let user = await User.findOne({ phone: "8881112222" });
        if (!user) {
            user = await User.create({ name: "Verify", phone: "8881112222", role: "farmer", password: "pwd", otpVerified: true });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Helper function
        const fetchAndPrint = async (crop, mandi) => {
            console.log(`\n⏳ Requesting ${crop} predictions in ${mandi}...`);
            const res = await request(app)
                .get(`/api/analytics/price-forecast?crop=${crop}&mandi=${mandi}&days=3`)
                .set("Authorization", `Bearer ${token}`);

            if (res.body.success) {
                const data = res.body.data;
                console.log(`✅[${crop} in ${mandi}]`);
                console.log(`   Prediction Day 1: ₹${data.predicted[0].price} / Qtl`);
                console.log(`   Prediction Day 2: ₹${data.predicted[1].price} / Qtl`);
                console.log(`   Recommendation: "${data.recommendation}"`);
            } else {
                console.error("❌ Failed API Call", res.body);
            }
        };

        // SCENARIO 1: Same Crop, Different Geo Locations
        console.log("\n--- TEST: GEO LOCATION VARIANCE ---");
        await fetchAndPrint("Wheat", "Azadpur Mandi (Delhi)");
        await fetchAndPrint("Wheat", "APMC Mumbai");
        await fetchAndPrint("Wheat", "Bhopal Central");

        // SCENARIO 2: Different Crops, Same Geo Location
        console.log("\n--- TEST: CROP TYPE VARIANCE ---");
        await fetchAndPrint("Tomato", "Bangalore");
        await fetchAndPrint("Onion", "Bangalore");

        // SCENARIO 3: Exotic Outlier
        console.log("\n--- TEST: DYNAMIC FALLBACK MATH ---");
        await fetchAndPrint("Dragonfruit", "Kerala");

    } catch (err) {
        console.error("Script Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\n==========================================");
        console.log("🏁 VERIFICATION COMPLETE!");
        console.log("==========================================\n");
    }
}

verifyMlPipeline();
