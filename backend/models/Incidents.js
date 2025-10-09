// backend/models/Incident.js
import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["fire", "flood", "medical", "rescue", "other"], required: true },
    description: { type: String, default: "" },
    photoUrl: { type: String, default: "./assets/fire.jpg" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "assigned", "in_progress", "resolved"],
      default: "pending",
    },
    assignedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

incidentSchema.index({ location: "2dsphere" });

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;
