const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load Models
const User = require("../src/models/User");
const MandiPrice = require("../src/models/MandiPrice");
const Inventory = require("../src/models/Inventory");
const Auction = require("../src/models/Auction");
const Deal = require("../src/models/Deal");
const Watchlist = require("../src/models/Watchlist");
const Chat = require("../src/models/Chat");

dotenv.config();

const seedDB = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connected successfully!");

        console.log("Clearing existing data...");
        await User.deleteMany();
        await MandiPrice.deleteMany();
        await Inventory.deleteMany();
        await Auction.deleteMany();
        await Deal.deleteMany();
        await Watchlist.deleteMany();
        await Chat.deleteMany();

        // Clear user indexes to avoid duplicate key errors on old ghost indexes
        try { await User.collection.dropIndexes(); } catch (e) { }

        console.log("-----------------------------------------");
        console.log("Creating Users (Password: 123456)...");

        const farmer1 = await User.create({
            name: "Ramesh Farmer",
            phone: "1111111111",
            role: "farmer",
            language: "en",
            password: "123456",
            location: "Azadpur, Delhi",
            locationCoordinates: { type: "Point", coordinates: [77.1729, 28.7373] },
            otpVerified: true,
            verificationStatus: "approved",
            trustScore: 4.5
        });

        const farmer2 = await User.create({
            name: "Suresh Farmer",
            phone: "2222222222",
            role: "farmer",
            language: "hi",
            password: "123456",
            location: "Pune, Maharashtra",
            locationCoordinates: { type: "Point", coordinates: [73.8567, 18.5204] },
            otpVerified: true,
            verificationStatus: "approved",
            trustScore: 4.2
        });

        const buyer1 = await User.create({
            name: "Ahmed Buyer",
            phone: "3333333333",
            role: "buyer",
            language: "en",
            password: "123456",
            location: "Delhi, Delhi",
            locationCoordinates: { type: "Point", coordinates: [77.2090, 28.6139] },
            otpVerified: true,
            verificationStatus: "approved",
            trustScore: 4.8
        });

        const buyer2 = await User.create({
            name: "Rajesh Buyer",
            phone: "4444444444",
            role: "buyer",
            language: "hi",
            password: "123456",
            location: "Mumbai, Maharashtra",
            locationCoordinates: { type: "Point", coordinates: [72.8777, 19.0760] },
            otpVerified: true,
            verificationStatus: "approved",
            trustScore: 4.6
        });

        const admin1 = await User.create({
            name: "Super Admin",
            phone: "9999999999",
            role: "admin",
            language: "en",
            password: "123456",
            otpVerified: true,
            verificationStatus: "approved"
        });

        console.log("Created users!");

        console.log("-----------------------------------------");
        console.log("Creating Mandi Prices...");

        const crops = ["Wheat", "Tomato", "Rice", "Potato", "Onion"];
        const mandis = [
            { name: "Azadpur", coords: [77.1729, 28.7373] },
            { name: "Ghazipur", coords: [77.3000, 28.6250] },
            { name: "Pune APMC", coords: [73.8567, 18.5204] },
            { name: "Ettimadai", coords: [76.8972, 10.9000] },
            { name: "Coimbatore API", coords: [76.9558, 11.0168] },
            { name: "Pollachi", coords: [77.0028, 10.6558] }
        ];

        const mandiPrices = [];
        for (const crop of crops) {
            for (const mandi of mandis) {
                // Generate baseline prices (e.g., Wheat=2200, Tomato=3000, Rice=3500, Potato=1500, Onion=2000)
                let base = crop === "Wheat" ? 2200 : crop === "Tomato" ? 3000 : crop === "Rice" ? 3500 : crop === "Potato" ? 1500 : 2000;

                // Random variance between -100 to +100
                const randomVariance = Math.floor(Math.random() * 200) - 100;
                const price = base + randomVariance;

                mandiPrices.push({
                    crop: crop,
                    mandi: mandi.name,
                    locationName: `${mandi.name} Mandi`,
                    location: { type: "Point", coordinates: mandi.coords },
                    pricePerQuintal: price,
                    date: new Date()
                });
            }
        }
        await MandiPrice.insertMany(mandiPrices);
        console.log("Created mandi prices!");

        console.log("-----------------------------------------");
        console.log("Creating Farmer Inventory...");

        await Inventory.create([
            {
                farmerId: farmer1._id,
                cropType: "Wheat",
                quantity: 500,
                price: 2200,
                status: "ACTIVE",
                harvestDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                location: farmer1.location
            },
            {
                farmerId: farmer1._id,
                cropType: "Tomato",
                quantity: 200,
                price: 3200,
                status: "ACTIVE",
                harvestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                location: farmer1.location
            },
            {
                farmerId: farmer2._id,
                cropType: "Rice",
                quantity: 1000,
                price: 3500,
                status: "ACTIVE",
                harvestDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
                location: farmer2.location
            }
        ]);
        console.log("Created inventory!");

        console.log("-----------------------------------------");
        console.log("Creating Auctions...");

        await Auction.create([
            {
                farmerId: farmer1._id,
                crop: "Wheat",
                quantityKg: 2000, // 20 Quintals
                basePrice: 2000,
                status: "OPEN",
                bids: [
                    { buyerId: buyer1._id, amount: 2050 },
                    { buyerId: buyer2._id, amount: 2100 }
                ]
            },
            {
                farmerId: farmer2._id,
                crop: "Onion",
                quantityKg: 1500, // 15 Quintals
                basePrice: 1800,
                status: "OPEN",
                bids: [
                    { buyerId: buyer1._id, amount: 1850 }
                ]
            }
        ]);
        console.log("Created auctions!");
        console.log("-----------------------------------------");

        console.log("Creating Negotiated Deals...");
        const deal1 = await Deal.create({
            seller: farmer1._id,
            buyer: buyer1._id,
            crop: "Wheat",
            originalPrice: 2200,
            currentOffer: 2150,
            quantityKg: 1000,
            status: "PENDING",
            lastOfferBy: buyer1._id,
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Expires in 2 days
        });

        const deal2 = await Deal.create({
            seller: farmer2._id,
            buyer: buyer2._id,
            crop: "Rice",
            originalPrice: 3500,
            currentOffer: 3500,
            quantityKg: 500,
            status: "ACCEPTED",
            lastOfferBy: farmer2._id,
            expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        });
        console.log("Created deals!");

        console.log("-----------------------------------------");
        console.log("Creating Watchlists...");
        await Watchlist.create([
            { user: farmer1._id, crop: "Wheat", mandi: "Azadpur" },
            { user: farmer2._id, crop: "Tomato", mandi: "Pune APMC" },
            { user: buyer1._id, crop: "Wheat", mandi: "Ghazipur" }
        ]);
        console.log("Created watchlists!");

        console.log("-----------------------------------------");
        console.log("Creating Chat History...");
        await Chat.create([
            {
                participants: [farmer1._id, buyer1._id],
                dealId: deal1._id,
                messages: [
                    { sender: buyer1._id, content: "Hi Ramesh, I saw your Wheat listing. Can you do ₹2150 per quintal?", timestamp: new Date(Date.now() - 3600000) },
                    { sender: farmer1._id, content: "Let me check the market rates and get back to you.", timestamp: new Date(Date.now() - 1800000) }
                ],
                lastMessage: new Date(Date.now() - 1800000)
            },
            {
                participants: [farmer2._id, buyer2._id],
                dealId: deal2._id,
                messages: [
                    { sender: buyer2._id, content: "Is the Rice still available?", timestamp: new Date(Date.now() - 7200000) },
                    { sender: farmer2._id, content: "Yes, deal accepted for 500Kg at ₹3500.", timestamp: new Date(Date.now() - 3600000) }
                ],
                lastMessage: new Date(Date.now() - 3600000)
            }
        ]);
        console.log("Created chat messages!");
        console.log("-----------------------------------------");

        console.log("✅ SEEDING COMPLETE! You can now log in and test.");
        console.log("\n--- TEST CREDENTIALS ---");
        console.log("🌾 FARMER 1:");
        console.log("   Phone: 1111111111");
        console.log("   OTP (if logging in via UI): Any 4 digit code if mocking / PIN: 123456");
        console.log("\n🌾 FARMER 2:");
        console.log("   Phone: 2222222222");
        console.log("\n🛒 BUYER 1:");
        console.log("   Phone: 3333333333");
        console.log("\n🛒 BUYER 2:");
        console.log("   Phone: 4444444444");
        console.log("\n🛡️ ADMIN:");
        console.log("   Phone: 9999999999");
        console.log("-----------------------------------------");
        console.log("Note: All accounts have the password '123456' if you are using password-based login.");
        console.log("If using the new OTP system, request an OTP for the phone number and pass ANY 4-digit code (if mock SMS is in place) to verify.");

        process.exit(0);

    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDB();
