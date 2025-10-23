import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT token and attach user info
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecret");

    // handle either decoded.id or decoded._id
    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Fetch user from DB
    const user = await User.findById(userId).select("_id username name email role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attach consistent user object (with _id)
    req.user = {
      _id: user._id.toString(),
      username: user.username || user.name || "Unknown",
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
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
