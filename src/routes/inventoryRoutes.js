const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware.protect);

// Create listing (supports Draft/Active)
router.post("/", inventoryController.createListing);

// Get my inventory (supports ?status=ACTIVE or ?status=SOLD)
router.get("/mine", inventoryController.getInventory);

// Get expiring crops (for notifications)
router.get("/expiring", inventoryController.getExpiringInventory);

// Update listing
router.put("/:id", inventoryController.updateListing);

// Deactivate listing
router.delete("/:id", inventoryController.deactivateListing);

module.exports = router;
