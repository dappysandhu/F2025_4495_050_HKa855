import mongoose from "mongoose";

const EmergencyContactSchema = new mongoose.Schema({
  name: String,
  relation: String,
  phone: String,
});

const FileSchema = new mongoose.Schema(
  {
    url: String,
    name: String,
    type: String,
    size: Number,
    category: {
      type: String,
      enum: ["Certificate", "ID", "Training", "Other"],
      default: "Other",
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);


const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },

    // Basic info
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    birthDate: { type: Date },

    // Contact
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },

    // Address
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    city: { type: String, default: "" },
    postal: { type: String, default: "" },

    // Skills
    skills: { type: [String], default: [] },

    // Emergency contacts
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },

    // Auth
    passwordHash: { type: String, required: true },

    // Roles
    role: {
      type: String,
      enum: ["resident", "volunteer", "coordinator"],
      default: "resident",
    },

    certified: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },

    // Location
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // Profile photo
    avatarUrl: { type: String, default: "" },

    // Status
    status: {
      type: String,
      enum: ["active", "busy", "away", "offline"],
      default: "active",
    },

    // Volunteer hours
    workLogs: [
      {
        incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Incident" },
        hours: Number,
        date: Date,
      },
    ],

    approvedAt: {
      type: Date,
      default: null,
    },

   files: {
      type: [FileSchema],
      default: [],
    },

    totalVolunteerHours: { type: Number, default: 0 },

    availability: [
      {
        weekNumber: Number,    
        weekRange: String,     
        day: String,           
        from: String,        
        to: String,             
        repeatAllWeek: Boolean,
      }
    ],


    // Push notifications
    pushTokens: [{ platform: String, token: String }],
  },
  { timestamps: true }
);

// Geo index
userSchema.index({ location: "2dsphere" });

const User = mongoose.model("User", userSchema);
export default User;
