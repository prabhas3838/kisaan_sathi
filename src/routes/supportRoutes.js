const express = require("express");
const router = express.Router();
const { createRequest, getRequests, updateStatus } = require("../controllers/supportController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/request", protect, createRequest);
router.get("/admin/requests", protect, authorize("admin"), getRequests);
router.put("/admin/requests/:id", protect, authorize("admin"), updateStatus);

module.exports = router;
