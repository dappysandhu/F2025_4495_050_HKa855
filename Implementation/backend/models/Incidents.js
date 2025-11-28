import mongoose from "mongoose";

// Log sub-schema
const logSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["assigned", "accepted", "declined", "approved", "resolved", "in_progress", "completed",              // ✅ added
        "contacted_coordinators",],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Assigned volunteer sub-schema
const assignedVolunteerSchema = new mongoose.Schema(
  {
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "in_progress", "completed"],
      default: "pending",
      lowercase: true,
    },
    respondedAt: { type: Date },
  },
  { _id: false }
);

// Main incident schema
const incidentSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reporterName: { type: String, trim: true },
    type: {
      type: String,
      enum: [
        "fire",
        "flood",
        "medical",
        "rescue",
        "accident",
        "crime",
        "earthquake",
        "other",
      ],
      required: true,
      trim: true,
    },
    customType: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    photos: { type: [String], default: [] },
    cloudinaryPublicIds: { type: [String], default: [] },
    severity: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
    affected: { type: Number, default: 0, min: 0 },

    // Duration and timestamps
    workedHours: { type: Number, default: 0 },   // task duration (in hours)
    assignedAt: Date,
    completedAt: Date,

    
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
      name: { type: String, trim: true },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "assigned", "in_progress", "completed"],
      default: "pending",
      lowercase: true,
    },

    assignedVolunteers: [assignedVolunteerSchema],
    logs: [logSchema],
  },
  { timestamps: true }
);

// Index for geospatial queries
incidentSchema.index({ location: "2dsphere" });

export default mongoose.model("Incident", incidentSchema);
