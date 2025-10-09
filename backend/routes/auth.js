import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'


const router=express.Router()

//register
router.post("/register", async(req, res)=>{
    try{
        const { username,email,phone,password,role,skills,location}= req.body

        const existingUser= await User.findOne({email})
        if(existingUser)
            return res.status(400).json({message:"Email already exists"})

        const hashedPassword= await bcrypt.hash(password,10)

        const user= new User({
            username,
            email,
            phone,
            passwordHash:hashedPassword,
            role,
            skills,
            location,
            certified:role==="volunteer" ? false: true
        })


        await user.save()

        const token=jwt.sign({id:user._id , role:user.role} , process.env.JWT_SECRET, {expiresIn: "7d" })

        res.status(201).json({token,user})

    }
    catch(err){
        res.status(500).json({error:err.message})
    }
})



//Login

router.post("/login", async(req,res)=>{
    try{
        const{email,password}=req.body

        //Default coordinator

        const defaultCoordinator={
            email:"coordinator@gmail.com",
            password:"coordinator123",
            role:"coordinator",
            id:"coordinator123",
        }

        //if login matches with credentials
        if(email===defaultCoordinator.email && password===defaultCoordinator.password){
            const token=jwt.sign(
                {id:defaultCoordinator.id , role:defaultCoordinator.role},
                process.env.JWT_SECRET,
                {expiresIn:"7d"}
            )
            return res.json({token,user:defaultCoordinator})
        }
        const user= await User.findOne({email})

        if(!user)
            return res.status(400).json({message: "Invalid email or password"})

        const isMatch= await bcrypt.compare(password,user.passwordHash)
        if(!isMatch)
            return res.status(400).json({message:"Invalid email or password"})


        if(user.role==="volunteer" && !user.certified){
            return res.status(403).json({message:" volunteer account pending from coordinator approval"})
        }
        const token=jwt.sign({id:user._id, role:user.role} , process.env.JWT_SECRET, {expiresIn :"7d"})

       res.json({token,user})
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
})

export default router;