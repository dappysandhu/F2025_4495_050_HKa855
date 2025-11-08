import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const envPath = path.join(__dirname, "../.env");
dotenv.config({ path: envPath });
console.log("[Cloudinary] reading .env at:", envPath, "exists:", fs.existsSync(envPath));

if (!process.env.CLOUDINARY_URL) {
  console.error("[Cloudinary] Missing CLOUDINARY_URL");
  throw new Error("CLOUDINARY_URL not set. Put it in backend/.env (cloudinary://<KEY>:<SECRET>@<CLOUD>)");
}

cloudinary.config({
  secure: true, // serve https
});

console.log("[Cloudinary] configured (URL present)", "folder:", process.env.CLOUDINARY_FOLDER || "(none)");

export default cloudinary;
