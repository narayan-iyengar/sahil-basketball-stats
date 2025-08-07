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
          className={`ml-2 flex items-center gap-1 px-2 py-1 font-semibold text-xs rounded-full transition
            ${hasLive
              ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 animate-pulse cursor-pointer"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            }`}
//      className={`flex items-center px-2 py-1 rounded font-semibold text-xs select-none
//        ${hasLive
//          ? "cursor-pointer text-red-600 hover:bg-red-100 dark:hover:bg-gray-800"
//          : "text-gray-400 cursor-not-allowed"}
//      `}
//      style={{ outline: "none", border: "none", background: "none" }}
      onClick={handleLiveClick}
      title={hasLive ? "Watch Live Game" : "No Live Game In Progress"}
    >
      <BlinkingDot active={hasLive} />
      <span className="hidden sm:inline">Live</span>
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
      <div
        className="
          max-w-6xl
          mx-auto
          flex
          items-center
          justify-between
          px-2 sm:px-4
          py-2 sm:py-4
          gap-1 sm:gap-8
        "
      >
        {/* Logo and Title */}
        <div
          className="flex items-center min-w-0 cursor-pointer"
          onClick={() => setPage("game_setup")}
        >
          <BasketballIcon className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500 animate-spin-slow" />
          <h1 className="ml-1 sm:ml-2 truncate text-lg sm:text-xl font-bold text-orange-500">
            Sahil's Stats
          </h1>
        </div>

        {/* Presence & Live */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {LiveIndicator}
          <div className="flex items-center group relative">
            <UserIcon className="w-5 h-5 text-blue-400 mr-0.5 sm:mr-1" />
            <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">{admins.length}</span>
            <div className="absolute top-full left-0 mt-2 p-2 rounded bg-white dark:bg-gray-900 shadow text-xs z-40 w-48 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
              <b>Admins:</b>
              {renderUserList(admins)}
            </div>
          </div>
          <div className="flex items-center group relative">
            <EyeIcon className="w-5 h-5 text-green-400 mr-0.5 sm:mr-1" />
            <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">{viewers.length}</span>
            <div className="absolute top-full left-0 mt-2 p-2 rounded bg-white dark:bg-gray-900 shadow text-xs z-40 w-48 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
              <b>Viewers:</b>
              {renderUserList(viewers)}
            </div>
          </div>
        </div>
        
        {/* Controls (Settings, Dashboard, Sign Out) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            title="Settings"
            onClick={openSettingsModal}
            className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2"
          >
            <SlidersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={() => setPage("dashboard")}
            className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2"
            title="Dashboard"
          >
            <ChartIcon className="h-5 w-5" />
          </button>
          {user ? (
            <button
              onClick={onSignOut}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 flex items-center justify-center"
              title="Sign Out"
            >
              <LogOutIcon className="h-5 w-5" />
            </button>
          ) : (
            onSignIn && (
              <button
                onClick={onSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 flex items-center justify-center"
                title="Sign In"
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

