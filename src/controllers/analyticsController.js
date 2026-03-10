const { spawn } = require("child_process");
const path = require("path");
const MandiPrice = require("../models/MandiPrice");
const AnalyticsCache = require("../models/AnalyticsCache"); // New Cache Layer

// Baseline Prices for Data Synthesizer (INR per Quintal)
const BASELINE_PRICES = {
    "wheat": 2200,
    "rice": 3200,
    "tomato": 1800,
    "onion": 1500,
    "maize": 2000,
    "potato": 1200
};

/**
 * Executes the Python ML script with historical data via stdin
 */
const runPythonPrediction = async (historicalData, days) => {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, "../ml/predict.py");
        // Start Python process - Use 'py' for Windows, 'python3' for others
        const python = spawn("py", [pythonScript]);

        let dataString = "";
        let errorString = "";

        python.stdout.on("data", (data) => {
            dataString += data.toString();
        });

        python.stderr.on("data", (data) => {
            errorString += data.toString();
        });

        python.on("close", (code) => {
            if (code !== 0 || errorString) {
                return reject(new Error(`Python Error ${code}: ${errorString}`));
            }
            try {
                const result = JSON.parse(dataString);
                if (result.error) return reject(new Error(result.error));
                resolve(result.predicted_prices);
            } catch (err) {
                reject(new Error("Failed to parse ML output"));
            }
        });

        // Feed JSON data to Python model
        const inputData = JSON.stringify({ historical: historicalData, days });
        python.stdin.write(inputData);
        python.stdin.end();
    });
};

/**
 * Intelligent Selling Recommendation Engine based on Math
 */
const generateRecommendation = (crop, mandi, historicalPrices, predictedPrices) => {
    if (!predictedPrices || predictedPrices.length === 0) {
        return "Not enough data to provide a recommendation.";
    }

    const maxPrice = Math.max(...predictedPrices);
    const peakDayIndex = predictedPrices.indexOf(maxPrice);
    const currentPrice = historicalPrices[historicalPrices.length - 1].price;

    let demandStr = "Medium";
    if (maxPrice > currentPrice * 1.05) demandStr = "High"; // 5% jump
    else if (maxPrice < currentPrice) demandStr = "Low";

    // Create a simple, jargon-free recommendation
    let recommendation = "";
    // Note: `predictedPrices` here is an array of numbers. To get the date, we need the `predictedData` array from `getPriceForecast`.
    // For simplicity, we'll use `peakDayIndex` to describe the timing.
    const peakPrice = maxPrice; // Renaming for clarity with the user's snippet

    if (demandStr === "High") {
        if (peakDayIndex === 0) {
            recommendation = `Market prices for ${crop} are at their best right now in ${mandi}. Demand is strong, so it's a great time to sell your harvest today.`;
        } else {
            // We don't have `predicted` (the full object with date) here, so we'll use `peakDayIndex`
            const dayString = peakDayIndex === 0 ? "tomorrow" : `in ${peakDayIndex + 1} days`;
            recommendation = `Prices for ${crop} in ${mandi} are expected to rise soon. Our model shows the price could reach ₹${peakPrice.toFixed(0)} ${dayString}. We recommend waiting a few days to get the best value for your crop.`;
        }
    } else if (demandStr === "Medium") {
        const dayString = peakDayIndex === 0 ? "tomorrow" : `in ${peakDayIndex + 1} days`;
        recommendation = `Market trends indicate steady conditions. A forecasted high of ₹${maxPrice.toFixed(2)} is expected ${dayString}. Consider selling incrementally.`;
    } else {
        recommendation = `Algorithm indicates a downward trend with Low demand. It may be advisable to hold your crop and wait for a recovery cycle.`;
    }
    return recommendation;
};

/**
 * @desc Get Price Forecast and Recommendation using Custom Synthesizer & Python ML
 * @route GET /api/analytics/price-forecast
 */
