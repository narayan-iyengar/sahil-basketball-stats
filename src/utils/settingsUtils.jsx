// utils/settingsUtils.js - New utility for Firebase-based settings
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Default settings
const DEFAULT_SETTINGS = {
  gameFormat: "halves",
  periodLength: 20,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Get user settings from Firebase, falling back to localStorage if needed
 * @param {Object} user - Firebase user object
 * @returns {Object} - User settings
 */
export const getUserSettings = async (user) => {
  if (!user || !user.uid) {
    // Fallback to localStorage for non-authenticated users
    return {
      gameFormat: localStorage.getItem("gameFormat") || DEFAULT_SETTINGS.gameFormat,
      periodLength: parseInt(localStorage.getItem("periodLength")) || DEFAULT_SETTINGS.periodLength
    };
  }

  try {
    const settingsRef = doc(db, "userSettings", user.uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const firebaseSettings = settingsSnap.data();
      
      // Also update localStorage as a backup
      localStorage.setItem("gameFormat", firebaseSettings.gameFormat);
      localStorage.setItem("periodLength", firebaseSettings.periodLength.toString());
      
      return firebaseSettings;
    } else {
      // No Firebase settings found, check localStorage and migrate if exists
      const localGameFormat = localStorage.getItem("gameFormat");
      const localPeriodLength = localStorage.getItem("periodLength");
      
      const settings = {
        ...DEFAULT_SETTINGS,
        gameFormat: localGameFormat || DEFAULT_SETTINGS.gameFormat,
        periodLength: localPeriodLength ? parseInt(localPeriodLength) : DEFAULT_SETTINGS.periodLength
      };
      
      // Save to Firebase for future use
      await setDoc(settingsRef, settings);
      
      return settings;
    }
  } catch (error) {
    console.error("Error getting user settings:", error);
    
    // Fallback to localStorage on error
    return {
      gameFormat: localStorage.getItem("gameFormat") || DEFAULT_SETTINGS.gameFormat,
      periodLength: parseInt(localStorage.getItem("periodLength")) || DEFAULT_SETTINGS.periodLength
    };
  }
};

/**
 * Update user settings in Firebase and localStorage
 * @param {Object} user - Firebase user object
 * @param {Object} newSettings - Settings to update
 */
export const updateUserSettings = async (user, newSettings) => {
  const settingsWithTimestamp = {
    ...newSettings,
    updatedAt: new Date().toISOString()
  };

  // Always update localStorage as backup
  if (newSettings.gameFormat) {
    localStorage.setItem("gameFormat", newSettings.gameFormat);
  }
  if (newSettings.periodLength) {
    localStorage.setItem("periodLength", newSettings.periodLength.toString());
  }

  if (!user || !user.uid) {
    console.log("No authenticated user, settings saved to localStorage only");
    return settingsWithTimestamp;
  }

  try {
    const settingsRef = doc(db, "userSettings", user.uid);
    await updateDoc(settingsRef, settingsWithTimestamp);
    
    console.log("Settings updated in Firebase and localStorage");
    return settingsWithTimestamp;
  } catch (error) {
    console.error("Error updating user settings:", error);
    
    // If Firebase update fails, still return the settings (localStorage was updated)
    return settingsWithTimestamp;
  }
};

/**
 * Initialize settings for a new user
 * @param {Object} user - Firebase user object
 */
export const initializeUserSettings = async (user) => {
  if (!user || !user.uid) return DEFAULT_SETTINGS;
  
  try {
    const settingsRef = doc(db, "userSettings", user.uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      // Create initial settings document
      const initialSettings = {
        ...DEFAULT_SETTINGS,
        // Migrate from localStorage if exists
        gameFormat: localStorage.getItem("gameFormat") || DEFAULT_SETTINGS.gameFormat,
        periodLength: parseInt(localStorage.getItem("periodLength")) || DEFAULT_SETTINGS.periodLength
      };
      
      await setDoc(settingsRef, initialSettings);
      console.log("Initialized user settings in Firebase");
      return initialSettings;
    }
    
    return settingsSnap.data();
  } catch (error) {
    console.error("Error initializing user settings:", error);
    return DEFAULT_SETTINGS;
  }
};