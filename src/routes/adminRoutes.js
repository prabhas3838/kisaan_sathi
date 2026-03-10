const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes require admin authorization
router.use(protect);
router.use(authorize("admin"));

router.get("/stats", controller.getStats);
router.get("/activities", controller.getRecentActivities);
router.get("/orders", controller.getAllOrders);
router.get("/analytics", controller.getAnalytics);
router.get("/monthly-detail", controller.getMonthlyDetail);

module.exports = router;
