const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env vars
dotenv.config();

// Load models
const User = require("./src/models/User");
const Inventory = require("./src/models/Inventory");
const MandiPrice = require("./src/models/MandiPrice");

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

const seedData = async () => {
    try {
        // Optionally connect to mongo here if not already connected
        // await mongoose.connect(process.env.MONGO_URI);

        // Clean up previous seed user if it exists
        await User.deleteOne({ phone: "9123456780" });

        // 1. Create a Sample Farmer
        console.log("Seeding sample user...");
        const farmer = await User.create({
            name: "Ramesh Farmer",
            phone: "9123456780",
            role: "farmer",
            password: "123456", // 6-digit PIN as required by authController
            otpVerified: true,
            trustScore: 85,
            location: "Pune, Maharashtra",
            locationCoordinates: {
                type: "Point",
                coordinates: [73.8567, 18.5204] // Pune coordinates
            },
            verificationStatus: "approved",
            language: "en"
        });
        console.log(`User created: ${farmer.name} (${farmer.phone})`);

        // 2. Create Sample Inventory for this Farmer
        console.log("Seeding inventory items...");
        const inventoryItems = [
            {
                farmerId: farmer._id,
                cropType: "Wheat",
                quantity: 500,
                price: 2500, // per quintal
                status: "ACTIVE",
                harvestDate: new Date("2025-03-01"),
                location: "Pune Storage Facility"
            },
            {
                farmerId: farmer._id,
                cropType: "Rice",
                quantity: 1000,
                price: 3200,
                status: "ACTIVE",
                harvestDate: new Date("2024-11-15"),
                location: "Pune Storage Facility"
            },
            {
                farmerId: farmer._id,
                cropType: "Onion",
                quantity: 300,
                price: 1800,
                status: "DRAFT", // Not yet visible to buyers
                harvestDate: new Date("2025-04-10"),
                location: "Pune Storage Facility"
            }
        ];

        const insertedInventory = await Inventory.insertMany(inventoryItems);
        console.log(`${insertedInventory.length} inventory items created.`);

        // 3. Create Sample Mandi Prices (Optional, but useful for testing)
        console.log("Seeding mandi prices...");
        const mandiPrices = [
            {
                crop: "Wheat",
                mandi: "Pune APMC",
                pricePerQuintal: 2600,
                locationName: "Pune APMC",
                location: {
                    type: "Point",
                    coordinates: [73.8567, 18.5204]
                }
            },
            {
                crop: "Rice",
                mandi: "Pune APMC",
                pricePerQuintal: 3300,
                locationName: "Pune APMC",
                location: {
                    type: "Point",
                    coordinates: [73.8567, 18.5204]
                }
            }
        ];
        const insertedMandiPrices = await MandiPrice.insertMany(mandiPrices);
        console.log(`${insertedMandiPrices.length} mandi prices created.`);

        console.log("Data Seeding Completed Successfully.");
        process.exit();
    } catch (error) {
        console.error("Error with data seeding:", error);
        process.exit(1);
    }
};

seedData();
