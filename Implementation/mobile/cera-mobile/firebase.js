import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBO3UobNUTZwX-oPkxYFu1x4S9nxMmctE4",
  authDomain: "cera-password-reset.firebaseapp.com",
  projectId: "cera-password-reset",
  storageBucket: "cera-password-reset.firebasestorage.app",
  messagingSenderId: "675015707904",
  appId: "1:675015707904:web:c3565d72b137a6d3cc77e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export auth
export const auth = getAuth(app);

// Optional: export app also
export default app;
