const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/analytics/price-forecast:
 *   get:
 *     summary: Get price predictions and selling recommendations for a crop at a specific Mandi.
 *     description: Analyzes historical price data and uses a Python ML layer to predict future prices for the next 7 days, providing actionable selling advice to farmers.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: crop
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the crop (e.g., 'Wheat', 'Tomato').
 *       - in: query
 *         name: mandi
 *         schema:
 *           type: string
 *         required: true
 *         description: Name or location of the Mandi (e.g., 'Azadpur', 'Mumbai').
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         required: false
 *         description: Number of days to look into the future.
 *     responses:
 *       200:
 *         description: Sucessfully generated a prediction and recommendation.
 *       400:
 *         description: Missing required params.
 *       404:
 *         description: No historical data available for this crop/mandi combination.
 */
router.get("/price-forecast", protect, analyticsController.getPriceForecast);
module.exports = router;
