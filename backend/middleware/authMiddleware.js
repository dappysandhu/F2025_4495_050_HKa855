import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT token and attach user info
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecret");

    // Fetch user from DB
    const user = await User.findById(decoded.id).select("_id username name email role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attach plain object instead of raw Mongoose document
    req.user = {
      id: user._id.toString(),
      username: user.username || user.name || "Unknown",
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Coordinator-only middleware
export const isCoordinator = (req, res, next) => {
  if (!req.user || req.user.role !== "coordinator") {
    return res.status(403).json({ message: "Access denied: coordinators only" });
  }
  next();
};
