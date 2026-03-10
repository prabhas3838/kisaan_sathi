const express = require("express");
const router = express.Router();
const Location = require("../models/Location");

// GET active locations for dropdown
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true })
      .select("name locationCoordinates")
      .sort({ name: 1 });

    //Transform for frontend
    const data = locations.map((loc) => ({
      id: loc._id.toString(),
      name: loc.name,
      lat: loc.locationCoordinates.coordinates[1], // latitude
      lng: loc.locationCoordinates.coordinates[0], // longitude
    }));

    return res.json({ status: "SUCCESS", places: data });
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: err.message });
  }
});

// POST create a new location (admin only ideally)
router.post("/", async (req, res) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        status: "FAILED",
        message: "name, lat, lng are required",
      });
    }

    const created = await Location.create({
      name,
      locationCoordinates: {
        type: "Point",
        coordinates: [lng, lat], // [lng, lat]
      },
    });

    return res.json({ status: "SUCCESS", location: created });
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: err.message });
  }
});

module.exports = router;
