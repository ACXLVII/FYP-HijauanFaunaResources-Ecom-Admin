import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBoXKHI8V_-vACIaWl4ROFEF9HK_XlqavY",
  authDomain: "admin-next-ecom.firebaseapp.com",
  projectId: "admin-next-ecom",
  storageBucket: "admin-next-ecom.appspot.com",
  messagingSenderId: "544863257762",
  appId: "1:544863257762:web:2632a27b32a47cd1aa03fb",
  measurementId: "G-8Y4STJDSG3",
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
