// presence.jsx
import { rtdb } from "./firebase";
import { ref, set, remove, onValue, serverTimestamp } from "firebase/database";



/* OLD SET PRESENCE
// user, mode = "viewer" | "admin", liveGameId (optional for viewer mode)
export function setPresence(user, mode = "viewer", liveGameId = null) {
  if (!user) return;
  const path =
    mode === "viewer" && liveGameId
      ? `presence/viewers/${liveGameId}/${user.uid}`
      : `presence/${mode}s/${user.uid}`;
  set(ref(rtdb, path), {
    uid: user.uid,
    name: user.displayName,
    photoURL: user.photoURL || "",
    mode,
    liveGameId: liveGameId || null,
    ts: Date.now(),
  });
}
*/

export function setPresence(user, mode = "viewer", liveGameId = null) {
  if (!user) return;
  // For anonymous users, provide a fallback for name
  const name =
    user.displayName ||
    user.name || // sometimes you generate this in the anonymous user object
    "Anonymous" || 
    user.email?.split("@")[0] ||  ""
    const uid = user.uid || 
    ("Viewer #" + (user.uid?.slice(-4) || Math.floor(Math.random()*1000)));

  const path =
    mode === "viewer" && liveGameId
      ? `presence/viewers/${liveGameId}/${uid}`
      : `presence/${mode}s/${uid}`;

  set(ref(rtdb, path), {
    uid,
    name,
    mode,
    liveGameId: liveGameId || null,
    ts: Date.now(),
  });
}


export function removePresence(user, mode = "viewer", liveGameId = null) {
  if (!user) return;
  const path =
    mode === "viewer" && liveGameId
      ? `presence/viewers/${liveGameId}/${user.uid}`
      : `presence/${mode}s/${user.uid}`;
  remove(ref(rtdb, path));
}
// Listen for ALL admins or ALL viewers, or for viewers of a particular gameId
export function listenPresence(mode = "viewer", liveGameId = null, cb) {
  const path =
    mode === "viewer" && liveGameId
      ? `presence/viewers/${liveGameId}`
      : `presence/${mode}s`;
  return onValue(ref(rtdb, path), (snap) => {
    const val = snap.val() || {};
    // Always return an array
    cb(Object.values(val));
  });
}
export { removePresence as clearPresence };
