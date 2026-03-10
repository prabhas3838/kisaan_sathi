const { fetchLiveHistoricalData } = require("./src/services/externalDataService");
const mongoose = require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    try {
        const records = await fetchLiveHistoricalData("Rice", "Azadpur Mandi (Delhi)");
        console.log("RICE PRICES:", records.map(r => r.pricePerQuintal));
    } catch(e) {
        console.error(e);
    }
    mongoose.connection.close();
});
