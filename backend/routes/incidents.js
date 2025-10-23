import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Incident from "../models/Incidents.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";
import { sendPushNotification } from "../utils/sendPushNotification.js";
import mongoose from "mongoose";


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
  try {
    const userId = req.user.id || req.user._id;

    // Fetch reporter details
    const reporter = await User.findById(userId).select("username email role");
    if (!reporter) return res.status(404).json({ message: "Reporter not found" });

    const { type, description, severity, affected, location, customType } = req.body;
    const loc = location ? JSON.parse(location) : null;

    // Build photo URLs
    const photos = (req.files || []).map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );

    // Validate incident type
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

    // Create new incident with data
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
  try {
    const { lng, lat, maxKm = 10, unassigned } = req.query;
    if (!lng || !lat)
      return res.status(400).json({ message: "lng and lat required" });

    const userId = req.user._id;

    // Base query for nearby incidents
    const query = {
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

    // Optional: if user only wants unassigned incidents
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
      // safely handle missing volunteer entries
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


// incident handling approval, acceptance, status updates
router.post("/:id/accept", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    // Find and update this volunteer's assigned entry
    const incident = await Incident.findOneAndUpdate(
      {
        _id: req.params.id,
        "assignedVolunteers.volunteer": volunteerId,
      },
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
            target: volunteerId,
            message: `Volunteer ${volunteerId} accepted the task.`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // send push notification to coordinators
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      if (coord.pushTokens?.length > 0) {
        for (const pt of coord.pushTokens) {
          await sendPushNotification(
            pt.token,
            "Task Accepted",
            `${req.user.username || "A volunteer"} accepted an assigned task.`,
            { screen: "/tabs/profile/tasks" }
          );
        }
      }
    }

    res.json({ message: "Task accepted", incident });
  } catch (err) {
    console.error("Accept error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/decline", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const incident = await Incident.findOneAndUpdate(
      {
        _id: req.params.id,
        "assignedVolunteers.volunteer": volunteerId,
      },
      {
        $set: {
          "assignedVolunteers.$.status": "declined",
          "assignedVolunteers.$.respondedAt": new Date(),
        },
        $push: {
          logs: {
            action: "declined",
            actor: volunteerId,
            target: volunteerId,
            message: `Volunteer ${volunteerId} declined the task.`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // If all volunteers declined → revert incident status
    const allDeclined = incident.assignedVolunteers.every(
      (v) => v.status === "declined"
    );
    if (allDeclined) {
      incident.status = "approved";
      await incident.save();
    }

    //notify coordinator
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      if (coord.pushTokens?.length > 0) {
        for (const pt of coord.pushTokens) {
          await sendPushNotification(
            pt.token,
            "Task Declined",
            `${req.user.username || "A volunteer"} declined a task.`,
            { screen: "/tabs/profile/tasks" }
          );
        }
      }
    }

    res.json({ message: "Task declined", incident });
  } catch (err) {
    console.error("Decline error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "approved", "assigned", "in_progress", "resolved"];
    if (!valid.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const userId = req.user.id || req.user._id;
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status },
        $push: {
          logs: {
            action: "status_update",
            actor: userId,
            message: `Status updated to ${status}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assigned/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    console.log("Fetching assigned incidents for user:", userId);

    const incidents = await Incident.find({})
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ updatedAt: -1 })
      .lean();

    // Filter incidents manually — avoids ObjectId vs string mismatch issues
    const assignedToMe = incidents.filter((incident) => {
      return incident.assignedVolunteers?.some((v) => {
        const volunteerId =
          typeof v.volunteer === "object"
            ? v.volunteer?._id?.toString()
            : v.volunteer?.toString();
        return volunteerId === userId && v.status?.toLowerCase() !== "declined";
      });
    });

    console.log(
      `Found ${assignedToMe.length} assigned incidents for volunteer ${userId}`
    );

    res.json(assignedToMe);
  } catch (err) {
    console.error("Error fetching assigned tasks:", err);
    res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});




router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    // fetch the incident document
    const incident = await Incident.findById(req.params.id)
      .populate("reporter", "name email")
      .populate("assignedVolunteers.volunteer", "name email role");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // update the status and add a log
    incident.status = "approved";

    incident.logs.push({
      action: "approved",
      actor: req.user._id,
      message: `Incident approved by coordinator ${req.user.username || req.user.email}`,
      timestamp: new Date(),
    });

    // save the updated document
    await incident.save();

    // refetch populated version (for frontend freshness)
    const updatedIncident = await Incident.findById(req.params.id)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    res.json({
      message: "Incident approved successfully",
      incident: updatedIncident,
    });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.post("/:id/dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { volunteerIds } = req.body; // Array of user IDs

    if (!Array.isArray(volunteerIds) || volunteerIds.length === 0) {
      return res.status(400).json({ message: "No volunteers provided" });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    // Normalize and ensure no duplicates
    const existingIds = incident.assignedVolunteers
      .map((v) => v?.volunteer?.toString?.())
      .filter(Boolean);

    volunteerIds.forEach((id) => {
      // convert to ObjectId
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

    // update status and save
    incident.status = "assigned";
    await incident.save();

    // Re-fetch the fully populated document
    const populated = await Incident.findById(incident._id)
      .populate("reporter", "name email role")
      .populate("assignedVolunteers.volunteer", "name email role");

    // Notify coordinators
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      if (coord.pushTokens?.length > 0) {
        for (const pt of coord.pushTokens) {
          await sendPushNotification(
            pt.token,
            "New Task Assigned",
            `Incident "${incident.type}" assigned to volunteers.`,
            { screen: "/tabs/incidents" }
          );
        }
      }
    }

    return res.json({
      message: "Volunteers assigned successfully",
      incident: populated,
    });
  } catch (err) {
    console.error("Dispatch error:", err);
    res.status(500).json({ error: err.message });
  }
});



export default router;
