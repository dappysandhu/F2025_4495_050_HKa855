import express from "express";
import User from "../models/User.js";
import Incident from "../models/Incidents.js";
import { verifyToken, isCoordinator } from "../middleware/authMiddleware.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import bcrypt from "bcryptjs";


const router = express.Router();

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 }, dest: "uploads/" });

//  get current user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");
    res.json(user);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});


//
// UPDATE PROFILE PHOTO (CLOUDINARY)
//
router.patch("/me/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "Image upload failed" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: req.file.path },
      { new: true }
    ).select("-passwordHash");

    res.json({ message: "Avatar updated", user });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});


//
// UPDATE USER STATUS (active / busy / away / offline)
//
router.patch("/me/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "busy", "away", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { status },
      { new: true }
    ).select("-passwordHash");

    res.json({ message: "Status updated", user });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ error: err.message });
  }
});


//
// ADD WORK HOURS FOR INCIDENT
//
router.post("/me/work-log", verifyToken, async (req, res) => {
  try {
    const { incidentId, hours } = req.body;

    if (!incidentId || !hours) {
      return res.status(400).json({ message: "Incident ID & hours required" });
    }

    const user = await User.findById(req.user._id);

    const entry = {
      incidentId,
      hours,
      date: new Date(),
    };

    user.workLogs.push(entry);
    user.totalVolunteerHours += Number(hours);

    await user.save();

    res.json({ message: "Work hours logged", entry, total: user.totalVolunteerHours });
  } catch (err) {
    console.error("Work log error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET volunteer stats (MUST BE ABOVE /:id/files and /:id)
router.get("/:id/stats", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("workLogs");
    if (!user) return res.status(404).json({ message: "User not found" });

    const hours = user.workLogs.reduce((sum, w) => sum + Number(w.hours || 0), 0);

    const assigned = await Incident.find({
      "assignedVolunteers.volunteer": user._id,
    }).select("status");

    const inProgress = assigned.filter(i => i.status === "in_progress").length;
    const completed = assigned.filter(i => i.status === "completed").length;

    res.json({ hours, inProgress, completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// APPROVE VOLUNTEER (COORDINATOR ONLY)
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        certified: true,
        approved: true,
        approvedAt: new Date(),
      },
      { new: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Volunteer approved", user });
  } catch (err) {
    console.error("Approve volunteer error:", err);
    res.status(500).json({ error: "Failed to approve volunteer" });
  }
});



//
// DECLINE VOLUNTEER
//
router.post("/:id/decline", verifyToken, isCoordinator, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Volunteer declined and removed" });
  } catch (err) {
    console.error("Decline error:", err);
    res.status(500).json({ error: "Failed to decline volunteer" });
  }
});


//
// GET PENDING VOLUNTEERS
//
router.get("/pending", verifyToken, isCoordinator, async (req, res) => {
  try {
    const pending = await User.find({
      role: "volunteer",
      certified: false,
    }).select("-passwordHash");

    res.json(pending);
  } catch (err) {
    console.error("Fetch pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending volunteers" });
  }
});


//
// GET ALL USERS
//
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, approved } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (approved) filter.approved = approved === "true";

    const users = await User.find(filter).select("-passwordHash");
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});


//
// UPDATE LOCATION GEO
//
router.patch("/me/location", verifyToken, async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { location: { type: "Point", coordinates } },
      { new: true }
    ).select("-passwordHash");

    res.json({ message: "Location updated", user });
  } catch (err) {
    console.error("Location update error:", err);
    res.status(500).json({ error: err.message });
  }
});


//
// SAVE PUSH TOKEN
//
router.post("/me/push-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: "Token required" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { pushTokens: { platform: "expo", token } } },
      { new: true }
    ).select("-passwordHash");

    res.json({ message: "Push token saved", user });
  } catch (err) {
    console.error("Push token error:", err);
    res.status(500).json({ error: err.message });
  }
});


//
// FINAL — UPDATE PROFILE (NEW FIELDS)
//
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "birthDate",
      "phone",
      "address1",
      "address2",
      "city",
      "postal",
      "skills",
      "emergencyContacts",
      "status",
    ];

    const updates = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    // format skills
    if (updates.skills && !Array.isArray(updates.skills)) {
      updates.skills = updates.skills.split(",").map((s) => s.trim());
    }

    // emergency contacts array validation
    if (
      updates.emergencyContacts &&
      !Array.isArray(updates.emergencyContacts)
    ) {
      return res.status(400).json({ message: "Emergency contacts must be array" });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.patch("/me/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // compare current password with stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newHash;
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({ message: "Server error while updating password." });
  }
});

router.get("/me/availability", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("availability");
    res.json(user.availability || []);
  } catch (e) {
    res.status(500).json({ error: "Failed to load availability" });
  }
});

router.post("/me/availability", verifyToken, async (req, res) => {
  try {
    const { weekNumber, weekRange, day, from, to, repeatAllWeek } = req.body;

    if (weekNumber === undefined || weekNumber === null || weekNumber <= 0)
      return res.status(400).json({ message: "Invalid weekNumber" });

    if (!day || !from || !to)
      return res.status(400).json({ message: "Missing fields" });


    const user = await User.findById(req.user._id);

    // helper for saving one day
    const saveDay = (d) => {
      user.availability = user.availability.filter(
        (x) => !(x.weekNumber === weekNumber && x.day === d)
      );

      user.availability.push({
        weekNumber,
        weekRange,
        day: d,
        from,
        to,
        repeatAllWeek,
      });
    };

    if (repeatAllWeek) {
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => saveDay(d));
    } else {
      saveDay(day);
    }

    await user.save();

    res.json({ message: "Availability saved", availability: user.availability });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});


// files handling  (upload, delete, list)
// Get current user's files
router.get("/me/files", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("files");
    res.json(user.files || []);
  } catch (err) {
    console.error("Load files error:", err);
    res.status(500).json({ error: "Failed to load files" });
  }
});


// UPLOAD file
router.post(
  "/me/files",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { category } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // extra safety in backend
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large (max 10MB)" });
      }

      // upload file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "cera_user_files",
        resource_type: "auto",
        flags: "attachment:false",
      });

      const user = await User.findById(req.user._id);

      user.files.push({
        url: result.secure_url,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        category: category || "Other",
      });

      await user.save();

      res.json({ message: "File uploaded", files: user.files });
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ error: "File upload failed" });
    }
  }
);



// DELETE file
router.delete("/me/files/:fileId", verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const user = await User.findById(req.user._id);
    user.files = user.files.filter((file) => String(file._id) !== fileId);

    await user.save();
    res.json({ message: "File removed", files: user.files });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

router.get("/:id/files", verifyToken, isCoordinator, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("files username");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to load volunteer files" });
  }
});

// Get eligible volunteers for dispatch
router.get("/eligible-for-dispatch", verifyToken, isCoordinator, async (req, res) => {
  try {
    const volunteers = await User.find({
      role: "volunteer",
      approved: true,
      certified: true,
      status: { $in: ["active", "busy"] },
    })
      .select("-passwordHash");

    res.json(volunteers);
  } catch (err) {
    console.error("Error loading dispatch volunteers:", err);
    res.status(500).json({ error: "Failed to load volunteers" });
  }
});




export default router;