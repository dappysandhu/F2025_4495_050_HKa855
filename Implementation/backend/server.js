import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import incidentRoutes from "./routes/incidents.js"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import notificationRoutes from "./routes/notifications.js";


dotenv.config()
const app= express()

app.use(cors())
app.use(express.json({ limit: "10mb" }))

// Basic security headers
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));



//Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);


// Health check route (handy for testing)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CERA backend running fine!" });
});

//Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
  console.log("Connected to MongoDB successfully");
  app.listen(5000,()=> console.log("Server running on http://localhost:5000")
  )
})

.catch(err=>console.log(err))