import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Incident from "../models/Incidents.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";
import { notifyUser } from "../utils/notifyUser.js";

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Log every request
router.use((req, res, next) => {
  console.log("Incidents route hit:", req.method, req.originalUrl);
  next();
});

// Cloudinary config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key:    process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// console.log('[Cloudinary cfg @incidents]', 
//   process.env.CLOUDINARY_CLOUD_NAME, 
//   (process.env.CLOUDINARY_API_KEY || '').slice(0,4) + '****'
// );


// Multer 
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ].includes(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});


// Single request log
router.use((req, _res, next) => {
  console.log("[Incidents]", req.method, req.originalUrl);
  next();
});

// Helpers 
const folder = process.env.CLOUDINARY_FOLDER || "cera/incidents";

// Upload one buffer → { url, publicId }
const uploadBufferToCloudinary = (buffer, filename = "incident.jpg") =>
  new Promise((resolve, reject) => {
    const folder = process.env.CLOUDINARY_FOLDER || "cera/incidents";
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ format: "jpg" }],
        filename_override: filename,
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });

// delete by public IDs
const deleteCloudinaryByPublicIds = async (publicIds = []) => {
  if (!publicIds.length) return;
  await Promise.all(
    publicIds.map((id) =>
      cloudinary.uploader.destroy(id).catch((e) => {
        console.warn("Cloudinary destroy failed:", id, e?.message || e);
      })
    )
  );
};

// extract public ID from Cloudinary URL
const publicIdFromUrl = (secureUrl) => {
  try {
    const u = new URL(secureUrl);
    const parts = u.pathname.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    const afterUpload = parts.slice(uploadIdx + 1);
    const noVersion =
      afterUpload.length && /^v\d+/.test(afterUpload[0])
        ? afterUpload.slice(1)
        : afterUpload;
    const last = noVersion.pop() || "";
    const base = last.replace(/\.[^.]+$/, "");
    return [...noVersion, base].join("/"); 
  } catch {
    return null;
  }
};

// CREATE INCIDENT
router.post("/", verifyToken, upload.array("photos", 5), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const reporter = await User.findById(userId).select("username email role");
    if (!reporter) return res.status(404).json({ message: "Reporter not found" });

    const { type, description, severity, affected, location, customType } = req.body;
    const loc = location ? JSON.parse(location) : null;

    const validTypes = ["fire", "flood", "medical", "rescue", "accident", "crime", "earthquake", "other"];
    const safeType = validTypes.includes((type || "").toLowerCase()) ? type.toLowerCase() : "other";
    const customTypeValue = safeType === "other" && customType ? customType.trim() : "";

    // Upload images
    let photos = [];
    let publicIds = [];

    if (req.files?.length) {
      const uploaded = await Promise.all(
        req.files.map((file, i) =>
          uploadBufferToCloudinary(
            file.buffer,
            file.originalname || `incident_${Date.now()}_${i}.jpg`
          )
        )
      );

      photos = uploaded.map((u) => u.url);
      publicIds = uploaded.map((u) => u.publicId);
    }

    const incident = await Incident.create({
      reporter: userId,
      reporterName: reporter.username || "Unknown",
      type: safeType,
      customType: customTypeValue,
      description: description || "",
      severity: severity || "Low",
      affected: Number(affected) || 0,
      location: loc,
      photos,
      cloudinaryPublicIds: publicIds,
      photoUrl: photos[0] || "",
      status: "pending",
    });

    // Notify coordinators
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
    res.status(500).json({ error: err?.message || "Server error creating incident" });
  }
});

// Get all incidents
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
    res.status(500).json({ error: err.message });
  }
});

// Get my incidents (Resident)
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

