const Inventory = require("../models/Inventory");
const User = require("../models/User");

// Create a new listing (Draft or Active)
exports.createListing = async (req, res) => {
    try {
        const { cropType, quantity, price, harvestDate, status, location } = req.body;

        // Ensure user is a farmer
        if (req.user.role !== "farmer") {
            return res.status(403).json({ error: "Only farmers can list crops" });
        }

        const listingData = {
            farmerId: req.user.id,
            cropType,
            quantity,
            price
        };

        if (harvestDate) listingData.harvestDate = harvestDate;
        if (status) listingData.status = status;

        // Use provided location or fallback to user's registered location
        if (location) {
            listingData.location = location;
        } else {
            const farmer = await User.findById(req.user.id);
            listingData.location = farmer.location || "";
        }

        const listing = new Inventory(listingData);
        await listing.save();

        res.status(201).json({ message: "Listing created successfully", listing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error creating listing" });
    }
};

// Get inventory for logged-in farmer
exports.getInventory = async (req, res) => {
    try {
        const { status } = req.query; // e.g. 'Active', 'Sold'
        const query = { farmerId: req.user.id };

        // Normalize status to uppercase if provided, else return all except deactivated (optional choice, but user story implies tabs)
        if (status) {
            query.status = status.toUpperCase();
        }

        const inventory = await Inventory.find(query).sort({ createdAt: -1 });

        // Check for expiring crops
        const now = new Date();
        const inventoryWithFlags = inventory.map(item => {
            const itemObj = item.toObject();
            if (item.harvestDate) {
                // Simple logic: if harvest date is passed or within 3 days, flag it
                const expiryDate = new Date(item.harvestDate);
                // Assuming 'freshness' lasts 7 days after harvest for this example
                // Or simply: "Expires Soon" if within 2 days of harvest date (if future) or already past.
                // Let's say: warning if current date is > harvestDate + 5 days
                const warningDate = new Date(expiryDate);
                warningDate.setDate(warningDate.getDate() + 5);

                itemObj.expiresSoon = now > warningDate;
            }
            return itemObj;
        });

        res.status(200).json(inventoryWithFlags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error fetching inventory" });
    }
};

// Update listing (Edit Quantity, etc.)
exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const listing = await Inventory.findOne({ _id: id, farmerId: req.user.id });
        if (!listing) {
            return res.status(404).json({ error: "Listing not found or unauthorized" });
        }

        // Allow updates to fields
        if (updates.quantity !== undefined) listing.quantity = updates.quantity;
        if (updates.price !== undefined) listing.price = updates.price;
        if (updates.status !== undefined) listing.status = updates.status;
        if (updates.harvestDate !== undefined) listing.harvestDate = updates.harvestDate;
        if (updates.cropType !== undefined) listing.cropType = updates.cropType;

        await listing.save();
        res.status(200).json({ message: "Listing updated", listing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error updating listing" });
    }
};

// Deactivate listing (Soft delete)
exports.deactivateListing = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await Inventory.findOneAndUpdate(
            { _id: id, farmerId: req.user.id },
            { status: "DEACTIVATED" },
            { new: true }
        );

        if (!listing) {
            return res.status(404).json({ error: "Listing not found or unauthorized" });
        }

        res.status(200).json({ message: "Listing deactivated", listing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error deactivating listing" });
    }
};

// Get expiring crops (Notification Logic)
exports.getExpiringInventory = async (req, res) => {
    try {
        // Find active crops where harvestDate is old
        const listings = await Inventory.find({
            farmerId: req.user.id,
            status: "ACTIVE",
            harvestDate: { $exists: true }
        });

        const now = new Date();
        const expiring = listings.filter(item => {
            const hDate = new Date(item.harvestDate);
            const warningDate = new Date(hDate);
            warningDate.setDate(warningDate.getDate() + 5);
            return now > warningDate;
        });

        res.status(200).json({
            message: "Expiring crops fetched",
            count: expiring.length,
            expiringCrops: expiring
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error fetching expiring inventory" });
    }
};
