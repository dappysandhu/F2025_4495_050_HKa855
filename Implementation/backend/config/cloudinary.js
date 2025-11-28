import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  secure: true,
  url: process.env.CLOUDINARY_URL,  
});

console.log("[Cloudinary] Config loaded =>", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? cloudinary.config().api_key.slice(0,4) + "****" : "missing",
});

export default cloudinary;
