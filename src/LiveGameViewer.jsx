import React, { useEffect, useState, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { BasketballIcon } from "./icons";

// Bench Icon - Person sitting on bench
const BenchIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Person's head */}
    <circle cx="8" cy="5" r="1.5" />
    {/* Person's body */}
    <rect x="6.5" y="7" width="3" height="3" rx="0.5" />
    {/* Person's legs */}
    <rect x="7" y="10" width="0.8" height="3" rx="0.4" />
    <rect x="8.2" y="10" width="0.8" height="3" rx="0.4" />
    {/* Bench seat */}
    <rect x="3" y="9.5" width="14" height="1" rx="0.5" />
    {/* Bench legs */}
    <rect x="4" y="10.5" width="0.5" height="2" rx="0.25" />
    <rect x="15.5" y="10.5" width="0.5" height="2" rx="0.25" />
  </svg>
);

export default function LiveGameViewer({ db, gameId, user }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [displayClock, setDisplayClock] = useState(0);
  const [displayClockTenths, setDisplayClockTenths] = useState(0);
  const displayInterval = useRef(null);

  // Live game data logic
  useEffect(() => {
    if (!db || !gameId) return;
    const gameRef = doc(db, "liveGames", gameId);
    const unsub = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
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
        setError("This game is no longer live.");
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

  // Display clock updater (for smooth countdown)
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
  }, [game?.isRunning, game?.clockStartTime, game?.clockAtStart, displayClock]);

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white dark:bg-gray-800 rounded-xl">
        <BasketballIcon className="hover:animate-spin-slow transition-transform" />
        <h2 className="text-2xl font-bold text-red-500 mt-4">Game Not Found</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">{error}</p>
      </div>
    );
  }

  if (!game) {
    return <div className="text-center p-10">Loading Live Game...</div>;
  }

  // Sahil's stats
  const sahil = (game.playerStats || game.sahilStats || {});
  const points =
    (Number(sahil.fg2m) || 0) * 2 +
    (Number(sahil.fg3m) || 0) * 3 +
    (Number(sahil.ftm) || 0);

  const statCards = [
    { label: "Points", value: points },
    { label: "2PT Made", value: sahil.fg2m ?? 0 },
    { label: "2PT Attempted", value: sahil.fg2a ?? 0 },
    { label: "3PT Made", value: sahil.fg3m ?? 0 },
    { label: "3PT Attempted", value: sahil.fg3a ?? 0 },
    { label: "FT Made", value: sahil.ftm ?? 0 },
    { label: "FT Attempted", value: sahil.fta ?? 0 },
    { label: "Assists", value: sahil.assists ?? 0 },
    { label: "Rebounds", value: sahil.rebounds ?? 0 },
    { label: "Steals", value: sahil.steals ?? 0 },
    { label: "Fouls", value: sahil.fouls ?? 0 },
  ];

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
  const periodName = game.gameFormat === "halves" ? "Half" : "Period";

  // Clock styling for viewers too
  const clockIsRed = displayClock <= 120;
  const clockIsUrgent = displayClock <= 60 && displayClock > 0;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center text-orange-500">Live Game</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex justify-around items-center text-center">
          <div className="w-1/3">
            <h3 className="text-xl md:text-2xl font-bold truncate text-gray-900 dark:text-white">{game.teamName}</h3>
            <p className="text-5xl md:text-7xl font-mono text-gray-900 dark:text-white">{game.homeScore}</p>
          </div>
          <div className="w-1/3">
            <div className="flex flex-col items-center">
              <p className={`text-4xl font-mono tracking-wider  text-gray-900 dark:text-white transition-all duration-300  ${
                clockIsUrgent 
                  ? 'text-red-500 animate-pulse scale-110 font-bold' 
                  : clockIsRed 
                    ? 'text-red-500 animate-pulse' 
                    : ''
              }`}>
                {formatTime(displayClock, displayClockTenths)}
              </p>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mt-1 capitalize">
                {periodName} {game.period}
              </p>
            </div>
          </div>
          <div className="w-1/3">
            <h3 className="text-xl md:text-2xl font-bold truncate text-gray-900 dark:text-white">{game.opponent}</h3>
            <p className="text-5xl md:text-7xl font-mono text-gray-900 dark:text-white">{game.awayScore}</p>
          </div>
        </div>
      </div>
      
      {/* Bench Status Indicator */}
      {game.sahilOnBench && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
            <BenchIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Sahil is on the bench</span>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Stats will resume when he's back in the game
          </p>
        </div>
      )}
      
      {/* Viewer status message - SIMPLIFIED */}
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>
          Live game updates automatically. 
          {!user && " Sign in (top-right) if you're a family admin."}
        </p>
      </div>
      
      {/* Sahil Live Stats Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            {game.sahilOnBench ? (
              <BenchIcon className="w-5 h-5 text-orange-500" />
            ) : (
              <span className="text-lg">🏀</span>
            )}
            <span className="font-bold text-orange-500 text-lg">
              {game.sahilOnBench ? "Bench Stats" : "Live Stats"}
            </span>
          </div>
          {game.sahilOnBench && (
            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
              On Bench
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statCards.map(card => (
            <div
              key={card.label}
              className={`rounded-lg p-3 flex flex-col items-center transition-opacity ${
                game.sahilOnBench 
                  ? 'bg-gray-50 dark:bg-gray-800 opacity-75' 
                  : 'bg-gray-100 dark:bg-gray-900'
              }`}
            >
              <span className="text-xs text-orange-500 font-semibold">{card.label}</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</span>
            </div>
          ))}
        </div>
        
        {game.sahilOnBench && (
          <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            💡 Current stats shown - updates paused while on bench
          </div>
        )}
      </div>
    </div>
  );
}