// Get nearby incidents (Volunteer)
router.get("/nearby", verifyToken, async (req, res) => {
  try {
    const { lng, lat, maxKm = 10, unassigned, type, severity, status, limit = 50 } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: "lng and lat required" });

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

    if (type) {
      const t = type.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (t.length) query.type = { $in: t };
    }

    if (severity) {
      const s = severity.split(",").map(s => s.trim()).filter(Boolean);
      if (s.length) query.severity = { $in: s };
    }

    if (status) {
      const st = status.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (st.length) query.status = { $in: st };
    }

    const incidents = await Incident.find(query)
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const userId = req.user._id?.toString();
    const enhanced = incidents.map((incident) => {
      const myAssignment = incident.assignedVolunteers?.find((v) => {
        const vid = typeof v.volunteer === "object"
          ? v.volunteer?._id?.toString()
          : v.volunteer?.toString();
        return vid === userId;
      });
      return { ...incident, isAssignedToUser: !!myAssignment, userAssignmentStatus: myAssignment?.status || null };
    });

    res.json(enhanced);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get assigned incidents
router.get("/assigned/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id?.toString();
    const incidents = await Incident.find({})
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ updatedAt: -1 })
      .lean();

    const assignedToMe = incidents.filter((incident) =>
      incident.assignedVolunteers?.some((v) => {
        const volunteerId =
          typeof v.volunteer === "object"
            ? v.volunteer?._id?.toString()
            : v.volunteer?.toString();
        return volunteerId === userId && v.status?.toLowerCase() !== "declined";
      })
    );

    res.json(assignedToMe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one incident by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .populate("logs.actor", "username name email role");
    if (!incident) return res.status(404).json({ message: "Incident not found" });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Volunteer accepts task
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
            message: "Volunteer accepted the task.",
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
        `${req.user.username || "A volunteer"} accepted "${incident.type}" incident.`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task accepted", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Volunteer declines task
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
            message: "Volunteer declined the task.",
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
        `${req.user.username || "A volunteer"} declined "${incident.type}" incident.`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task declined", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Volunteer completes task
router.post("/:id/complete", verifyToken, async (req, res) => {
  try {
    
    const volunteerId = req.user._id;
    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, "assignedVolunteers.volunteer": volunteerId },
      {
        $set: {
          "assignedVolunteers.$.status": "completed",
          "assignedVolunteers.$.respondedAt": new Date(),
          status: "completed",
        },
        $push: {
          logs: {
            action: "completed",
            actor: volunteerId,
            message: "Volunteer marked the task as completed.",
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
        "Task Completed",
        `${req.user.username || "A volunteer"} completed "${incident.type}" incident.`,
        { incidentId: incident._id }
      );
    }

    res.json({ message: "Task completed", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve incident (Coordinator)
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
    res.json({ message: "Incident approved", incident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch volunteers (Coordinator)
router.post("/:id/dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { volunteerIds } = req.body;
    if (!Array.isArray(volunteerIds) || volunteerIds.length === 0)
      return res.status(400).json({ message: "No volunteers provided" });

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const volunteers = await User.find({ _id: { $in: volunteerIds } })
      .select("firstName lastName status");

    const blockedVolunteer = volunteers.find(v =>
      ["away", "offline"].includes(v.status)
    );

    if (blockedVolunteer) {
      return res.status(400).json({
        message: `Cannot assign ${blockedVolunteer.firstName} ${blockedVolunteer.lastName}. They are currently "${blockedVolunteer.status}".`
      });
    }

    const existingIds = incident.assignedVolunteers.map(v => v?.volunteer?.toString?.()).filter(Boolean);

    volunteerIds.forEach(id => {
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

    res.json({ message: "Volunteers assigned", incident: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact coordinators (Volunteer → Coordinator)
router.post("/:id/contact-coordinators", verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const incidentType=incident.customType || incident.type || "Unknown Type";
    const incidentLocation=incident.location?.name || "Unknown Location";

    const finalMessage=message && message.trim()!==""
    ? `${message} (Incident: ${incidentType} at ${incidentLocation})`
    : `A volunteer requested guidance for incident : ${incidentType} at ${incidentLocation}.`;

    // Notify all coordinators
    const coordinators = await User.find({ role: "coordinator" });
    for (const coord of coordinators) {
      await notifyUser(
        coord._id,
        "Volunteer Needs Assistance",
       finalMessage,
        { incidentId: incident._id }
      );
    }

    // Log contact action
    incident.logs.push({
      action: "contacted_coordinators",
      actor: req.user._id,
      message: message || "Volunteer contacted coordinators.",
      timestamp: new Date(),
    });
    await incident.save();

    res.json({ message: "Coordinators notified successfully" });
  } catch (err) {
    console.error("Delete incident error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});


// Get completed tasks for the logged-in volunteer
router.get("/volunteer/completed", verifyToken, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    // Find incidents assigned to this volunteer with status "completed"
    const incidents = await Incident.find({
      "assignedVolunteers.volunteer": volunteerId,
      "assignedVolunteers.status": "completed",
    })
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .sort({ updatedAt: -1 });

    res.json(incidents);
  } catch (err) {
    console.error("Error fetching completed incidents:", err);
    res.status(500).json({ message: "Failed to load completed incidents" });
  }
});
export default router;
