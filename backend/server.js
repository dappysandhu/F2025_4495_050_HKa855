const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const User = require("./models/User");

const app = express();
app.use(cors());

// middleware
app.use(express.json());

// health check route
app.get("/", (req, res) => res.send("CERA Backend Running"));



// test route to create a user
app.get("/test-user", async (req, res) => {
  const user = new User({ name: "Test User", email: "test@example.com" });
  await user.save();
  res.json(user);
});





// connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log("--------------------------------");
        console.log("MongoDB connected successfully");
        app.listen(5000, () => console.log("Server running on port 5000"));
    })
    .catch(err => {
        console.error("MongoDB connection failed:", err.message);
    });
