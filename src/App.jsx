import React, { useEffect, useState, useCallback } from "react";
import { auth, db, provider } from "./firebase";
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
import StatEntry from "./StatEntry";
import SettingsModal from "./SettingsModal";
import { PhotoUpload, PhotoThumbnails } from "./photo_system";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { OfflineStorage } from "./utils/offlineUtils";
import { SyncService } from "./services/syncService";
import SyncStatusIndicator from "./components/SyncStatusIndicator";

// Import admin utilities
import { 
  isAdmin, 
  canWrite, 
  canDelete, 
  canAccessSettings, 
  canManageLiveGames,
  getUserRole,
  showAccessDenied 
} from "./utils/adminUtils";

// Import the new settings utilities
import { getUserSettings, updateUserSettings, initializeUserSettings } from "./utils/settingsUtils";

export default function App() {
  // Auth & User
  const [user, setUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [theme, setTheme] = useState(() => {
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
  const [currentGameConfig, setCurrentGameConfig] = useState(null);

  // Settings Modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Game setup settings - now managed by Firebase for admins
  const [globalGameFormat, setGlobalGameFormat] = useState("halves");
  const [globalPeriodLength, setGlobalPeriodLength] = useState(20);
  const [globalNumPeriods, setGlobalNumPeriods] = useState(2);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Offline & Sync
  const { isOnline, wasOffline } = useNetworkStatus();
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  
  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && user && !syncInProgress) {
      const pendingCount = OfflineStorage.getPendingCount();
      if (pendingCount > 0) {
        console.log(`Coming back online with ${pendingCount} pending items`);
        autoSync();
      }
    }
  }, [isOnline, wasOffline, user, syncInProgress]);

  // Auto-sync function
  const autoSync = useCallback(async () => {
    if (!user || syncInProgress) return;
    
    setSyncInProgress(true);
    setLastSyncAttempt(Date.now());
    
    try {
      const result = await SyncService.syncAllOfflineData(user);
      console.log("Auto-sync result:", result);
      setSyncResults(result);
      
      if (result.success) {
        // Refresh data after successful sync
        const gamesCol = collection(db, "games");
        const snap = await getDocs(gamesCol);
        setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) {
      console.error("Auto-sync failed:", error);
    } finally {
      setSyncInProgress(false);
    }
  }, [user, syncInProgress]);

  // Manual sync function for UI
  const handleManualSync = useCallback(async () => {
    if (!user || syncInProgress) return;
    
    setSyncInProgress(true);
    setLastSyncAttempt(Date.now());
    
    try {
      const result = await SyncService.forceSyncNow(user);
      console.log("Manual sync result:", result);
      setSyncResults(result);
      
      if (result.success && result.results) {
        // Show success message
        const { games: gameResults, updates: updateResults } = result.results;
        const totalSynced = gameResults.synced + updateResults.synced;
        
        if (totalSynced > 0) {
          alert(`Successfully synced ${totalSynced} items!`);
          
          // Refresh data
          const gamesCol = collection(db, "games");
          const snap = await getDocs(gamesCol);
          setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          alert("No items to sync.");
        }
      } else if (result.error) {
        alert(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      alert("Sync failed. Please try again.");
    } finally {
      setSyncInProgress(false);
    }
  }, [user, syncInProgress]);

  // --- AUTH LOGIC WITH SETTINGS LOADING ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsUserAdmin(isAdmin(u));
      
      // Load user settings when user changes
      if (u && isAdmin(u)) {
        try {
          const settings = await getUserSettings(u);
          setGlobalGameFormat(settings.gameFormat);
          setGlobalPeriodLength(settings.periodLength);
          setGlobalNumPeriods(settings.gameFormat === "halves" ? 2 : 4);
          console.log("Loaded admin settings from Firebase:", settings);
        } catch (error) {
          console.error("Error loading user settings:", error);
          // Fallback to localStorage values
          setGlobalGameFormat(localStorage.getItem("gameFormat") || "halves");
          setGlobalPeriodLength(parseInt(localStorage.getItem("periodLength")) || 20);
          setGlobalNumPeriods(2);
        }
      } else {
        // Non-admin users: use localStorage defaults
        setGlobalGameFormat(localStorage.getItem("gameFormat") || "halves");
        setGlobalPeriodLength(parseInt(localStorage.getItem("periodLength")) || 20);
        setGlobalNumPeriods(2);
      }
      
      setSettingsLoaded(true);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Update Firebase settings when admin changes them
  const updateGameSettings = useCallback(async (newSettings) => {
    if (!isUserAdmin || !user) {
      // Non-admin users: only update localStorage
      if (newSettings.gameFormat) {
        localStorage.setItem("gameFormat", newSettings.gameFormat);
        setGlobalGameFormat(newSettings.gameFormat);
        setGlobalNumPeriods(newSettings.gameFormat === "halves" ? 2 : 4);
      }
      if (newSettings.periodLength) {
        localStorage.setItem("periodLength", newSettings.periodLength.toString());
        setGlobalPeriodLength(newSettings.periodLength);
      }
      return;
    }

    try {
      await updateUserSettings(user, newSettings);
      
      // Update local state
      if (newSettings.gameFormat) {
        setGlobalGameFormat(newSettings.gameFormat);
        setGlobalNumPeriods(newSettings.gameFormat === "halves" ? 2 : 4);
      }
      if (newSettings.periodLength) {
        setGlobalPeriodLength(newSettings.periodLength);
      }
      
      console.log("Settings updated successfully across devices");
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  }, [user, isUserAdmin]);

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
      // Cache teams for offline use
      OfflineStorage.cacheData('teams', snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error loading teams:", error);
      // Load from cache if offline
      if (!isOnline) {
        const cachedTeams = OfflineStorage.getCachedData('teams') || [];
        setTeams(cachedTeams);
      }
    });
    return unsub;
  }, [user, isOnline]);

  useEffect(() => {
    if (!user) return;
    const gamesCol = collection(db, "games");
    const unsub = onSnapshot(gamesCol, (snap) => {
      const gamesArr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGames(gamesArr);
      // Cache games for offline use
      OfflineStorage.cacheData('games', gamesArr);
    }, (error) => {
      console.error("Error loading games:", error);
      // Load from cache if offline
      if (!isOnline) {
        const cachedGames = OfflineStorage.getCachedData('games') || [];
        setGames(cachedGames);
      }
    });
    return unsub;
  }, [user, isOnline]);

  useEffect(() => {
    if (!user) return;
    const statsCol = collection(db, "stats");
    const unsub = onSnapshot(statsCol, (snap) => {
      const statsArr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStats(statsArr);
      // Cache stats for offline use
      OfflineStorage.cacheData('stats', statsArr);
    }, (error) => {
      console.error("Error loading stats:", error);
      // Load from cache if offline
      if (!isOnline) {
        const cachedStats = OfflineStorage.getCachedData('stats') || [];
        setStats(cachedStats);
      }
    });
    return unsub;
  }, [user, isOnline]);

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
    }, (error) => {
      console.error("Error loading live games:", error);
      setLiveGameLoading(false);
    });
    return () => unsub();
  }, [page]);

  // --- LIVE PAGE REDIRECT (Anonymous Viewer) ---
  useEffect(() => {
    if (!user && liveGameId && page !== "live_viewer") {
      setPage("live_viewer");
    }
  }, [user, liveGameId, page]);

  // --- ADMIN-PROTECTED OPERATIONS ---
  const handleUpdateGamePhotos = async (gameId, photos) => {
    if (!canWrite(user)) {
      showAccessDenied('update game photos');
      return;
    }
    
    try {
      if (isOnline) {
        await updateDoc(doc(db, "games", gameId), { photos });
      } else {
        // Store update for later sync
        OfflineStorage.savePendingUpdate(gameId, { photos });
        alert("Photo update saved offline. Will sync when online.");
      }
      
      setGames((games) => 
        games.map((game) => 
          game.id === gameId ? { ...game, photos } : game
        )
      );
    } catch (error) {
      console.error("Error updating game photos:", error);
    }
  };

  const handleDeleteTeam = useCallback(async (teamId) => {
    if (!canDelete(user)) {
      showAccessDenied('delete teams');
      return;
    }
    
    if (!isOnline) {
      alert("Cannot delete items while offline. Please try again when online.");
      return;
    }
    
    await deleteDoc(doc(db, "teams", teamId));
    setTeams((teams) => teams.filter((t) => t.id !== teamId));
  }, [user, isOnline]);

  const handleAddTeam = async (teamName) => {
    if (!canWrite(user)) {
      showAccessDenied('add teams');
      return null;
    }
    
    const exists = teams.some((team) => team.name.toLowerCase() === teamName.toLowerCase());
    if (exists) return null;
    
    try {
      if (isOnline) {
        const docRef = await addDoc(collection(db, "teams"), { name: teamName });
        setTeams((t) => [...t, { name: teamName, id: docRef.id }]);
        return { name: teamName, id: docRef.id };
      } else {
        alert("Cannot add teams while offline. Please try again when online.");
        return null;
      }
    } catch (error) {
      console.error("Error adding team:", error);
      alert("Failed to add team. Please try again.");
      return null;
    }
  };

  const handleAddGame = useCallback(async (game) => {
    if (!canWrite(user)) {
      showAccessDenied('add games');
      return;
    }
    
    try {
      if (isOnline) {
        const docRef = await addDoc(collection(db, "games"), game);
        setGames((g) => [...g, { ...game, id: docRef.id }]);
      } else {
        alert("Cannot add games while offline. Please try again when online.");
      }
    } catch (error) {
      console.error("Error adding game:", error);
      alert("Failed to add game. Please try again.");
    }
  }, [user, isOnline]);

  // Enhanced handleAddStat with offline support
  const handleAddStat = useCallback(async (stat) => {
    if (!canWrite(user)) {
      showAccessDenied('add statistics');
      return;
    }
    
    const points = (stat.fg2m * 2) + (stat.fg3m * 3) + stat.ftm;
    
    let outcome = "T";
    if (stat.myTeamScore > stat.opponentScore) outcome = "W";
    else if (stat.myTeamScore < stat.opponentScore) outcome = "L";

    const gameRecord = {
      ...currentGameConfig,
      ...stat,
      points,
      outcome,
      status: "final",
      createdAt: new Date().toISOString(),
      adminName: user?.displayName ? user.displayName.split(" ")[0] : "",
    };

    try {
      if (isOnline) {
        // Try online first
        const docRef = await addDoc(collection(db, "games"), gameRecord);
        setGames((g) => [...g, { ...gameRecord, id: docRef.id }]);
        console.log("Game saved online:", docRef.id);
      } else {
        throw new Error("Offline mode");
      }
    } catch (error) {
      console.log("Saving offline:", error.message);
      // Save offline
      const tempId = OfflineStorage.savePendingGame(gameRecord);
      setGames((g) => [...g, { 
        ...gameRecord, 
        id: tempId, 
        isOffline: true,
        tempId: tempId 
      }]);
      
      // Show user feedback
      alert(`Game saved offline. Will sync when connection is restored.`);
    }
    
    setCurrentGameConfig(null);
    setPage("dashboard");
  }, [currentGameConfig, user, isOnline]);

  const handleDeleteGame = useCallback(async (gameId) => {
    if (!canDelete(user)) {
      showAccessDenied('delete games');
      return;
    }
    
    if (!isOnline) {
      alert("Cannot delete items while offline. Please try again when online.");
      return;
    }
    
    // Check if it's a temp offline game
    if (gameId.startsWith('temp_')) {
      // Remove from offline storage
      OfflineStorage.removePendingGame(gameId);
      setGames((g) => g.filter((x) => x.id !== gameId));
      return;
    }
    
    await deleteDoc(doc(db, "games", gameId));
    setGames((g) => g.filter((x) => x.id !== gameId));
    setStats((s) => s.filter((x) => x.gameId !== gameId));
  }, [user, isOnline]);

  const handleUpdateGame = useCallback(async (gameId, updates) => {
    if (!canWrite(user)) {
      showAccessDenied('update games');
      return;
    }
    
    try {
      // Calculate outcome if score is being updated
      if (updates.myTeamScore !== undefined && updates.opponentScore !== undefined) {
        let outcome = "T";
        if (updates.myTeamScore > updates.opponentScore) outcome = "W";
        else if (updates.myTeamScore < updates.opponentScore) outcome = "L";
        updates.outcome = outcome;
      }
      
      // Add edited flag and timestamp
      updates.editedAt = new Date().toISOString();
      updates.editedBy = user?.displayName ? user.displayName.split(" ")[0] : "";
      
      if (isOnline) {
        await updateDoc(doc(db, "games", gameId), updates);
      } else {
        // Store update for later sync
        OfflineStorage.savePendingUpdate(gameId, updates);
        alert("Changes saved offline. Will sync when online.");
      }
      
      // Update local state
      setGames((games) => 
        games.map((game) => 
          game.id === gameId ? { ...game, ...updates, isOfflineUpdated: !isOnline } : game
        )
      );
      
    } catch (error) {
      console.error("Error updating game:", error);
      throw error;
    }
  }, [user, isOnline]);

  // --- END GAME LOGIC ---
  const handleEndGame = async (liveGameId) => {
    if (!canManageLiveGames(user)) {
      showAccessDenied('manage live games');
      return;
    }
    
    if (!isOnline) {
      alert("Cannot end games while offline. Please try again when online.");
      return;
    }
    
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
    if (!canManageLiveGames(user)) {
      showAccessDenied('delete live games');
      return;
    }
    
    if (!isOnline) {
      alert("Cannot delete live games while offline. Please try again when online.");
      return;
    }
    
    const snapshot = await getDocs(collection(db, "liveGames"));
    for (let gameDoc of snapshot.docs) {
      await deleteDoc(doc(db, "liveGames", gameDoc.id));
    }
    setLiveGameId(null);
  };

  // --- NAV HELPERS ---
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const signedInUser = result.user;
      
      // Check if the user is an admin
      if (!isAdmin(signedInUser)) {
        // Not an admin - sign them out and show error
        await signOut(auth);
        alert(`Access denied. Only family administrators can sign in.\n\nYour email: ${signedInUser.email}\n\nTo view games, you can browse without signing in.`);
        return;
      }
      
      // User is an admin - they'll be automatically set by the auth state listener
    } catch (error) {
      console.error("Sign in error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show error
        return;
      }
      alert("Sign in failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      if (page === "live_admin" && liveGameId && isUserAdmin) {
        await handleEndGame(liveGameId);
      }
      await signOut(auth);
      setUser(null);
      setIsUserAdmin(false);
      setPage("game_setup"); 
      setLiveGameId(null);
      setGames([]);
      setStats([]);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Handle new game (setup new or live)
  const handleSubmitGame = async (config, mode) => {
    if (!canWrite(user)) {
      showAccessDenied('create games');
      return;
    }
    
    //if (!isOnline && mode === "live") {
    //  alert("Live games require an internet connection to share with viewers. You can still create a regular game and enter stats offline.");
    //  return;
    //}
    
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
    /*
    if (mode === "live") {
      if (!canManageLiveGames(user)) {
        showAccessDenied('start live games');
        return;
      }
      try {
        const docRef = await addDoc(collection(db, "liveGames"), newGame);
        setLiveGameId(docRef.id);
        setPage("live_admin");
      } catch (error) {
        console.error("Error creating live game:", error);
        alert("Failed to create live game. Please check your connection and try again.");
      }
    } else {
      setCurrentGameConfig(newGame);
      setPage("add_stat");
    }
    */
if (mode === "live") {
  if (!canManageLiveGames(user)) {
    showAccessDenied('start live games');
    return;
  }
  try {
    const docRef = await addDoc(collection(db, "liveGames"), newGame);
    setLiveGameId(docRef.id);
    setPage("live_admin");
  } catch (error) {
    // If offline, create local live game
    const tempId = `temp_live_${Date.now()}`;
    setLiveGameId(tempId);
    setPage("live_admin");
    console.log("Created offline live game");
  }
}
  };

  // Settings modal handler
  const openSettingsModal = () => {
    if (!canAccessSettings(user)) {
      showAccessDenied('access settings');
      return;
    }
    setSettingsOpen(true);
  };

  // --- PAGE RENDER LOGIC ---
  if (loading || liveGameLoading || !settingsLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <span className="text-orange-500 font-bold text-3xl animate-spin-slow">🏀</span>
        <span className="ml-4">Loading App...</span>
      </div>
    );
  }

  // Anonymous viewer logic
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
            page={page}
            liveGameId={liveGameId}
            goToLiveGame={() => setPage("live_viewer")}
            onDeleteAllLiveGames={handleDeleteAllLiveGames}
            openSettingsModal={openSettingsModal}
            onSignIn={handleSignIn}
            isUserAdmin={false}
            isOnline={isOnline}
            onManualSync={handleManualSync}
            syncInProgress={syncInProgress}
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
            page={page}
            liveGameId={liveGameId}
            goToLiveGame={() => setPage("live_viewer")}
            onDeleteAllLiveGames={handleDeleteAllLiveGames}
            openSettingsModal={openSettingsModal}
            isUserAdmin={false}
            isOnline={isOnline}
            onManualSync={handleManualSync}
            syncInProgress={syncInProgress}
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

  // Show login screen if not authenticated
  if (!user && page !== "live_viewer") {
    return <AuthScreen onSignIn={handleSignIn} />;
  }

  // Show access denied for non-admin trying to access admin pages
  if (user && !isUserAdmin && (page === "game_setup" || page === "add_stat" || page === "live_admin")) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <Header
          user={user}
          db={db}
          onSignOut={handleSignOut}
          setPage={setPage}
          theme={theme}
          toggleTheme={toggleTheme}
          page={page}
          liveGameId={liveGameId}
          goToLiveGame={() => setPage("live_viewer")}
          onDeleteAllLiveGames={handleDeleteAllLiveGames}
          openSettingsModal={openSettingsModal}
          isUserAdmin={isUserAdmin}
          isOnline={isOnline}
          onManualSync={handleManualSync}
          syncInProgress={syncInProgress}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Access Restricted</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don't have permission to access this feature. Only administrators can create and manage games.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              User role: <span className="font-medium">{getUserRole(user)}</span>
            </p>
            <button
              onClick={() => setPage("dashboard")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Main authenticated app
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header
        user={user}
        db={db}
        onSignOut={handleSignOut}
        setPage={setPage}
        theme={theme}
        toggleTheme={toggleTheme}
        page={page}
        liveGameId={liveGameId}
        goToLiveGame={() => setPage("live_viewer")}
        onDeleteAllLiveGames={handleDeleteAllLiveGames}
        openSettingsModal={openSettingsModal}
        isUserAdmin={isUserAdmin}
        isOnline={isOnline}
        onManualSync={handleManualSync}
        syncInProgress={syncInProgress}
      />
      
      
      
      {/* Offline Banner Code */}
      
      {/*  
      {!isOnline && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <span>📡 Offline Mode</span>
            {OfflineStorage.getPendingCount() > 0 && (
              <span>• {OfflineStorage.getPendingCount()} items will sync when online</span>
            )}
            {isUserAdmin && OfflineStorage.getPendingCount() > 0 && (
              <button
                onClick={handleManualSync}
                disabled={syncInProgress}
                className="ml-2 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded text-xs disabled:opacity-50"
              >
                {syncInProgress ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>
        </div>
      )}
      */}
      
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        teams={teams}
        onAddTeam={handleAddTeam}
        onDeleteTeam={handleDeleteTeam}
        gameFormat={globalGameFormat}
        setGameFormat={(format) => updateGameSettings({ gameFormat: format })}
        periodLength={globalPeriodLength}
        setPeriodLength={(length) => updateGameSettings({ periodLength: length })}
        theme={theme}
        toggleTheme={toggleTheme}
        setPage={setPage}
        onDeleteAllLiveGames={handleDeleteAllLiveGames}
        isOnline={isOnline}
        pendingCount={OfflineStorage.getPendingCount()}
        onManualSync={handleManualSync}
        syncInProgress={syncInProgress}
        isUserAdmin={isUserAdmin}
      />
      
      <main className="flex-1">
        {user && isUserAdmin && page === "game_setup" && (
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
            isOnline={isOnline}
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
            onUpdateGame={handleUpdateGame}
            isUserAdmin={isUserAdmin}
            isOnline={isOnline}
            onManualSync={handleManualSync}
            syncInProgress={syncInProgress}
          />
        )}
        
        {user && isUserAdmin && page === "add_stat" && currentGameConfig && (
          <StatEntry
            gameConfig={currentGameConfig}
            isLive={false}
            onSave={handleAddStat}
            onCancel={() => {
              setCurrentGameConfig(null);
              setPage("game_setup");
            }}
            isOnline={isOnline}
          />
        )}
        
        {user && isUserAdmin && page === "live_admin" && liveGameId && (
          <LiveGameAdmin
            user={user}
            db={db}
            gameId={liveGameId}
            setPage={setPage}
            teams={teams}
            stats={stats}
            games={games}
            onEndGame={handleEndGame}
            isOnline={isOnline}
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