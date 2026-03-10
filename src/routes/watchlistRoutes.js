const express = require("express");
const router = express.Router();
const controller = require("../controllers/watchlistController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.post("/", controller.subscribe);
router.get("/", controller.getMyWatchlist);
router.delete("/:id", controller.unsubscribe);

module.exports = router;
