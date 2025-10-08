import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"


dotenv.config()
const app= express()

app.use(cors())
app.use(express.json())

//Routes
app.use("/api/auth", authRoutes)
app.use("/api/users",userRoutes)

//Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
  console.log("Connected to MongoDB successfully");
  app.listen(5000,()=> console.log("Server running on http://localhost:5000")
  )
})

.catch(err=>console.log(err))