const express = require("express");
const router = express.Router();
const controller = require("../controllers/dealController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", controller.createDeal);
router.post("/:id/offer", controller.makeOffer); // Counter-Offer
router.post("/:id/accept", controller.acceptOffer);
router.post("/:id/reject", controller.rejectOffer);
router.get("/:id", controller.getDeal);

module.exports = router;
