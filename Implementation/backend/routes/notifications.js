import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Fetch notifications for the logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id; // ✅ use _id, not id
    const notes = await Notification.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mark a notification as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const note = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(note);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
