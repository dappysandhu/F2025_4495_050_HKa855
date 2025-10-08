import jwt from "jsonwebtoken"

export const verifyToken=(req,res,next)=>{
    try{
        const token=req.headers.authorization?.split(" ")[1]
        if(!token)
            return res.status(401).json({message: "No token provided"})

        const decoded=jwt.verify(token,process.env.JWT_SECRET || "fallbacksecret" )
        req.user=decoded
        next()
    }
    catch{
        res.status(401).json({message:"Invalid token"})
    }
}

export const isCoordinator=(req,res,next)=>{
    if(req.user.role !== "coordinator"){
        return res.status(403).json({message: "Access denied : coordinators only "})
    }

    next()
}