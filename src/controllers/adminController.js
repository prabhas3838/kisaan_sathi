const User = require("../models/User");
const CropListing = require("../models/Inventory");
const Deal = require("../models/Deal");
const Auction = require("../models/Auction");
const SupportRequest = require("../models/SupportRequest");

exports.getStats = async (req, res) => {
    try {
        const totalFarmers = await User.countDocuments({ role: "farmer" });
        const totalBuyers = await User.countDocuments({ role: "buyer" });
        const activeListings = await CropListing.countDocuments({ status: "ACTIVE" });
        const pendingSupportRequests = await SupportRequest.countDocuments({ status: "pending" });

        // Revenue calculation (total amount of completed deals + auctions)
        const completedDeals = await Deal.find({ status: "ACCEPTED" });
        const dealRevenue = completedDeals.reduce((sum, deal) => sum + (deal.currentOffer * deal.quantityKg || 0), 0);

        const completedAuctions = await Auction.find({ status: "CLOSED" });
        const auctionRevenue = completedAuctions.reduce((sum, auc) => sum + (auc.winningBid?.amount || 0), 0);

        const totalRevenue = dealRevenue + auctionRevenue;

        // Weekly Revenue Overview (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const weekDeals = await Deal.find({
            status: "ACCEPTED",
            createdAt: { $gte: sevenDaysAgo }
        });

        const weekAuctions = await Auction.find({
            status: "CLOSED",
            updatedAt: { $gte: sevenDaysAgo }
        });

        // We want data for the last 7 labels (Mon-Sun or relative)
        // But the frontend has fixed labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        // We will return data for the current week (Monday to Sunday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);

        const currentWeekDeals = await Deal.find({
            status: "ACCEPTED",
            createdAt: { $gte: monday }
        });
        const currentWeekAuctions = await Auction.find({
            status: "CLOSED",
            updatedAt: { $gte: monday }
        });

        const weeklyRevenueData = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, ... Sun

        currentWeekDeals.forEach(d => {
            const dt = new Date(d.createdAt);
            const dIdx = dt.getDay(); // 0=Sun, 1=Mon...
            const targetIdx = dIdx === 0 ? 6 : dIdx - 1;
            weeklyRevenueData[targetIdx] += (d.currentOffer * d.quantityKg);
        });

        currentWeekAuctions.forEach(a => {
            const dt = new Date(a.updatedAt);
            const dIdx = dt.getDay();
            const targetIdx = dIdx === 0 ? 6 : dIdx - 1;
            weeklyRevenueData[targetIdx] += (a.winningBid?.amount || 0);
        });

        const weeklyRevenueK = weeklyRevenueData.map(val => val / 1000);
        console.log("Weekly Revenue Data (Raw):", weeklyRevenueData);
        console.log("Weekly Revenue Data (K):", weeklyRevenueK);

        // Orders today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const ordersToday = await Deal.countDocuments({ createdAt: { $gte: startOfDay } });

        res.status(200).json({
            success: true,
            stats: {
                totalFarmers,
                totalBuyers,
                activeListings,
                ordersToday,
                monthlyRevenue: totalRevenue, // Renamed to monthlyRevenue to match frontend key but it's total
                weeklyRevenue: weeklyRevenueK,
                reportedListings: 0,
                pendingApprovals: 0,
                pendingSupportRequests: pendingSupportRequests,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRecentActivities = async (req, res) => {
    try {
        const recentOrders = await Deal.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("buyer", "name")
            .populate("seller", "name");

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            activities: {
                orders: recentOrders.map(o => ({
                    id: o._id,
                    buyer: o.buyer?.name || "Unknown",
                    farmer: o.seller?.name || "Unknown",
                    crop: o.crop || "Produce",
                    amount: (o.currentOffer * o.quantityKg),
                    status: o.status.toLowerCase(),
                    date: o.createdAt
                })),
                registrations: recentUsers.map(u => ({
                    id: u._id,
                    name: u.name,
                    role: u.role,
                    location: u.location || "N/A"
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Deal.find()
            .sort({ createdAt: -1 })
            .populate("buyer", "name")
            .populate("seller", "name");

        res.status(200).json({
            success: true,
            orders: orders.map(o => ({
                id: o._id.toString().slice(-6).toUpperCase(),
                buyer: o.buyer?.name || "Unknown",
                farmer: o.seller?.name || "Unknown",
                total: (o.currentOffer * o.quantityKg),
                payStatus: "paid", // Placeholder if no payment model
                delStatus: o.status.toLowerCase(),
                date: new Date(o.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { timeframe } = req.query;
        const monthsToFetch = timeframe === "1y" ? 12 : 6;

        // 1. Revenue Growth
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - (monthsToFetch - 1));
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const deals = await Deal.find({
            status: "ACCEPTED",
            createdAt: { $gte: startDate }
        });

        const auctions = await Auction.find({
            status: "CLOSED",
            updatedAt: { $gte: startDate }
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const periodLabels = [];
        const revenueByMonth = {};

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(new Date().getMonth() - i);
            const label = months[d.getMonth()];
            periodLabels.push(label);
            revenueByMonth[label] = 0;
        }

        deals.forEach(deal => {
            const dealDate = new Date(deal.createdAt);
            const monthLabel = months[dealDate.getMonth()];
            if (revenueByMonth.hasOwnProperty(monthLabel)) {
                revenueByMonth[monthLabel] += (deal.currentOffer * deal.quantityKg);
            }
        });

        auctions.forEach(auc => {
            const aucDate = new Date(auc.updatedAt);
            const monthLabel = months[aucDate.getMonth()];
            if (revenueByMonth.hasOwnProperty(monthLabel)) {
                revenueByMonth[monthLabel] += (auc.winningBid?.amount || 0);
            }
        });

        const revenueData = periodLabels.map(label => revenueByMonth[label] / 1000);

        // 2. Category Distribution
        const categories = await CropListing.aggregate([
            { $match: { status: "ACTIVE" } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const categoryColors = {
            "Grains": "#1B5E20",
            "Vegetables": "#81C784",
            "Fruits": "#3B82F6",
            "Spices": "#F59E0B",
            "Other": "#A1887F"
        };

        const categoryData = (categories.length > 0 ? categories : [{ _id: "Other", count: 0 }]).map(c => ({
            name: c._id || "Other",
            population: c.count,
            color: categoryColors[c._id] || "#64748B",
            legendFontColor: "#64748B",
            legendFontSize: 12
        }));

        // 3. Top Selling Products
        const topProducts = await Deal.aggregate([
            { $match: { status: "ACCEPTED" } },
            {
                $group: {
                    _id: "$crop",
                    sales: { $sum: { $multiply: ["$currentOffer", "$quantityKg"] } },
                    volume: { $sum: "$quantityKg" }
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 3 }
        ]);

        res.status(200).json({
            success: true,
            analytics: {
                revenueGrowth: {
                    labels: periodLabels,
                    data: revenueData.length > 0 ? revenueData : Array(monthsToFetch).fill(0)
                },
                categoryDistribution: categoryData,
                topProducts: topProducts.map(p => ({
                    name: p._id,
                    sales: `₹${p.sales >= 100000 ? (p.sales / 100000).toFixed(1) + 'L' : (p.sales / 1000).toFixed(1) + 'k'}`,
                    volume: `${p.volume >= 1000 ? (p.volume / 1000).toFixed(1) + ' Tons' : p.volume + 'kg'}`
                }))
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMonthlyDetail = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const deals = await Deal.find({
            status: "ACCEPTED",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const auctions = await Auction.find({
            status: "CLOSED",
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const daysInMonth = endOfMonth.getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
        const revenueData = Array(daysInMonth).fill(0);

        deals.forEach(d => {
            const day = new Date(d.createdAt).getDate();
            revenueData[day - 1] += (d.currentOffer * d.quantityKg);
        });

        auctions.forEach(a => {
            const day = new Date(a.updatedAt).getDate();
            revenueData[day - 1] += (a.winningBid?.amount || 0);
        });

        res.status(200).json({
            success: true,
            data: {
                labels,
                revenue: revenueData.map(v => v / 1000) // In 'k'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
