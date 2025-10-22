import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Incident from "../models/Incidents.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// log every request
router.use((req, res, next) => {
  console.log("Incidents route hit:", req.method, req.originalUrl);
  next();
});

// Log every request
router.use((req, res, next) => {
  console.log("Incidents route hit:", req.method, req.originalUrl);
  next();
});

// create an incident (Resident)
router.post("/", verifyToken, upload.array("photos", 5), async (req, res) => {
  const userId = req.user.id || req.user._id;

  try {
    const { type, description, severity, affected, location } = req.body;
    const loc = location ? JSON.parse(location) : null;

    // build photo URLs
    const photos = (req.files || []).map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );

    // default to “other” if unknown
    const validTypes = [
      "fire",
      "flood",
      "medical",
      "rescue",
      "accident",
      "crime",
      "earthquake",
      "other",
    ];
    const safeType = validTypes.includes(type?.toLowerCase())
      ? type.toLowerCase()
      : "other";

    const incident = await Incident.create({
      reporter: userId,
      type: safeType,
      customType: safeType === "other" ? type : "",
      description,
      severity: severity || "Low",
      affected: affected || 0,
      location: loc,
      photos,
      photoUrl: photos[0] || "",
      status: "pending",
    });

    res.status(201).json(incident);
  } catch (err) {
    console.error("Incident creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// get all incidents 
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const incidents = await Incident.find(query).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    console.error("Error fetching incidents:", err);
    res.status(500).json({ error: err.message });
  }
});

// get my incidents (Resident)
router.get("/my", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const incidents = await Incident.find({ reporter: userId })
      .populate("reporter", "name email role")
      .populate("assignedVolunteers", "name email role")
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get nearby incidents (Volunteer)
router.get("/nearby", verifyToken, async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "volunteer") {
      return res
        .status(403)
        .json({ message: "Only volunteers can view nearby incidents" });
    }

    const { lng, lat, maxKm = 10, unassigned } = req.query;
    if (!lng || !lat)
      return res.status(400).json({ message: "lng and lat required" });

    const query = {
      status: { $in: ["pending", "approved", "assigned", "in_progress"] },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(maxKm) * 1000,
        },
      },
    };

    if (String(unassigned) === "true")
      query.assignedVolunteers = { $size: 0 };

    const incidents = await Incident.find(query)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers", "name email role")
      .limit(50);

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// incident handling approval, acceptance, status updates
router.post("/:id/accept", verifyToken, async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const user = await User.findById(userId);
    if (user.role !== "volunteer")
      return res.status(403).json({ message: "Only volunteers can accept" });

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { assignedVolunteers: userId },
        $set: { status: "assigned" },
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Accepted", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/decline", verifyToken, async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { $pull: { assignedVolunteers: userId } },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: "Not found" });

    if (
      incident.assignedVolunteers.length === 0 &&
      incident.status === "assigned"
    ) {
      incident.status = "approved";
      await incident.save();
    }

    res.json({ message: "Declined", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "approved", "assigned", "in_progress", "resolved"];
    if (!valid.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assigned/me", verifyToken, async (req, res) => {
  const userId = req.user.id || req.user._id;
  try {
    const incidents = await Incident.find({
      assignedVolunteers: userId,
      status: { $in: ["assigned", "in_progress"] },
    })
      .populate("reporter", "name email role")
      .populate("assignedVolunteers", "name email role")
      .sort({ updatedAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Incident approved", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { volunteerIds = [] } = req.body;
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { assignedVolunteers: { $each: volunteerIds } },
        $set: { status: "assigned" },
      },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Incident dispatched", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
