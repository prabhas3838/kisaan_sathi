const express = require("express");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();
const cors = require("cors");

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));

if (process.env.NODE_ENV !== "test") {
  connectDB();
}

app.get("/", (req, res) => {
  res.send("Backend + MongoDB Atlas working");
});

const userRoutes = require("./routes/userRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

app.use("/api/users", userRoutes);
app.use("/api/multimodal", require("./routes/multimodalRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/auctions", require("./routes/auctionRoutes"));

app.use("/api/mandi", require("./routes/mandiRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/watchlist", require("./routes/watchlistRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/deals", require("./routes/dealRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));


//location routes
app.use("/api/locations", require("./routes/locationRoutes"));



module.exports = app;
