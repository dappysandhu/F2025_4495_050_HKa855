import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username:{type : String , required : true},
  email:{type : String, required : true, unique : true},
  phone:{ type : String},
  passwordHash:{type :String ,required : true},
  role: { type: String, enum: ["resident", "volunteer","coordinator"], default: "resident" },
  skills: [{ type: String }],
  certified: { type: Boolean, default: false },
  approved:{type : Boolean , default: false},

  available: { type: Boolean, default: false },
  lastAvailableUpdate: { type: Date },

  emergencyContacts: [
  {
    name: String,
    phone: String,
  }
],
  location: {
   type: {type: String , enum: [ "Point"], default: "Point"},
    coordinates:{type: [Number] , default: [0,0]}
  },
   pushTokens: [{ platform: String, token: String }] 
},
{timestamps: true}
);

userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);

export default User;
