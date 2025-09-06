import React, { useEffect, useState, useCallback } from "react";
import { BasketballIcon, LogOutIcon, ChartIcon, EyeIcon, UserIcon, SlidersIcon, FilterIcon } from "./icons";

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
  onSignOut,
  setPage,
  theme,
  toggleTheme,
  page,
  liveGameId,
  goToLiveGame,
  openSettingsModal,
  onSignIn,
  isUserAdmin = false,
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const hasLive = !!liveGameId;


  // Clean header that blends seamlessly - no special offline styling
  const getHeaderBgColor = () => {
    if (isUserAdmin) {
      return "bg-gray-100 dark:bg-gray-900"; // Match the main app background
    }
    return "bg-slate-50/80 dark:bg-slate-800/80"; 
  };

  // Live indicator click handler
  const handleLiveClick = () => {
    if (!hasLive) return;
    
    // If in live_admin, confirm before navigating away (only for admins)
    if (page === "live_admin" && isUserAdmin) {
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
          ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 animate-pulse cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 shadow-md"
          : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
        }`}
      onClick={handleLiveClick}
      title={hasLive ? "Watch Live Game" : "No Live Game In Progress"}
    >
      <BlinkingDot active={hasLive} />
      <span className="font-bold tracking-wide">LIVE</span>
    </button>
  );

  // Settings button click handler
  const handleSettingsClick = () => {
    if (!isUserAdmin) {
      alert("Access denied. Only administrators can access settings.");
      return;
    }
    openSettingsModal();
  };

  // Navigation handlers with admin checks
  const handleGameSetupClick = () => {
    if (!isUserAdmin) {
      alert("Access denied. Only administrators can create games.");
      return;
    }
    setPage("game_setup");
  };

  // Handle sync button click
  const handleSyncClick = () => {
    if (!isUserAdmin || syncInProgress || pendingCount === 0) return;
    onManualSync();
  };

  return (
    <header 
      className={`${getHeaderBgColor()} backdrop-blur-sm sticky top-0 z-20 transition-all duration-500`}
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo, Live Button, and Status Indicators */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => {
                // Only admins can go to game setup, others go to dashboard
                if (isUserAdmin) {
                  setPage("game_setup");
                } else {
                  setPage("dashboard");
                }
              }}
            >
              <div className="flex items-center justify-center text-lg">
                <span className="animate-spin-slow group-hover:scale-110 transition-transform duration-300 text-xl sm:text-2xl">🏀</span>
              </div>
              
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  Sahil's Stats
                </span>
              </div>
            </div>

            {/* Live Game Indicator */}
            {LiveIndicator}
          </div>

          {/* Right: Controls - GRAYSCALE NAVIGATION BUTTONS */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Button - GRAYSCALE */}
            <button
              onClick={handleSettingsClick}
              disabled={!isUserAdmin}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                isUserAdmin
                  ? 'bg-gray-500 hover:bg-gray-600 text-white cursor-pointer shadow-md hover:shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isUserAdmin ? "Settings" : "Settings (Admin Only)"}
            >
              <SlidersIcon className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>

            {/* Dashboard Button - GRAYSCALE */}
            <button
              onClick={() => setPage("dashboard")}
              className="flex items-center justify-center rounded-lg p-2 transition-all bg-gray-500 hover:bg-gray-600 text-white cursor-pointer shadow-md hover:shadow-lg"
              title="Dashboard"
            >
              <ChartIcon className="h-5 w-5" />
            </button>

            {/* Sign Out/Sign In Button - GRAYSCALE */}
            {user && !user.isAnonymous ? (
              <button
                onClick={onSignOut}
                className="rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg"
                title="Sign Out"
              >
                <LogOutIcon className="h-5 w-5" />
              </button>
            ) : (
              onSignIn && (
                <button
                  onClick={onSignIn}
                  className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all shadow-md hover:shadow-lg"
                  title="Sign In with Google"
                >
                  <UserIcon className="h-5 w-5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}