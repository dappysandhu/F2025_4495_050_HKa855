import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Incident from "../models/Incidents.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";
import { notifyUser } from "../utils/notifyUser.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// log every request once
router.use((req, res, next) => {
  console.log("Incidents route hit:", req.method, req.originalUrl);
  next();
});

//  create an incident (Resident)
router.post("/", verifyToken, upload.array("photos", 5), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const reporter = await User.findById(userId).select("username email role");
    if (!reporter) return res.status(404).json({ message: "Reporter not found" });

    const { type, description, severity, affected, location, customType } = req.body;
    const loc = location ? JSON.parse(location) : null;

    const photos = (req.files || []).map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );

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

    const customTypeValue =
      safeType === "other" && customType ? customType.trim() : "";

    const incident = await Incident.create({
      reporter: userId,
      reporterName: reporter.username || "Unknown",
      type: safeType,
      customType: customTypeValue,
      description,
      severity: severity || "Low",
      affected: affected || 0,
      location: loc,
      photos,
      photoUrl: photos[0] || "",
      status: "pending",
    });

    //  Notify coordinators
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      await notifyUser(
        coord._id,
        "New Incident Reported",
        `${reporter.username || "A resident"} reported a new ${safeType} incident.`,
        { incidentId: incident._id }
      );
    }

    res.status(201).json(incident);
  } catch (err) {
    console.error("Incident creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

//  get all incidents
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const incidents = await Incident.find(query)
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ createdAt: -1 });

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
  try {
    const { lng, lat, maxKm = 10, unassigned } = req.query;
    if (!lng || !lat)
      return res.status(400).json({ message: "lng and lat required" });

    const userId = req.user._id;

    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(maxKm) * 1000,
        },
      },
    };

    if (unassigned === "true") {
      query.$or = [
        { assignedVolunteers: { $exists: false } },
        { assignedVolunteers: { $size: 0 } },
      ];
    }

    const incidents = await Incident.find(query)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const enhanced = incidents.map((incident) => {
      const myAssignment = incident.assignedVolunteers?.find((v) => {
        if (!v?.volunteer?._id || !userId) return false;
        return v.volunteer._id.toString() === userId.toString();
      });
      return {
        ...incident,
        isAssignedToUser: !!myAssignment,
        userAssignmentStatus: myAssignment?.status || null,
      };
    });

    res.json(enhanced);
  } catch (err) {
    console.error("Nearby fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

//  get assigned incidents (Volunteer)
router.get("/assigned/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    console.log("Fetching assigned incidents for user:", userId);

    const incidents = await Incident.find({})
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ updatedAt: -1 })
      .lean();

    const assignedToMe = incidents.filter((incident) => {
      return incident.assignedVolunteers?.some((v) => {
        const volunteerId =
          typeof v.volunteer === "object"
            ? v.volunteer?._id?.toString()
            : v.volunteer?.toString();
        return volunteerId === userId && v.status?.toLowerCase() !== "declined";
      });
    });

    console.log(`Found ${assignedToMe.length} assigned incidents for ${userId}`);
    res.json(assignedToMe);
  } catch (err) {
    console.error("Error fetching assigned tasks:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//approve incident (Coordinator)
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    incident.status = "approved";
    incident.logs.push({
      action: "approved",
      actor: req.user._id,
      message: `Incident approved by ${req.user.username || req.user.email}`,
      timestamp: new Date(),
    });

    await incident.save();

    const updatedIncident = await Incident.findById(req.params.id)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    res.json({ message: "Incident approved successfully", incident: updatedIncident });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// dispatch volunteers (Coordinator)
router.post("/:id/dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { volunteerIds } = req.body;
    if (!Array.isArray(volunteerIds) || volunteerIds.length === 0)
      return res.status(400).json({ message: "No volunteers provided" });

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const existingIds = incident.assignedVolunteers
      .map((v) => v?.volunteer?.toString?.())
      .filter(Boolean);

    volunteerIds.forEach((id) => {
      const volunteerObjectId = new mongoose.Types.ObjectId(id);
      if (!existingIds.includes(id)) {
        incident.assignedVolunteers.push({
          volunteer: volunteerObjectId,
          status: "pending",
          assignedAt: new Date(),
        });

        incident.logs.push({
          action: "assigned",
          target: volunteerObjectId,
          message: `Coordinator assigned volunteer ${id}`,
          timestamp: new Date(),
        });
      }
    });

    incident.status = "assigned";
    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    for (const volunteerId of volunteerIds) {
      await notifyUser(
        volunteerId,
        "New Task Assigned",
        `You have been assigned to handle incident: ${incident.type}`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Volunteers assigned successfully", incident: populated });
  } catch (err) {
    console.error("Dispatch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// volunteer accepts task
router.post("/:id/accept", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, "assignedVolunteers.volunteer": volunteerId },
      {
        $set: {
          "assignedVolunteers.$.status": "accepted",
          "assignedVolunteers.$.respondedAt": new Date(),
          status: "in_progress",
        },
        $push: {
          logs: {
            action: "accepted",
            actor: volunteerId,
            message: `Volunteer accepted the task.`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role");

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      await notifyUser(
        coord._id,
        "Volunteer Accepted Task",
        `${req.user.username || "A volunteer"} accepted the incident "${incident.type}".`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task accepted", incident });
  } catch (err) {
    console.error("Accept error:", err);
    res.status(500).json({ error: err.message });
  }
});

// volunteer declines task
router.post("/:id/decline", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, "assignedVolunteers.volunteer": volunteerId },
      {
        $set: {
          "assignedVolunteers.$.status": "declined",
          "assignedVolunteers.$.respondedAt": new Date(),
        },
        $push: {
          logs: {
            action: "declined",
            actor: volunteerId,
            message: `Volunteer declined the task.`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role");

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const allDeclined = incident.assignedVolunteers.every((v) => v.status === "declined");
    if (allDeclined) {
      incident.status = "approved";
      await incident.save();
    }

    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      await notifyUser(
        coord._id,
        "Volunteer Declined Task",
        `${req.user.username || "A volunteer"} declined the incident "${incident.type}".`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task declined", incident });
  } catch (err) {
    console.error("Decline error:", err);
    res.status(500).json({ error: err.message });
  }
});


// volunteer marks task as completed
router.post("/:id/complete", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, "assignedVolunteers.volunteer": volunteerId },
      {
        $set: {
          "assignedVolunteers.$.status": "completed",
          "assignedVolunteers.$.respondedAt": new Date(),
          status: "completed", // update main status too
        },
        $push: {
          logs: {
            action: "completed",
            actor: volunteerId,
            message: `Volunteer marked the task as completed.`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role");

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    // 🔔 Notify coordinators that volunteer completed the task
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      await notifyUser(
        coord._id,
        "Task Completed",
        `${req.user.username || "A volunteer"} completed the incident "${incident.type}".`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task marked as completed", incident });
  } catch (err) {
    console.error("Complete error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
