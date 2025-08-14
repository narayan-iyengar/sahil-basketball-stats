import React, { useEffect, useState, useCallback } from "react";
import { auth, db, rtdb, provider } from "./firebase";
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import GameSetup from "./GameSetup";
import Dashboard from "./Dashboard";
import Header from "./Header";
import AuthScreen from "./AuthScreen";
import LiveGameAdmin from "./LiveGameAdmin";
import LiveGameViewer from "./LiveGameViewer";
import StatEntry from "./StatEntry"; // Import the unified stat entry component
import { listenPresence, setPresence, removePresence } from "./presence";
import SettingsModal from "./SettingsModal";
import { PhotoUpload, PhotoThumbnails } from "./photo_system";

export default function App() {
  // Auth & User
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage with fallback
    return localStorage.getItem("theme") || "light";
  });
  const [loading, setLoading] = useState(true);
  const [liveGameLoading, setLiveGameLoading] = useState(true);

  // App State
  const [page, setPage] = useState("game_setup");
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState([]);
  const [liveGameId, setLiveGameId] = useState(null);
  const [currentGameConfig, setCurrentGameConfig] = useState(null); // For stat entry

  // Settings Modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Game setup global settings
  const [globalGameFormat, setGlobalGameFormat] = useState(() => {
    return localStorage.getItem("gameFormat") || "halves";
  });
  const [globalPeriodLength, setGlobalPeriodLength] = useState(() => {
    return parseInt(localStorage.getItem("periodLength")) || 20;
  });
  const [globalNumPeriods, setGlobalNumPeriods] = useState(2);

  // Presence State
  const [admins, setAdmins] = useState([]);
  const [viewers, setViewers] = useState([]);


  // --- AUTH LOGIC ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        removePresence(user, "viewer", liveGameId);
        removePresence(user, "admin", liveGameId);
      }
    });
    return unsub;
    // eslint-disable-next-line
  }, []);

  // --- THEME LOGIC ---
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  // --- DATA LOADERS ---
  useEffect(() => {
    if (!user) return;
    const teamsCol = collection(db, "teams");
    const unsub = onSnapshot(teamsCol, (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const gamesCol = collection(db, "games");
    const unsub = onSnapshot(gamesCol, (snap) => {
      const gamesArr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGames(gamesArr);
    });
    return unsub;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const statsCol = collection(db, "stats");
    const unsub = onSnapshot(statsCol, (snap) => {
      setStats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // --- PRESENCE LOGIC ---
  useEffect(() => {
    if (!user) return;
    setPresence(user, "admin");
    const unsub = listenPresence("admin", null, (arr) => setAdmins(arr || []));
    return () => {
      removePresence(user, "admin");
      if (unsub && typeof unsub === "function") unsub();
    };
  }, [user]);
  useEffect(() => {
    const unsub = listenPresence("viewer", null, (arr) => setViewers(arr || []));
    return () => {
      if (unsub && typeof unsub === "function") unsub();
    };
  }, []);

  // --- LIVE GAME ID TRACKER ---
  useEffect(() => {
    setLiveGameLoading(true);
    const liveGamesCol = collection(db, "liveGames");
    const unsub = onSnapshot(liveGamesCol, (snap) => {
      if (!snap.empty) {
        setLiveGameId(snap.docs[0].id);
      } else {
        setLiveGameId(null);
      }
      setLiveGameLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [page]);

  // --- LIVE PAGE REDIRECT (Anonymous Viewer) ---
  useEffect(() => {
    if (!user && liveGameId && page !== "live_viewer") {
      setPage("live_viewer");
    }
  }, [user, liveGameId, page]);

  // --- CRUD CALLBACKS ---

const handleUpdateGamePhotos = async (gameId, photos) => {
  try {
    await updateDoc(doc(db, "games", gameId), { photos });
    // Update local state
    setGames((games) => 
      games.map((game) => 
        game.id === gameId ? { ...game, photos } : game
      )
    );
  } catch (error) {
    console.error("Error updating game photos:", error);
  }
};
  // --- TEAM & GAME LOGIC ---
  const handleDeleteTeam = useCallback(async (teamId) => {
    await deleteDoc(doc(db, "teams", teamId));
    setTeams((teams) => teams.filter((t) => t.id !== teamId));
  }, []);
  const handleAddTeam = async (teamName) => {
    const exists = teams.some((team) => team.name.toLowerCase() === teamName.toLowerCase());
    if (exists) return null;
    const docRef = await addDoc(collection(db, "teams"), { name: teamName });
    setTeams((t) => [...t, { name: teamName, id: docRef.id }]);
    return { name: teamName, id: docRef.id };
  };
  const handleAddGame = useCallback(async (game) => {
    const docRef = await addDoc(collection(db, "games"), game);
    setGames((g) => [...g, { ...game, id: docRef.id }]);
  }, []);
  const handleAddStat = useCallback(async (stat) => {
    // Calculate points from the stat data
    const points = (stat.fg2m * 2) + (stat.fg3m * 3) + stat.ftm;
    
    // Determine outcome
    let outcome = "T";
    if (stat.myTeamScore > stat.opponentScore) outcome = "W";
    else if (stat.myTeamScore < stat.opponentScore) outcome = "L";

    // Create the final game record
    const gameRecord = {
      ...currentGameConfig,
      ...stat,
      points,
      outcome,
      status: "final",
      createdAt: new Date().toISOString(),
      adminName: user?.displayName ? user.displayName.split(" ")[0] : "",
    };

    const docRef = await addDoc(collection(db, "games"), gameRecord);
    setGames((g) => [...g, { ...gameRecord, id: docRef.id }]);
    
    // Clear the config and return to dashboard
    setCurrentGameConfig(null);
    setPage("dashboard");
  }, [currentGameConfig, user]);

  const handleDeleteGame = useCallback(async (gameId) => {
    await deleteDoc(doc(db, "games", gameId));
    setGames((g) => g.filter((x) => x.id !== gameId));
    setStats((s) => s.filter((x) => x.gameId !== gameId));
  }, []);

  // --- END GAME LOGIC ---
  const handleEndGame = async (liveGameId) => {
    try {
      const liveGameRef = doc(db, "liveGames", liveGameId);
      const liveGameSnap = await getDoc(liveGameRef);
      if (!liveGameSnap.exists()) {
        console.log("Live game not found for endGame, id:", liveGameId);
        return;
      }
      const adminName = user?.displayName ? user.displayName.split(" ")[0] : "";
      const gameData = liveGameSnap.data();
      const playerStats = gameData.playerStats || {};
      const myTeamScore = gameData.homeScore ?? 0;
      const opponentScore = gameData.awayScore ?? 0;
      let outcome = "T";
      if (myTeamScore > opponentScore) outcome = "W";
      else if (myTeamScore < opponentScore) outcome = "L";
      const finalGame = {
        ...gameData,
        myTeamScore,
        opponentScore,
        outcome,
        points: (playerStats.fg2m ?? 0) * 2 +
          (playerStats.fg3m ?? 0) * 3 +
          (playerStats.ftm ?? 0) * 1,
        fg2m: playerStats.fg2m ?? 0,
        fg2a: playerStats.fg2a ?? 0,
        fg3m: playerStats.fg3m ?? 0,
        fg3a: playerStats.fg3a ?? 0,
        ftm: playerStats.ftm ?? 0,
        fta: playerStats.fta ?? 0,
        rebounds: playerStats.rebounds ?? 0,
        assists: playerStats.assists ?? 0,
        steals: playerStats.steals ?? 0,
        blocks: playerStats.blocks ?? 0,
        fouls: playerStats.fouls ?? 0,
        turnovers: playerStats.turnovers ?? 0,
        endedAt: new Date().toISOString(),
        status: "final",
        adminName,
        isRunning: false
      };
      const docRef = await addDoc(collection(db, "games"), finalGame);
      await deleteDoc(liveGameRef);
      setLiveGameId(null);
      setPage("game_setup");
      const gamesCol = collection(db, "games");
      const snap = await getDocs(gamesCol);
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to save/end game:", err);
    }
  };

  // --- DELETE ALL LIVE GAMES ---
  const handleDeleteAllLiveGames = async () => {
if (!user) return null;
    //if (!window.confirm("Are you sure you want to delete ALL live games?")) return;
    const snapshot = await getDocs(collection(db, "liveGames"));
    for (let gameDoc of snapshot.docs) {
      await deleteDoc(doc(db, "liveGames", gameDoc.id));
    }
    //alert("All live games cleaned up!"); 

    setLiveGameId(null);
  };

  // --- NAV HELPERS ---
  const handleSignIn = async () => {
    await signInWithPopup(auth, provider);
  };
  const handleSignOut = async () => {
try {
    // Remove admin presence if user was scoring
    removePresence(user, "viewer", liveGameId);
    if (user) {
      removePresence(user, "admin");
    }
    if (page === "live_admin" && liveGameId) {
  await handleEndGame(liveGameId);
}
    await signOut(auth); // <-- Firebase sign out
    setUser(null);
    setPage("game_setup"); 
    setLiveGameId(null);
    setGames([]);
    setStats([]);
    setAdmins([]);
    setViewers([]);
    // Any other state you want to clear?
  } catch (err) {
    console.error("Error signing out:", err);
  }
  };

  // Handle new game (setup new or live)
  const handleSubmitGame = async (config, mode) => {
    const newGame = {
      ...config,
      createdBy: user?.uid || null,
      createdAt: new Date().toISOString(),
      status: mode === "live" ? "live" : "final",
      playerStats: {
        fg2m: 0, fg2a: 0,
        fg3m: 0, fg3a: 0,
        ftm: 0, fta: 0,
        rebounds: 0, assists: 0, steals: 0,
        blocks: 0, fouls: 0, turnovers: 0,
      },
      homeScore: 0,
      awayScore: 0,
      isRunning: false,
      clock: (globalPeriodLength ? globalPeriodLength * 60 : 600),
      period: 1,
      gameFormat: globalGameFormat || "halves",
      periodLength: globalPeriodLength || 20,
      numPeriods: globalGameFormat === "halves" ? 2 : 4,
    };
    if (mode === "live") {
      const docRef = await addDoc(collection(db, "liveGames"), newGame);
      setLiveGameId(docRef.id);
      setPage("live_admin");
    } else {
      // For final games, set up the stat entry form
      setCurrentGameConfig(newGame);
      setPage("add_stat");
    }
  };




  // --- PAGE RENDER LOGIC ---
  if (loading || liveGameLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <span className="text-orange-500 font-bold text-3xl animate-spin-slow">🏀</span>
        <span className="ml-4">Loading App...</span>
      </div>
    );
  }

if (!user && page === "live_viewer") {
  if (liveGameId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <Header
          user={null}
          db={db}
          onSignOut={handleSignOut}
          setPage={setPage}
          theme={theme}
          toggleTheme={toggleTheme}
          admins={admins}
          viewers={viewers}
          page={page}
          liveGameId={liveGameId}
          goToLiveGame={() => setPage("live_viewer")}
          onDeleteAllLiveGames={handleDeleteAllLiveGames}
          openSettingsModal={() => setSettingsOpen(true)}
          onSignIn={handleSignIn}
        />
        <main className="flex-1">
          <LiveGameViewer
            db={db}
            user={null}
            gameId={liveGameId}
            setPage={setPage}
            teams={teams}
            stats={stats}
            games={games}
          />
        </main>
      </div>
    );
    } else {
      return (
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
          <Header
            user={null}
            db={db}
            onSignOut={handleSignOut}
            setPage={setPage}
            theme={theme}
            toggleTheme={toggleTheme}
            admins={admins}
            viewers={viewers}
            page={page}
            liveGameId={liveGameId}
            goToLiveGame={() => setPage("live_viewer")}
            onDeleteAllLiveGames={handleDeleteAllLiveGames}
            openSettingsModal={() => setSettingsOpen(true)}
          />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-2xl text-gray-400 text-center">
              No live game in progress.
            </div>
          </main>
        </div>
      );
    }
  }

  // Show login screen if not authenticated, and NOT a live viewer
  if (!user && page !== "live_viewer") {
    return <AuthScreen onSignIn={handleSignIn} />;
  }

  // Only show Dashboard, setup, etc if authenticated!
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header
        user={user}
        db={db}
        onSignOut={handleSignOut}
        setPage={setPage}
        theme={theme}
        toggleTheme={toggleTheme}
        admins={admins}
        viewers={viewers}
        page={page}
        liveGameId={liveGameId}
        goToLiveGame={() => setPage("live_viewer")}
        onDeleteAllLiveGames={handleDeleteAllLiveGames}
        openSettingsModal={() => setSettingsOpen(true)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        teams={teams}
        onAddTeam={handleAddTeam}
        onDeleteTeam={handleDeleteTeam}
        gameFormat={globalGameFormat}
        setGameFormat={setGlobalGameFormat}
        periodLength={globalPeriodLength}
        setPeriodLength={setGlobalPeriodLength}
        theme={theme}
        toggleTheme={toggleTheme}
        setPage={setPage}
        onDeleteAllLiveGames={handleDeleteAllLiveGames}
      />
      <main className="flex-1">
        {user && page === "game_setup" && (
          <GameSetup
            user={user}
            teams={teams}
            stats={games}
            onAddTeam={handleAddTeam}
            setPage={setPage}
            games={games}
            onAddGame={handleAddGame}
            setLiveGameId={setLiveGameId}
            onSubmit={handleSubmitGame}
            gameFormat={globalGameFormat}
            periodLength={globalPeriodLength}
            numPeriods={globalNumPeriods}
          />
        )}
        {user && page === "dashboard" && (
          <Dashboard
            user={user}
            teams={teams}
            games={games}
            stats={games}
            onDeleteGame={handleDeleteGame}
            onDeleteTeam={handleDeleteTeam}
            onAddTeam={handleAddTeam}
            onUpdateGamePhotos={handleUpdateGamePhotos} 
          />
        )}
        {user && page === "add_stat" && currentGameConfig && (
          <StatEntry
            gameConfig={currentGameConfig}
            isLive={false}
            onSave={handleAddStat}
            onCancel={() => {
              setCurrentGameConfig(null);
              setPage("game_setup");
            }}
          />
        )}
        {user && page === "live_admin" && liveGameId && (
          <LiveGameAdmin
            user={user}
            db={db}
            gameId={liveGameId}
            setPage={setPage}
            teams={teams}
            stats={stats}
            games={games}
            onEndGame={handleEndGame}
          />
        )}
        {user && page === "live_viewer" && liveGameId && (
          <LiveGameViewer
            db={db}
            user={user}
            gameId={liveGameId}
            setPage={setPage}
            teams={teams}
            stats={stats}
            games={games}
          />
        )}
      </main>
    </div>
  );
}