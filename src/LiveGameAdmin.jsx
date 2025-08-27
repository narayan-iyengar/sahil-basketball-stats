import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import StatStepperGroup from "./StatStepperGroup";
import StatStepper from "./StatStepper";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { ShareIcon } from "./icons";
import { db } from "./firebase";

// Expandable bar icon
const ExpandableBar = ({ isExpanded, className = "" }) => (
  <div className={`w-12 h-1 bg-gray-400 rounded-full transition-all duration-200 ${isExpanded ? 'bg-orange-500' : ''} ${className}`} />
);

export default function LiveGameAdmin({ db, gameId, user, onEndGame }) {
  const [game, setGame] = useState(null);
  const [shareMessage, setShareMessage] = useState("");
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const statKeys = [
    "fg2m", "fg2a", "fg3m", "fg3a", "ftm", "fta",
    "rebounds", "assists", "steals", "blocks", "fouls", "turnovers"
  ];
  // Single save status for the whole interface
  const [saveStatus, setSaveStatus] = useState(null);

  // --- Display clock state (for real-time updates) ---
  const [displayClock, setDisplayClock] = useState(0);
  const [displayClockTenths, setDisplayClockTenths] = useState(0); // For tenths of seconds
  const displayInterval = useRef(null);
  const lastPeriodRef = useRef(null);


  // --- Listen to game state from Firestore ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "liveGames", gameId), docSnap => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        
        // Update period reference for potential future use
        lastPeriodRef.current = data.period;
        
        setGame(data);
        
        // Calculate the current clock time based on server data
        const now = Date.now();
        if (data.isRunning && data.clockStartTime) {
          const elapsedMs = now - data.clockStartTime;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          const currentClock = Math.max(0, data.clockAtStart - elapsedSeconds);
          const tenths = Math.max(0, (data.clockAtStart * 1000) - elapsedMs) / 100;
          setDisplayClock(currentClock);
          setDisplayClockTenths(tenths);
        } else {
          setDisplayClock(data.clock || 0);
          setDisplayClockTenths((data.clock || 0) * 10);
        }
      } else {
        setGame(null);
        setDisplayClock(0);
      }
    });
    return () => {
      unsub();
      if (displayInterval.current) {
        clearInterval(displayInterval.current);
        displayInterval.current = null;
      }
    };
  }, [db, gameId]);

  // --- Display clock updater with auto-advance logic ---
  useEffect(() => {
    if (!game) return;

    if (game.isRunning && game.clockStartTime) {
      // Update display more frequently when under 1 minute for tenths display
      const updateInterval = displayClock <= 60 ? 100 : 1000; // 100ms vs 1000ms
      
      displayInterval.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - game.clockStartTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const currentClock = Math.max(0, game.clockAtStart - elapsedSeconds);
        const tenths = Math.max(0, (game.clockAtStart * 1000) - elapsedMs) / 100;
        
        setDisplayClock(currentClock);
        setDisplayClockTenths(tenths);
        
        // If clock reaches 0, handle period end
        if (currentClock <= 0 && game.isRunning) {
          handlePeriodEnd();
        }
      }, updateInterval);
    } else {
      if (displayInterval.current) {
        clearInterval(displayInterval.current);
        displayInterval.current = null;
      }
    }

    return () => {
      if (displayInterval.current) {
        clearInterval(displayInterval.current);
        displayInterval.current = null;
      }
    };
  }, [game?.isRunning, game?.clockStartTime, game?.clockAtStart, game?.period, game?.gameFormat, displayClock, gameId]);

  // --- Handle period end logic ---
  const handlePeriodEnd = () => {
    if (!game) return;
    
    const isHalves = game.gameFormat === "halves";
    const maxPeriod = isHalves ? 2 : 4;
    const isGameEnd = game.period === maxPeriod;
    
    if (isGameEnd) {
      // Game over - just pause clock, don't advance
      updateDoc(doc(db, "liveGames", gameId), {
        isRunning: false,
        clock: 0,
        clockStartTime: null,
        clockAtStart: 0
      });
    } else {
      // Auto-advance to next period/half
      const now = Date.now();
      updateDoc(doc(db, "liveGames", gameId), {
        isRunning: false,
        period: game.period + 1,
        clock: game.periodLength * 60,
        clockStartTime: null,
        clockAtStart: game.periodLength * 60
      });
    }
  };

  // --- Score handlers
  const handleScoreChange = (team, delta) => {
    if (!game) return;
    const key = team === "home" ? "homeScore" : "awayScore";
    if (delta < 0 && game[key] <= 0) return;
    
    const updates = { [key]: increment(delta) };
    
    // Auto-start clock if not running
    if (!game.isRunning) {
      const now = Date.now();
      updates.isRunning = true;
      updates.clockStartTime = now;
      updates.clockAtStart = game.clock || (game.periodLength * 60);
    }
    
    const updatePromise = updateDoc(doc(db, "liveGames", gameId), updates);
    showSaveIndicator(updatePromise);
  };

  // --- Stat handlers
  const handleStatChange = (stat, delta) => {
    const gameRef = doc(db, "liveGames", gameId);
    const currentStats = game.playerStats;
    const newValue = Math.max(0, currentStats[stat] + delta);

    const updates = { [`playerStats.${stat}`]: newValue };
    
    // Auto-start clock if not running
    if (!game.isRunning) {
      const now = Date.now();
      updates.isRunning = true;
      updates.clockStartTime = now;
      updates.clockAtStart = game.clock || (game.periodLength * 60);
    }

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
    showSaveIndicator(updatePromise);
  };

  // --- Save status indicator logic
  const showSaveIndicator = async (updatePromise) => {
    setSaveStatus("saving");
    try {
      await updatePromise;
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setTimeout(() => {
        setSaveStatus(null);
      }, 1200);
    }
  };

  // --- Start/Pause button logic
  const toggleClock = () => {
    if (!game) return;
    
    const now = Date.now();
    let updates;
    
    if (game.isRunning) {
      // Pause the clock - save current time
      const elapsed = game.clockStartTime ? Math.floor((now - game.clockStartTime) / 1000) : 0;
      const currentClock = Math.max(0, game.clockAtStart - elapsed);
      updates = {
        isRunning: false,
        clock: currentClock,
        clockStartTime: null,
        clockAtStart: currentClock
      };
    } else {
      // Start the clock
      updates = {
        isRunning: true,
        clockStartTime: now,
        clockAtStart: game.clock || (game.periodLength * 60)
      };
    }
    
    const updatePromise = updateDoc(doc(db, "liveGames", gameId), updates);
    showSaveIndicator(updatePromise);
  };

  // --- Manual advance period (for manual control) ---
  const handleManualAdvance = () => {
    const gameRef = doc(db, "liveGames", gameId);
    const isHalves = game.gameFormat === "halves";
    const maxPeriod = isHalves ? 2 : 4;
    
    if (game.period === maxPeriod) {
      if (typeof onEndGame === "function") onEndGame(gameId);
    } else {
      const now = Date.now();
      updateDoc(gameRef, {
        isRunning: false,
        period: game.period + 1,
        clock: game.periodLength * 60,
        clockStartTime: null,
        clockAtStart: game.periodLength * 60
      });     
    }         
  };



  // --- Share logic
  const handleShare = () => {
    const shareableLink = `${window.location.origin}${window.location.pathname}?liveGameId=${gameId}`;
    navigator.clipboard.writeText(shareableLink);
    setShareMessage("Copied!");
    setTimeout(() => setShareMessage(""), 2000);
  };

  if (!game) return <div className="text-center p-10">Loading Live Game...</div>;

  const formatTime = (seconds, tenths) => {
    if (seconds <= 59) {
      // Under 1 minute: show "59.9" format
      const wholeSeconds = Math.floor(tenths / 10);
      const deciseconds = Math.floor(tenths % 10);
      return `${wholeSeconds}.${deciseconds}`;
    } else {
      // Over 1 minute: show "1:30" format
      return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }
  };
  const playerStats = game.playerStats || {};
  const periodName = game.gameFormat === "halves" ? "Half" : "Period";

  // Button logic
  const isHalves = game.gameFormat === "halves";
  const maxPeriod = isHalves ? 2 : 4;
  const atFinalPeriod = game.period === maxPeriod;
  const gameEnded = atFinalPeriod && displayClock === 0 && !game.isRunning;
  
  const endButtonLabel = gameEnded
    ? "End Game"
    : atFinalPeriod 
      ? "End Game"
      : "Next";

  // Clock styling - red in final 2 minutes, more intense under 1 minute
  const clockIsRed = displayClock <= 120 || (atFinalPeriod && displayClock === 0);
  const clockIsUrgent = displayClock <= 60 && displayClock > 0;


  //Font Size
  const maxNameLength = Math.max(
  game.teamName?.length || 1, 
  game.opponent?.length || 1
);
  return (
    <div className="h-screen flex flex-col">
      {/* Game ended notification */}
      {gameEnded && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 text-center">
          <strong>Game Over!</strong> Press "End Game" when ready to finish.
        </div>
      )}

      {/* Fixed Score Section - doesn't scroll */}
      <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-md mx-auto p-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <div className="absolute top-2 right-2"><SaveStatusIndicator status={saveStatus} /></div>
{/* Clock Section - Centered with better period/half label */}
            <div className="flex justify-center items-center text-center mb-4 text-gray-900 dark:text-white">
              <div className="flex flex-col items-center justify-center">
                <span className={`text-4xl font-mono tracking-wider transition-all duration-300 ${
                  clockIsUrgent 
                    ? 'text-red-500 animate-pulse scale-110 font-bold' 
                    : clockIsRed 
                      ? 'text-red-500 animate-pulse' 
                      : ''
                }`}>
                  {formatTime(displayClock, displayClockTenths)}
                </span>
                <span className="text-base font-medium text-gray-700 dark:text-gray-300 mt-1 capitalize">
                  {periodName} {game.period}
                </span>
              </div>
            </div>

            {/* Team Names and Score Steppers - Aligned */}
            <div className="grid grid-cols-2 gap-3">
              {/* Home Team */}
              <div className="flex flex-col items-center">
                <span 
                  className="font-bold text-center leading-tight break-words hyphens-auto px-1 mb-2 text-gray-900 dark:text-white"
                  style={{
                    fontSize: `${Math.max(18, Math.min(20, 120 / Math.max(maxNameLength, 6)))}px`
                  }}
                >
                  {game.teamName}
                </span>
                <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                  <button 
                    onClick={() => handleScoreChange("home", -1)} 
                    className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-md text-lg font-bold flex items-center justify-center shadow-md disabled:opacity-50 transition-all active:scale-95" 
                    disabled={game.homeScore <= 0}
                  >
                    −
                  </button>
                  <span className="font-semibold text-3xl px-2 text-center flex-1 text-gray-900 dark:text-white font-mono">
                    {game.homeScore}
                  </span>
                  <button 
                    onClick={() => handleScoreChange("home", 1)} 
                    className="bg-green-500 hover:bg-green-600 text-white w-9 h-9 rounded-md text-lg font-bold flex items-center justify-center shadow-md transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center">
                <span 
                  className="font-bold text-center leading-tight break-words hyphens-auto px-1 mb-2 text-gray-900 dark:text-white"
                  style={{
                    fontSize: `${Math.max(18, Math.min(20, 120 / Math.max(maxNameLength, 6)))}px`
                  }}
                >
                  {game.opponent}
                </span>
                <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                  <button 
                    onClick={() => handleScoreChange("away", -1)} 
                    className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-md text-lg font-bold flex items-center justify-center shadow-md disabled:opacity-50 transition-all active:scale-95" 
                    disabled={game.awayScore <= 0}
                  >
                    −
                  </button>
                  <span className="font-semibold text-3xl px-2 text-center flex-1 text-gray-900 dark:text-white font-mono">
                    {game.awayScore}
                  </span>
                  <button 
                    onClick={() => handleScoreChange("away", 1)} 
                    className="bg-green-500 hover:bg-green-600 text-white w-9 h-9 rounded-md text-lg font-bold flex items-center justify-center shadow-md transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
</div>
  </div>
      {/* Scrollable Stats Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md mx-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Collapsible Header */}
            <div className="flex flex-col items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setStatsCollapsed(!statsCollapsed)}
                className="flex flex-col items-center gap-2 w-full"
              >
                <ExpandableBar isExpanded={!statsCollapsed} />
                <h3 className="text-lg font-bold text-orange-500">
                  {statsCollapsed ? "Stats Collapsed" : "Live Stats"}
                </h3>
              </button>
            </div>
            
            {/* Stats Content */}
            {!statsCollapsed && (
              <div className="p-4">
                <div className="space-y-4">
                  <StatStepperGroup label="2-Pointers" madeValue={playerStats.fg2m} attValue={playerStats.fg2a} onStatChange={handleStatChange} madeKey="fg2m" attKey="fg2a" />
                  <StatStepperGroup label="3-Pointers" madeValue={playerStats.fg3m} attValue={playerStats.fg3a} onStatChange={handleStatChange} madeKey="fg3m" attKey="fg3a" />
                  <StatStepperGroup label="Free Throws" madeValue={playerStats.ftm} attValue={playerStats.fta} onStatChange={handleStatChange} madeKey="ftm" attKey="fta" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <StatStepper label="Rebounds" value={playerStats.rebounds} onIncrement={() => handleStatChange("rebounds", 1)} onDecrement={() => handleStatChange("rebounds", -1)} />
                  <StatStepper label="Assists" value={playerStats.assists} onIncrement={() => handleStatChange("assists", 1)} onDecrement={() => handleStatChange("assists", -1)} />
                  <StatStepper label="Steals" value={playerStats.steals} onIncrement={() => handleStatChange("steals", 1)} onDecrement={() => handleStatChange("steals", -1)} />
                  <StatStepper label="Blocks" value={playerStats.blocks} onIncrement={() => handleStatChange("blocks", 1)} onDecrement={() => handleStatChange("blocks", -1)} />
                  <StatStepper label="Fouls" value={playerStats.fouls} onIncrement={() => handleStatChange("fouls", 1)} onDecrement={() => handleStatChange("fouls", -1)} />
                  <StatStepper label="Turnovers" value={playerStats.turnovers} onIncrement={() => handleStatChange("turnovers", 1)} onDecrement={() => handleStatChange("turnovers", -1)} />
                </div>
              </div>
            )}
          </div>
          {/* Extra padding for bottom controls */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Fixed Bottom Controls - Enhanced styling */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="w-full max-w-md mx-auto p-3">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={handleShare} className="w-full py-3 rounded-lg font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
              {shareMessage ? shareMessage : <ShareIcon />}
            </button>
            <button
              onClick={toggleClock}
              className={`w-full py-3 rounded-lg font-bold text-lg ${game.isRunning ? "bg-yellow-500 text-black" : "bg-green-500 text-white"}`}
              disabled={gameEnded}
            >
              {game.isRunning ? "Pause" : "Start"}
            </button>
            
            {/* Enhanced Next/End Game button with glow effects */}
            <button 
              onClick={handleManualAdvance} 
              className={`w-full font-bold py-3 rounded-lg text-lg text-white transition-all duration-300 transform hover:scale-105 ${
                atFinalPeriod 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50 shadow-lg hover:shadow-red-500/70 hover:shadow-xl animate-pulse' 
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/50 shadow-lg hover:shadow-orange-500/70 hover:shadow-xl'
              }`}
              style={{
                boxShadow: atFinalPeriod 
                  ? '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)' 
                  : '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)'
              }}
            >
              {endButtonLabel}
            </button>
           </div>
        </div>
      </div>
    </div>
    </div>
  );
}