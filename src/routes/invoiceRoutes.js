const express = require("express");
const router = express.Router();
const controller = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/:dealId/download", controller.generateInvoice);

module.exports = router;
