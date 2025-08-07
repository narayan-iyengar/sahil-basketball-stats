import React, { useEffect, useState } from "react";
import { auth, db, provider, rtdb } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Header from "./Header";
import Dashboard from "./Dashboard";
import LiveGameAdmin from "./LiveGameAdmin";
import LiveGameViewer from "./LiveGameViewer";
import { setPresence, removePresence, listenPresence } from "./presence";
import GameSetup from "./GameSetup";
import { signInWithPopup } from "firebase/auth";
import AuthScreen from "./AuthScreen";

const signInWithGoogle = () => signInWithPopup(auth, provider);


export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [page, setPage] = useState("game_setup");
  const [liveGameId, setLiveGameId] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [viewers, setViewers] = useState([]);
const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);

  // Handle auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setPage("game_setup"); // Set default page after login
      }
    });
    return unsub;
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Presence listeners (global, not per game)
  useEffect(() => {
    if (!user) return;
    const offAdmins = listenPresence("admin", null, setAdmins);
    const offViewers = listenPresence("viewer", null, setViewers);

    return () => {
      if (typeof offAdmins === "function") offAdmins();
      if (typeof offViewers === "function") offViewers();
    };
  }, [user]);

  // Presence per page (admin or viewer)
  useEffect(() => {
    if (!user) return;
    if (page === "live_admin" && liveGameId) {
      setPresence(user, "admin");
    } else if (page === "live_viewer" && liveGameId) {
      setPresence(user, "viewer", liveGameId);
    }

    const handleUnload = () => {
      removePresence(user, "admin");
      if (liveGameId) removePresence(user, "viewer", liveGameId);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user, page, liveGameId]);

  // If not authenticated, show AuthScreen and wire onSignIn properly
  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />;
  }

  return (
    <>
      <Header
        user={user}
        onSignOut={() => signOut(auth)}
        setPage={setPage}
        theme={theme}
        toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        admins={admins}
        viewers={viewers}
        page={page}
      />
<main className="p-2 sm:p-4 md:p-8">
        {page === "game_setup" && (
          <GameSetup
            teams={teams}
            stats={stats}
            onSubmit={handleGameSetupSubmit}
            onAddTeam={handleAddTeam}
          />
        )}
        {page === "dashboard" && (
          <Dashboard
            teams={teams} 
            stats={stats} 
            onAddTeam={handleAddTeam}
            onEdit={(game) => { 
              setEditingGame(game);
            }} 
            onDeleteStat={handleDeleteStat}
            onDeleteTeam={handleDeleteTeam}
            onDeleteGame={handleDeleteGame}
            onUpdateStat={handleUpdateStat}
          />
        )}
        {page === "add_stat" && (
          <AddStatForm 
            gameConfig={gameConfig}
            onAddStat={handleAddStat}
            onCancel={() => setPage("game_setup")}
          />
        )}
        {page === "live_game_admin" && liveGameId && (
          <LiveGameAdmin
            db={db}
            gameId={liveGameId}
            appId={appId}
            user={user}
            onEndGame={handleEndLiveGame}
          />
        )}
        {editingGame && (
          <AddStatForm
            isEditing
            gameConfig={editingGame}
            onUpdateStat={handleUpdateStat}
            onCancel={() => setEditingGame(null)}
          />
        )}
      </main>
    </>
  );
}

