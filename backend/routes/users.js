import express from "express"
import User from "../models/User.js"
import { verifyToken, isCoordinator} from "../middleware/authMiddleware.js"

const router =express.Router()

//get logged in user

router.get("/me",verifyToken,async(req,res)=>{
    const user=await User.findById(req.user.id).select("-password")
    res.json(user)
})

//approve volunteer

router.post("/:id/approve", verifyToken, isCoordinator, async(req,res)=>{
    const user=await User.findByIdAndUpdate(
        req.params.id,
        {certified:true},
        {new:true}
    )

    res.json({message:"Volunteer approved", user})

})

//update location

router.patch("/me/location" , verifyToken , async(req,res)=>{
    const {coordinates}= req.body
    if(!coordinates ||  coordinates.length !==2){
        return res.status(400).json({message:"Invalid coordinates"})
    }

    const user=await User.findByIdAndUpdate(
        req.user.id,
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
      req.user.id,
      { $addToSet: { pushTokens: { platform: "expo", token } } },
      { new: true }
    );

    res.json({ message: "Push token saved", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



export default router;