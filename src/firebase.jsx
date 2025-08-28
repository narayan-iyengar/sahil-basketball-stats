// firebase.jsx - Add anonymous auth support
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInAnonymously } from "firebase/auth";


const firebaseConfig = {
  // Your existing config
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

// Add this line to force account selection
provider.setCustomParameters({
  prompt: 'select_account'
});


// Helper function for anonymous sign-in
export const signInAnonymousUser = async () => {
  try {
    const result = await signInAnonymously(auth);
    console.log("Anonymous user signed in:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};