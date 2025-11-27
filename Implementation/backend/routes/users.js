import express from "express"
import User from "../models/User.js"
import { verifyToken, isCoordinator} from "../middleware/authMiddleware.js"
import { notifyUser } from "../utils/notifyUser.js";
import { sendPushNotification } from "../utils/sendPushNotification.js";
const router =express.Router()

//get logged in user

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Approve volunteer (Coordinator only)
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { certified: true, approved: true },  
      { new: true }
    );
    res.json({ message: "Volunteer approved", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve volunteer" });
  }
});

// Approve volunteer (Coordinator only)
router.post("/:id/approve", verifyToken, isCoordinator, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { certified: true, approved: true },
      { new: true }
      
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

  
  } catch (err) {
    console.error("Error approving volunteer:", err);
    res.status(500).json({ error: "Failed to approve volunteer" });
  }
});


// Decline volunteer (Coordinator only)
router.post("/:id/decline", verifyToken, isCoordinator, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Volunteer declined and removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to decline volunteer" });
  }
});


//  MUST come before any route that uses "/:id"
router.get("/pending", verifyToken, isCoordinator, async (req, res) => {
  try {
    const pendingVolunteers = await User.find({
      role: "volunteer",
      certified: false,
    }).select("-password");

    res.json(pendingVolunteers);
  } catch (err) {
    console.error("Failed to fetch pending volunteers:", err);
    res.status(500).json({ error: "Failed to fetch pending volunteer requests" });
  }
});


// Get all or approved volunteers
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, approved, certified, available } = req.query;

    const filter = {};

    if (role) filter.role = role;
    if (approved !== undefined) filter.approved = approved === "true";
    if (certified !== undefined) filter.certified = certified === "true";
    if (available !== undefined) filter.available = available === "true";

    const users = await User.find(filter).select("-passwordHash");
    res.json(users);

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
//update location

router.patch("/me/location" , verifyToken , async(req,res)=>{
    const {coordinates}= req.body
    if(!coordinates ||  coordinates.length !==2){
        return res.status(400).json({message:"Invalid coordinates"})
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {location:{type:"Point", coordinates}},
        {new:true}
    )

    res.json({message:"Location updated", user})
})

// Save Expo push token
router.post("/me/push-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token required" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { pushTokens: { platform: "expo", token } } },
      { new: true }
    );

    res.json({ message: "Push token saved", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update profile
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const { username, email, phone, skills } = req.body;

    // Validate required fields (optional)
    if (!username || !email) {
      return res.status(400).json({ message: "Username and email required" });
    }

    // Convert skills to array if sent as string
    let skillsArray = [];
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === "string") {
        skillsArray = skills.split(",").map((s) => s.trim());
      }
    }

    const updateData = { username, email, phone };
    if (skillsArray.length) updateData.skills = skillsArray;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json({ message: "Profile updated", user: userObj });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// near by volunteers
router.get("/nearby", verifyToken, async (req, res) => {
  try {
    const { lat, lng, maxKm = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const volunteers = await User.find({
      role: "volunteer",
      approved: true,        
      certified: true,       
      available: true,       
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxKm * 1000,
        }
      }
    }).select("-passwordHash");

    res.json(volunteers);
  } catch (err) {
    console.error("Nearby volunteer error:", err);
    res.status(500).json({ message: "Error finding volunteers" });
  }
});
   

//sending help message to volunteer
router.post("/:id/request-help", verifyToken, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng required" });
    }

    // Use received address, or fallback to raw coordinates
    const finalAddress = address
      ? address
      : `Lat: ${lat}, Lng: ${lng}`;

    // Debug log
    console.log("Help Request → Sending Address:", finalAddress);

    // Send push notification to selected volunteer
    await notifyUser(
      req.params.id,
      "Emergency Help Request",
      `A nearby resident needs assistance at ${finalAddress}`,
      { lat, 
        lng,
         address: finalAddress,
         coordinates: [lng, lat],  }
    );

    res.json({ message: "Help request sent successfully" });
  } catch (err) {
    console.error("Help request error:", err);
    res.status(500).json({ message: "Failed to send help request" });
  }
});

// UPDATE AVAILABILITY
router.patch("/me/availability", verifyToken, async (req, res) => {
  try {
    const { available } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        available,
        lastAvailableUpdate: new Date(),
      },
      { new: true }
    );

    res.json({
      message: "Availability updated",
      available: user.available,
      lastAvailableUpdate: user.lastAvailableUpdate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update availability" });
  }
});


// UPDATE LIVE LOCATION
router.patch("/me/location", verifyToken, async (req, res) => {
  try {
    const { coordinates } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: { type: "Point", coordinates },
        locationUpdatedAt: new Date(),
      },
      { new: true }
    );

    res.json({ message: "Location updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update location" });
  }
});

// ADD EMERGENCY CONTACT


router.post("/me/emergency-contacts", verifyToken, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { emergencyContacts: { name, phone } } },
      { new: true }
    );

    res.json({
      message: "Contact added",
      emergencyContacts: user.emergencyContacts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE EMERGENCY CONTACT
router.delete("/me/emergency-contacts/:index", verifyToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.emergencyContacts.splice(index, 1);
    await user.save();

    res.json({
      message: "Contact removed",
      emergencyContacts: user.emergencyContacts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;