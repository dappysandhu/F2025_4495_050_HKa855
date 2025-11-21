import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Incident from "../models/Incidents.js";
import User from "../models/User.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";
import { sendPushNotification } from "../utils/sendPushNotification.js";

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

const router = express.Router();

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

    res.status(201).json(incident);
  } catch (err) {
    console.error("Incident creation error:", err);
    res.status(500).json({ error: err?.message || "Server error creating incident" });
  }
});



// GET ALL INCIDENTS
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

// GET MY INCIDENTS (Resident)
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

// GET NEARBY INCIDENTS (Volunteer)
router.get("/nearby", verifyToken, async (req, res) => {
  try {
    const {
      lng,
      lat,
      maxKm = 10,
      unassigned,
      type,            
      severity,       
      status,        
      limit = 50,
    } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: "lng and lat required" });
    }

    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(maxKm) * 1000,
        },
      },
    };

    // Unassigned only
    if (unassigned === "true") {
      query.$or = [
        { assignedVolunteers: { $exists: false } },
        { assignedVolunteers: { $size: 0 } },
      ];
    }

    // Type filter (schema stores lowercase)
    if (type) {
      const t = type.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (t.length) query.type = { $in: t };
    }

    // Severity filter
    if (severity) {
      const s = severity.split(",").map(s => s.trim()).filter(Boolean);
      if (s.length) query.severity = { $in: s };
    }

    // Status filter
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
        const vid = typeof v.volunteer === "object" ? v.volunteer?._id?.toString() : v.volunteer?.toString();
        return vid === userId;
      });
      return { ...incident, isAssignedToUser: !!myAssignment, userAssignmentStatus: myAssignment?.status || null };
    });

    res.json(enhanced);
  } catch (err) {
    console.error("Nearby fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// get single incident details
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reporter", "username email role")
      .populate("assignedVolunteers.volunteer", "username email role")
      .populate("logs.actor", "username email role")
      .populate("logs.target", "username email role");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // Volunteers can only see incidents assigned to them
    if (req.user.role === "volunteer") {
      const assigned = incident.assignedVolunteers?.some((v) =>
        v.volunteer?._id?.toString() === req.user._id?.toString()
      );
      if (!assigned) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    res.json(incident);
  } catch (err) {
    console.error("Incident detail error:", err);
    res.status(500).json({ error: err.message });
  }
});


// incident handling approval, acceptance, status updates
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

// DECLINE
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
    const allDeclined = incident.assignedVolunteers.every((v) => v.status === "declined");
    if (allDeclined) {
      incident.status = "approved";
      await incident.save();
    }

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

// STATUS UPDATE
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

// ASSIGNED TO ME
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

    console.log(`Found ${assignedToMe.length} assigned incidents for volunteer ${userId}`);
    res.json(assignedToMe);
  } catch (err) {
    console.error("Error fetching assigned tasks:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// APPROVE (Coordinator)
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reporter", "name email")
      .populate("assignedVolunteers.volunteer", "name email role");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    incident.status = "approved";
    incident.logs.push({
      action: "approved",
      actor: req.user._id,
      message: `Incident approved by coordinator ${req.user.username || req.user.email}`,
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

// DISPATCH (Coordinator)
router.post("/:id/dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const { volunteerIds } = req.body; // Array of user IDs
    if (!Array.isArray(volunteerIds) || volunteerIds.length === 0) {
      return res.status(400).json({ message: "No volunteers provided" });
    }

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

    return res.json({ message: "Volunteers assigned successfully", incident: populated });
  } catch (err) {
    console.error("Dispatch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// REMOVE A SINGLE PHOTO 
router.patch("/:id/remove-photo", verifyToken, async (req, res) => {
  try {
    const { publicId, url } = req.body || {};
    if (!publicId && !url) {
      return res.status(400).json({ message: "publicId or url is required" });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const userId = (req.user.id || req.user._id).toString();
    const isReporter = incident.reporter?.toString?.() === userId;
    if (!isReporter && req.user.role !== "coordinator") {
      return res.status(403).json({ message: "Not authorized" });
    }

    let pid = publicId;
    if (!pid && url) pid = publicIdFromUrl(url);

    if (pid) {
      // remove by publicId
      const idxPid = (incident.cloudinaryPublicIds || []).indexOf(pid);
      if (idxPid !== -1) {
        incident.cloudinaryPublicIds.splice(idxPid, 1);
        if (incident.photos?.[idxPid]) incident.photos.splice(idxPid, 1);
      } else if (url) {
        // fallback remove by URL
        incident.photos = (incident.photos || []).filter((u) => u !== url);
      }
    } else if (url) {
      incident.photos = (incident.photos || []).filter((u) => u !== url);
    }

    // update primary
    if (incident.photoUrl && !incident.photos.includes(incident.photoUrl)) {
      incident.photoUrl = incident.photos[0] || "";
    }

    await incident.save();

    if (pid) {
      await cloudinary.uploader.destroy(pid).catch((e) =>
        console.warn("Cloudinary destroy failed:", pid, e?.message || e)
      );
    }

    res.json({ message: "Photo removed", incident });
  } catch (err) {
    console.error("Remove photo error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE INCIDENT (cleanup Cloudinary)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: "Incident not found" });

    const userId = (req.user.id || req.user._id).toString();
    const isReporter = incident.reporter?.toString?.() === userId;

    if (!isReporter && req.user.role !== "coordinator") {
      return res.status(403).json({ message: "Not authorized to delete this incident" });
    }

    let publicIds = incident.cloudinaryPublicIds || [];
    if (!publicIds.length && incident.photos?.length) {
      publicIds = incident.photos.map(publicIdFromUrl).filter(Boolean);
    }

    await deleteCloudinaryByPublicIds(publicIds);
    await Incident.deleteOne({ _id: incident._id });

    res.json({ message: "Incident deleted and images cleaned up" });
  } catch (err) {
    console.error("Delete incident error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
