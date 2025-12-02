import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { notifyUser } from "../utils/notifyUser.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

/* Register */
router.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password, role, skills, location } =
      req.body;

    // Check duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      phone,
      passwordHash: hashedPassword,
      role,
      skills,
      location,
      certified: role === "volunteer" ? false : true,
    });

    await user.save();

    //Notify all coordinators when a volunteer registers
    if (user.role === "volunteer" && !user.certified) {
      const coordinators = await User.find({ role: "coordinator" });
      for (const coord of coordinators) {
        await notifyUser(
          coord._id,
          "New Volunteer Request",
          `${
            user.username || user.email
          } has requested approval to join as a volunteer.`,
          { userId: user._id }
        );
      }
      console.log(`Coordinators notified about volunteer ${user.username}`);
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* Login */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    // check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    // volunteer must be certified
    if (user.role === "volunteer" && !user.certified) {
      return res.status(403).json({
        message: "Volunteer account pending approval by coordinator.",
      });
    }

    // sign token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// forgot password email link generation
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      // Do NOT reveal if user exists — security best practice
      return res.json({ message: "If that email exists, reset link sent" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token to store in DB
    const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 10; // 10 min expiry
    await user.save();

    // Reset URL (mobile OR web)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = {
      from: "CERA Support <no-reply@cera-app.com>",
      to: user.email,
      subject: "CERA Password Reset",
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 10 minutes.</p>
      `,
    };

    await transporter.sendMail(message);

    res.json({ message: "Reset link sent to email if account exists" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// reset [password]
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ message: "Token and new password required" });

    // Hash token to compare
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with token valid and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    // Clear token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: "Password has been reset successfully" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