exports.getPriceForecast = async (req, res) => {
    try {
        let { crop, mandi, days = 7 } = req.query;

        if (!crop || !mandi) {
            return res.status(400).json({ success: false, message: "Crop and Mandi are required parameters" });
        }

        // --- CACHE LAYER CHECK ---
        const todayStr = new Date().toISOString().split('T')[0];
        const existingCache = await AnalyticsCache.findOne({
            crop: crop.toLowerCase(),
            mandi: mandi.toLowerCase(),
            dateCached: todayStr
        });

        if (existingCache) {
            console.log(`[Cache Hit] Returning instant cached ML data for ${crop} in ${mandi}`);
            return res.status(200).json({
                success: true,
                data: {
                    crop,
                    mandi,
                    historical: existingCache.historical,
                    predicted: existingCache.predicted,
                    recommendation: existingCache.recommendation
                }
            });
        }
        // --- END CACHE CHECK ---

        // PHASE 1: DATA SYNTHESIZER
        let basePrice = BASELINE_PRICES[crop.toLowerCase()] || 2000;

        // Add a deterministic geo-location variance so different Mandis have different baseline prices
        const mandiVariance = (mandi.length % 5) * 45 + (mandi.charCodeAt(0) || 0);
        basePrice = basePrice + mandiVariance;

        const historicalData = [];
        const today = new Date();

        // Generate 30 days of realistic history
        for (let i = 30; i > 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            // Add sine wave + random noise to simulate market conditions
            const seasonalVariance = Math.sin(i * 0.2) * (basePrice * 0.05);
            const randomNoise = (Math.random() - 0.5) * (basePrice * 0.02);
            const simulatedPrice = basePrice + seasonalVariance + randomNoise;

            historicalData.push({
                date: d.toISOString().split('T')[0],
                price: parseFloat(simulatedPrice.toFixed(2))
            });
        }

        // Optional: Cache these 30 days into MandiPrice DB for local viewing
        try {
            await MandiPrice.deleteMany({ crop: crop.toLowerCase(), mandi: mandi });
            const records = historicalData.map(h => ({
                crop: crop.toLowerCase(),
                mandi: mandi,
                locationName: mandi,
                location: { type: "Point", coordinates: [0, 0] },
                pricePerQuintal: h.price,
                date: new Date(h.date)
            }));
            await MandiPrice.insertMany(records);
        } catch (dbErr) {
            console.warn("Could not seed synthesized data to MandiPrice DB:", dbErr.message);
        }

        // PHASE 2: CALL PYTHON ML SCRIPT
        const parsedDays = parseInt(days) || 7;
        const predictedPricesArray = await runPythonPrediction(historicalData, parsedDays);

        // Format Predicted Output
        const predictedData = predictedPricesArray.map((price, idx) => {
            const d = new Date(today);
            d.setDate(today.getDate() + idx + 1);
            return {
                date: d.toISOString().split('T')[0],
                price: price
            };
        });

        // PHASE 3: RECOMMENDATION ENGINE
        const recommendation = generateRecommendation(crop, mandi, historicalData, predictedPricesArray);

        // SAVE FULL PAYLOAD TO FAST-CACHE
        try {
            await AnalyticsCache.create({
                crop: crop.toLowerCase(),
                mandi: mandi.toLowerCase(),
                dateCached: todayStr,
                historical: historicalData,
                predicted: predictedData,
                recommendation: recommendation
            });
        } catch (dbErr) {
            console.warn("Could not cache ML output to AnalyticsCache:", dbErr.message);
        }

        // Return Data
        res.status(200).json({
            success: true,
            data: {
                crop,
                mandi,
                historical: historicalData,
                predicted: predictedData,
                recommendation: recommendation
            }
        });

    } catch (err) {
        console.error("ML Analytics Error:", err);
        res.status(500).json({
            success: false,
            error: "Predictive Analytics Engine Failed",
            details: err.message
        });
    }
};
