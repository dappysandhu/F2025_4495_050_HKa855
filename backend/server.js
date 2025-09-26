import "dotenv/config";
import express, { json } from "express";
import { connect } from "mongoose";
import cors from "cors";
import User from "./models/User.js";
import "dotenv/config";

const app = express();
app.use(cors());

// middleware
app.use(json());

// health check route
app.get("/", (req, res) => res.send("CERA Backend Running"));

// test route to create a user
app.get("/test-user", async (req, res) => {
  const user = new User({ name: "Test User", email: "test@example.com" });
  await user.save();
  res.json(user);
});

// connect to MongoDB
connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("--------------------------------");
    console.log("MongoDB connected successfully");
    app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });
