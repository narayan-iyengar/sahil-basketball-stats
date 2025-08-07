import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";
import StatStepperGroup from "./StatStepperGroup";
import StatStepper from "./StatStepper";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { ShareIcon } from "./icons";
import { setPresence, removePresence } from "./presence";
import { db } from "./firebase";

export default function LiveGameAdmin({ db, gameId, user, onEndGame }) {
  const [game, setGame] = useState(null);
  const [shareMessage, setShareMessage] = useState("");
  const statKeys = [
    "fg2m", "fg2a", "fg3m", "fg3a", "ftm", "fta",
    "rebounds", "assists", "steals", "blocks", "fouls", "turnovers"
  ];
  const initialStatus = statKeys.reduce((acc, key) => { acc[key] = null; return acc; }, {});
  const [saveStatus, setSaveStatus] = useState(initialStatus);


  // --- Real-time ticking clock state ---
  const [localClock, setLocalClock] = useState(null);
  const clockInterval = useRef(null);

  // --- Presence Management ---
  useEffect(() => {
    if (!user) return;
    setPresence(user, "admin");
    const cleanupPresence = () => removePresence(user, "admin");
    window.addEventListener("beforeunload", cleanupPresence);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") cleanupPresence();
    });
    return () => {
      cleanupPresence();
      window.removeEventListener("beforeunload", cleanupPresence);
      document.removeEventListener("visibilitychange", cleanupPresence);
    };
  }, [user]);

  // --- Listen to game state from Firestore ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "liveGames", gameId), docSnap => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setGame(data);

        // Only sync the local clock if:
        // - this is the first time, or
        // - the game was just paused/resumed, or
        // - a period/half advanced, or
        // - clock changed significantly (e.g. by admin)
        setLocalClock(current => {
          // No prior value? Or major jump? Sync to server.
          if (
            current == null ||
            !data.isRunning ||
            Math.abs(current - data.clock) > 2 ||
            data.period !== game?.period
          ) {
            return data.clock;
          }
          // Else, keep ticking on the client
          return current;
        });

        // Stop the local interval if the game is paused
        if (!data.isRunning && clockInterval.current) {
          clearInterval(clockInterval.current);
          clockInterval.current = null;
        }
      } else {
        setGame(null);
        setLocalClock(null);
        if (clockInterval.current) {
          clearInterval(clockInterval.current);
          clockInterval.current = null;
        }
      }
    });
    return () => {
      unsub();
      if (clockInterval.current) clearInterval(clockInterval.current);
    };
    // eslint-disable-next-line
  }, [db, gameId]);

  // --- Local ticking logic ---
  useEffect(() => {
    if (!game) return;
    // Start ticking if running, only if not already ticking
    if (game.isRunning && !clockInterval.current) {
      clockInterval.current = setInterval(() => {
        setLocalClock((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    // Stop ticking if paused
    if (!game.isRunning && clockInterval.current) {
      clearInterval(clockInterval.current);
      clockInterval.current = null;
    }
    return () => {
      if (clockInterval.current) {
        clearInterval(clockInterval.current);
        clockInterval.current = null;
      }
    };
  }, [game && game.isRunning]);

  // --- Firestore sync: when localClock changes, update backend
  useEffect(() => {
    if (!game) return;
    if (!game.isRunning) return;
    // Only sync to Firestore if localClock actually changes
    if (localClock !== game.clock && localClock >= 0) {
      updateDoc(doc(db, "liveGames", gameId), { clock: localClock });
    }
    // If clock reaches 0, pause (optionally: you may want to auto-advance here)
    if (localClock === 0 && game.isRunning) {
      updateDoc(doc(db, "liveGames", gameId), { isRunning: false });
      // Optionally: call onEndGame(gameId) if this is the last period/half
    }
    // eslint-disable-next-line
  }, [localClock]);

  // --- Score handlers
  const handleScoreChange = (team, delta) => {
    if (!game) return;
    const key = team === "home" ? "homeScore" : "awayScore";
    if (delta < 0 && game[key] <= 0) return;
    const updates = { [key]: increment(delta) };
    if (!game.isRunning) updates.isRunning = true;
    const updatePromise = updateDoc(doc(db, "liveGames", gameId), updates);
    showSaveIndicator(key, updatePromise);
  };

  // --- Stat handlers
  const handleStatChange = (stat, delta) => {
    const gameRef = doc(db, "liveGames", gameId);
    const currentStats = game.playerStats;
    const newValue = Math.max(0, currentStats[stat] + delta);

    const updates = { [`playerStats.${stat}`]: newValue };
    if (!game.isRunning) updates.isRunning = true;

    // Points logic
    if (delta > 0) {
      if (stat === "fg2m") updates.homeScore = increment(2);
      if (stat === "fg3m") updates.homeScore = increment(3);
      if (stat === "ftm") updates.homeScore = increment(1);
    } else if (delta < 0) {
      if (stat === "fg2m" && currentStats.fg2m > 0) updates.homeScore = increment(-2);
      if (stat === "fg3m" && currentStats.fg3m > 0) updates.homeScore = increment(-3);
      if (stat === "ftm" && currentStats.ftm > 0) updates.homeScore = increment(-1);
    }
    // Keep made <= att and vice versa
    if (stat === "fg2m" && delta > 0 && newValue > currentStats.fg2a) updates["playerStats.fg2a"] = newValue;
    if (stat === "fg2a" && delta < 0 && newValue < currentStats.fg2m) updates["playerStats.fg2m"] = newValue;
    if (stat === "fg3m" && delta > 0 && newValue > currentStats.fg3a) updates["playerStats.fg3a"] = newValue;
    if (stat === "fg3a" && delta < 0 && newValue < currentStats.fg3m) updates["playerStats.fg3m"] = newValue;
    if (stat === "ftm" && delta > 0 && newValue > currentStats.fta) updates["playerStats.fta"] = newValue;
    if (stat === "fta" && delta < 0 && newValue < currentStats.ftm) updates["playerStats.ftm"] = newValue;

    const updatePromise = updateDoc(gameRef, updates);
    showSaveIndicator(stat, updatePromise);
  };

  // --- Save status indicator logic
  const showSaveIndicator = async (key, updatePromise) => {
    setSaveStatus(prev => ({ ...prev, [key]: "saving" }));
    try {
      await updatePromise;
      setSaveStatus(prev => ({ ...prev, [key]: "success" }));
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [key]: "error" }));
    } finally {
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [key]: null }));
      }, 1200);
    }
  };

  // --- Start/Pause button logic
  const toggleClock = () => {
    if (!game) return;
    const updatePromise = updateDoc(doc(db, "liveGames", gameId), { isRunning: !game.isRunning });
    showSaveIndicator("clock", updatePromise);
  };

  // --- Share logic
  const handleShare = () => {
    const shareableLink = `${window.location.origin}${window.location.pathname}?liveGameId=${gameId}`;
    navigator.clipboard.writeText(shareableLink);
    setShareMessage("Copied!");
    setTimeout(() => setShareMessage(""), 2000);
  };

  if (!game) return <div className="text-center p-10">Loading Live Game...</div>;

  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const playerStats = game.playerStats || {};
  const periodName = game.gameFormat === "halves" ? "Half" : "Period";



// END BUTTON LOGIC 
const isHalves = game.gameFormat === "halves";
const maxPeriod = isHalves ? 2 : 4;
const atFinalPeriod = game.period === maxPeriod;
const endButtonLabel = atFinalPeriod 
  ? "End Game"
  : isHalves 
    ? "End Half"
    : "End Period";
            
            
const handleEndOrAdvance = () => { 
  const gameRef = doc(db, "liveGames", gameId);
  if (atFinalPeriod) {
    if (typeof onEndGame === "function") onEndGame(gameId);
  } else {
    updateDoc(gameRef, {
      isRunning: false,
      period: game.period + 1,
      clock: game.periodLength * 60, 
    });     
  }         
};            



  return (
    <div className="max-w-md mx-auto space-y-4 pb-24">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 relative">
        <div className="absolute top-2 right-2"><SaveStatusIndicator status={saveStatus["clock"]} /></div>
        <div className="flex justify-around items-center text-center">
          <div className="w-1/3 flex flex-col items-center relative">
            <span className="text-lg font-bold truncate text-center">{game.teamName}</span>
            <div className="flex items-center">
              <SaveStatusIndicator status={saveStatus["homeScore"]} className="mr-2" />
              <span className="text-5xl font-mono">{game.homeScore}</span>
            </div>
          </div>
          <div className="w-1/3 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono tracking-wider">{formatTime(localClock ?? game.clock)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{periodName} {game.period}</span>
          </div>
          <div className="w-1/3 flex flex-col items-center relative">
            <span className="text-lg font-bold truncate text-center">{game.opponent}</span>
            <div className="flex items-center">
              <span className="text-5xl font-mono">{game.awayScore}</span>
              <SaveStatusIndicator status={saveStatus["awayScore"]} className="ml-2" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg">
            <button onClick={() => handleScoreChange("home", -1)} className="bg-red-500 w-7 h-7 rounded-md text-lg font-bold disabled:opacity-50" disabled={game.homeScore <= 0}>-</button>
            <span className="font-semibold text-sm px-1">{game.teamName}</span>
            <button onClick={() => handleScoreChange("home", 1)} className="bg-green-500 w-7 h-7 rounded-md text-lg font-bold">+</button>
          </div>
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg">
            <button onClick={() => handleScoreChange("away", -1)} className="bg-red-500 w-7 h-7 rounded-md text-lg font-bold disabled:opacity-50" disabled={game.awayScore <= 0}>-</button>
            <span className="font-semibold text-sm px-1">{game.opponent}</span>
            <button onClick={() => handleScoreChange("away", 1)} className="bg-green-500 w-7 h-7 rounded-md text-lg font-bold">+</button>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-center text-orange-500 mb-4">Sahil's Live Stats</h3>
        <div className="space-y-4">
          <StatStepperGroup label="2-Pointers" madeValue={playerStats.fg2m} attValue={playerStats.fg2a} onStatChange={handleStatChange} madeKey="fg2m" attKey="fg2a" saveStatus={saveStatus}/>
          <StatStepperGroup label="3-Pointers" madeValue={playerStats.fg3m} attValue={playerStats.fg3a} onStatChange={handleStatChange} madeKey="fg3m" attKey="fg3a" saveStatus={saveStatus}/>
          <StatStepperGroup label="Free Throws" madeValue={playerStats.ftm} attValue={playerStats.fta} onStatChange={handleStatChange} madeKey="ftm" attKey="fta" saveStatus={saveStatus}/>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <StatStepper label="Rebounds" value={playerStats.rebounds} onIncrement={() => handleStatChange("rebounds", 1)} onDecrement={() => handleStatChange("rebounds", -1)} saveStatus={saveStatus["rebounds"]}/>
          <StatStepper label="Assists" value={playerStats.assists} onIncrement={() => handleStatChange("assists", 1)} onDecrement={() => handleStatChange("assists", -1)} saveStatus={saveStatus["assists"]}/>
          <StatStepper label="Steals" value={playerStats.steals} onIncrement={() => handleStatChange("steals", 1)} onDecrement={() => handleStatChange("steals", -1)} saveStatus={saveStatus["steals"]}/>
          <StatStepper label="Blocks" value={playerStats.blocks} onIncrement={() => handleStatChange("blocks", 1)} onDecrement={() => handleStatChange("blocks", -1)} saveStatus={saveStatus["blocks"]}/>
          <StatStepper label="Fouls" value={playerStats.fouls} onIncrement={() => handleStatChange("fouls", 1)} onDecrement={() => handleStatChange("fouls", -1)} saveStatus={saveStatus["fouls"]}/>
          <StatStepper label="Turnovers" value={playerStats.turnovers} onIncrement={() => handleStatChange("turnovers", 1)} onDecrement={() => handleStatChange("turnovers", -1)} saveStatus={saveStatus["turnovers"]}/>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-3 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <button onClick={handleShare} className="w-full py-3 rounded-lg font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
            {shareMessage ? shareMessage : <ShareIcon />}
          </button>
          <button
            onClick={toggleClock}
            className={`w-full py-3 rounded-lg font-bold text-lg ${game.isRunning ? "bg-yellow-500 text-black" : "bg-green-500 text-white"}`}
          >
            {game.isRunning ? "Pause" : "Start"}
          </button>
          <button onClick={handleEndOrAdvance} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg text-lg">
          {endButtonLabel}
          </button>
         </div>
      </div>
    </div>
  );
}

