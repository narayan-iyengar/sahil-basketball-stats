import React, { useEffect, useState, useCallback } from "react";
import { BasketballIcon, LogOutIcon, ChartIcon, SunIcon, MoonIcon, EyeIcon, UserIcon, SlidersIcon } from "./icons";

// Blinking dot for Live indicator
const BlinkingDot = ({ active }) => (
  <span
    className={`inline-block rounded-full transition
      ${active ? "bg-red-500 animate-pulse" : "bg-gray-400"}
    `}
    style={{
      width: 12,
      height: 12,
      marginRight: 6,
      verticalAlign: "middle",
    }}
  ></span>
);

export default function Header({
  user,
  admins = [],
  viewers = [],
  onSignOut,
  setPage,
  theme,
  page,
  liveGameId,
  goToLiveGame,
  openSettingsModal,
  onSignIn,   // NEW: optional, for anonymous view
}) {
  const hasLive = !!liveGameId;

  // Live indicator: dot on mobile, dot+Live label on desktop
  const handleLiveClick = () => {
    if (!hasLive) return;
    // If in live_admin, confirm before navigating away
    if (page === "live_admin") {
      if (
        window.confirm(
          "You are currently scoring the game. If you leave, you may lose unsaved progress.\nContinue to live viewer?"
        )
      ) {
        goToLiveGame();
      }
    } else {
      goToLiveGame();
    }
  };

  const LiveIndicator = (
    <button
      disabled={!hasLive}
      className={`flex items-center gap-1 px-3 py-1.5 font-semibold text-sm rounded-full transition-all
        ${hasLive
          ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 animate-pulse cursor-pointer hover:bg-red-200 dark:hover:bg-red-800"
          : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
        }`}
      onClick={handleLiveClick}
      title={hasLive ? "Watch Live Game" : "No Live Game In Progress"}
    >
      <BlinkingDot active={hasLive} />
      <span className="font-bold tracking-wide">LIVE</span>
    </button>
  );

  const renderUserList = users =>
    Array.isArray(users) && users.length ? (
      <ul className="text-xs text-gray-800 dark:text-gray-200">
        {users.map((u, i) => (
          <li key={u.uid || i}>
            {u.name || "Unknown"} {u.uid === user?.uid && <span className="text-orange-500">(You)</span>}
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-xs text-gray-400">No one online</span>
    );

  return (
    <header className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto grid grid-cols-3 items-center px-2 sm:px-4 py-2 sm:py-4 gap-4">
        {/* Left: Logo */}
        <div
          className="flex items-center cursor-pointer justify-start"
          onClick={() => setPage("game_setup")}
        >
          <BasketballIcon className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500 animate-spin-slow hover:scale-110 transition-transform" />
        </div>

        {/* Center: Live Button */}
        <div className="flex justify-center">
          {LiveIndicator}
        </div>

        {/* Right: Controls with Presence Indicators */}
        <div className="flex items-center gap-1 sm:gap-2 justify-end">
          <button
            onClick={openSettingsModal}
            className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2 transition-all border-2 ${
              admins.length === 0 
                ? 'border-transparent' 
                : admins.length === 1
                ? 'border-blue-300 shadow-sm shadow-blue-300/30'
                : admins.length === 2
                ? 'border-blue-400 shadow-md shadow-blue-400/40'
                : 'border-blue-500 shadow-lg shadow-blue-500/50'
            }`}
          >
            <SlidersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={() => setPage("dashboard")}
            className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2 transition-all border-2 ${
              viewers.length === 0 
                ? 'border-transparent' 
                : viewers.length === 1
                ? 'border-green-300 shadow-sm shadow-green-300/30'
                : viewers.length <= 3
                ? 'border-green-400 shadow-md shadow-green-400/40'
                : 'border-green-500 shadow-lg shadow-green-500/50'
            }`}
          >
            <ChartIcon className="h-5 w-5" />
          </button>
          {user ? (
            <button
              onClick={onSignOut}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all"
            >
              <LogOutIcon className="h-5 w-5" />
            </button>
          ) : (
            onSignIn && (
              <button
                onClick={onSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all"
              >
                <UserIcon className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}