import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { notifyUser } from "../utils/notifyUser.js";  

const router = express.Router();

/* Register */
router.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password, role, skills, location } = req.body;

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

    // ✅ Notify all coordinators when a volunteer registers
    if (user.role === "volunteer" && !user.certified) {
      const coordinators = await User.find({ role: "coordinator" });
      for (const coord of coordinators) {
        await notifyUser(
          coord._id,
          "New Volunteer Request",
          `${user.username || user.email} has requested approval to join as a volunteer.`,
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

export default router;
