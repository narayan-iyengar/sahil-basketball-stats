import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database"; 


const firebaseConfig = {
  apiKey: "AIzaSyCR6PTJ8tfCJy9qZWcp8dW-9UH4ko0yL4M",
  authDomain: "sahil-stats-tracker.firebaseapp.com",
  projectId: "sahil-stats-tracker",
  storageBucket: "sahil-stats-tracker.appspot.com",
  messagingSenderId: "203118165866",
  appId: "1:203118165866:web:8524979c64e4dfdad32f13",
  measurementId: "G-R14NR52088"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const rtdb = getDatabase(app);
