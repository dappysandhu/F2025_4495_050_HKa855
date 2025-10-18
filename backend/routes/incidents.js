import express from "express";
import Incident from "../models/Incident.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";

const router = express.Router();

// report a new incident (Resident)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { type, description, photoUrl, location } = req.body;

    if (!type || !location?.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ message: "type and valid location are required" });
    }

    const incident = await Incident.create({
      reporter: req.user.id,
      type,
      description: description || "",
      photoUrl: photoUrl || "",
      location,
      // coordinator may approve later
      status: "pending", 
    });

    res.status(201).json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get my incidents (Resident)
router.get("/my", verifyToken, async (req, res) => {
  try {
    const incidents = await Incident.find({ reporter: req.user.id }).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get incidents nearby (Volunteer)
router.get("/nearby", verifyToken, async (req, res) => {
  try {
    const { lng, lat, maxKm = 10, unassigned } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ message: "lng and lat query params required" });
    }

    const query = {
      status: { $in: ["pending", "approved", "assigned", "in_progress"] },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(maxKm) * 1000,
        },
      },
    };

    if (String(unassigned) === "true") {
      query.assignedVolunteers = { $size: 0 };
    }

    const incidents = await Incident.find(query).limit(50);
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// accept an incident (Volunteer)
router.post("/:id/accept", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // check if user is volunteer
    const user = await User.findById(req.user.id);
    if (user.role !== "volunteer") {
      return res.status(403).json({ message: "Only volunteers can accept tasks" });
    }

    const incident = await Incident.findByIdAndUpdate(
      id,
      {
        $addToSet: { assignedVolunteers: req.user.id },
        $set: { status: "assigned" },
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json({ message: "Accepted", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// decline an incident (colunteer)
router.post("/:id/decline", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findByIdAndUpdate(
      id,
      { $pull: { assignedVolunteers: req.user.id } },
      { new: true }
    );
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    // if no volunteers left, optionally set back to approved/pending
    if (incident.assignedVolunteers.length === 0 && incident.status === "assigned") {
      incident.status = "approved";
      await incident.save();
    }

    res.json({ message: "Declined", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ypdate incident status (Volunteer or Coordinator)
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "approved" | "in_progress" | "resolved" | etc.

    const valid = ["pending", "approved", "assigned", "in_progress", "resolved"];
    if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const incident = await Incident.findByIdAndUpdate(id, { status }, { new: true });
    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// incidents assigned to me (Volunteer) 
router.get("/assigned/me", verifyToken, async (req, res) => {
  try {
    const incidents = await Incident.find({
      assignedVolunteers: req.user.id,
      status: { $in: ["assigned", "in_progress"] },
    }).sort({ updatedAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// incidents approval by coordinators 
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json({ message: "Incident approved", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
