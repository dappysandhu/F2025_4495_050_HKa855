import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

//get all notifications for logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const notes = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// mark as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save new notification (called when task assigned)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    const note = await Notification.create({
      user: userId,
      title,
      body,
      data,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
