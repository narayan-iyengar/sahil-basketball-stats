// presence.jsx - Updated for better security
import { rtdb } from "./firebase";
import { ref, set, remove, onValue, serverTimestamp, onDisconnect } from "firebase/database";

export function setPresence(user, mode = "viewer", liveGameId = null) {
  if (!user || !user.uid) {
    console.warn("Cannot set presence: Invalid user object");
    return;
  }

  // For anonymous users, provide a fallback for name
  const name = user.displayName || 
               user.name || 
               user.email?.split("@")[0] || 
               `Guest-${user.uid.slice(-4)}`;

  const uid = user.uid;

  // Determine the correct path based on mode
  let path;
  if (mode === "viewer" && liveGameId) {
    path = `presence/viewers/${liveGameId}/${uid}`;
  } else if (mode === "admin") {
    path = `presence/admins/${uid}`;
  } else {
    console.warn("Invalid presence mode or missing gameId for viewer");
    return;
  }

  const presenceData = {
    uid,
    name,
    mode,
    ts: serverTimestamp(),
    ...(liveGameId && { liveGameId })
  };

  try {
    // Set presence
    const presenceRef = ref(rtdb, path);
    set(presenceRef, presenceData);
    
    // Set up automatic cleanup when user disconnects
    onDisconnect(presenceRef).remove();
    
    console.log(`Presence set for ${mode}: ${name}`);
  } catch (error) {
    console.error("Error setting presence:", error);
  }
}

export function removePresence(user, mode = "viewer", liveGameId = null) {
  if (!user || !user.uid) return;

  let path;
  if (mode === "viewer" && liveGameId) {
    path = `presence/viewers/${liveGameId}/${user.uid}`;
  } else if (mode === "admin") {
    path = `presence/admins/${user.uid}`;
  } else {
    return;
  }

  try {
    remove(ref(rtdb, path));
    console.log(`Presence removed for ${mode}: ${user.uid}`);
  } catch (error) {
    console.error("Error removing presence:", error);
  }
}

export function listenPresence(mode = "viewer", liveGameId = null, callback) {
  if (!callback) {
    console.warn("No callback provided for presence listener");
    return;
  }

  let path;
  if (mode === "viewer" && liveGameId) {
    path = `presence/viewers/${liveGameId}`;
  } else if (mode === "admin") {
    path = `presence/admins`;
  } else {
    console.warn("Invalid presence mode or missing gameId");
    return;
  }

  try {
    return onValue(ref(rtdb, path), (snapshot) => {
      const data = snapshot.val() || {};
      const presenceList = Object.values(data);
      callback(presenceList);
    }, (error) => {
      console.error("Error listening to presence:", error);
      callback([]); // Return empty array on error
    });
  } catch (error) {
    console.error("Error setting up presence listener:", error);
    return () => {}; // Return empty cleanup function
  }
}

// Helper function to clean up stale presence data
export function cleanupStalePresence(maxAgeMinutes = 30) {
  // This would need to be called periodically, perhaps from an admin interface
  // or a Firebase Cloud Function on a schedule
  const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
  
  // Note: This requires elevated permissions and should probably be done
  // server-side with Firebase Cloud Functions for better security
  console.log("Cleanup function would remove presence older than", new Date(cutoffTime));
}

export { removePresence as clearPresence };