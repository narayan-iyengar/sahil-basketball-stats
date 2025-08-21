import React, { useEffect, useState, useCallback } from "react";
import { BasketballIcon, LogOutIcon, ChartIcon, SunIcon, MoonIcon, EyeIcon, UserIcon, SlidersIcon, FilterIcon } from "./icons";
import FilterDropdown from "./FilterDropdown";

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
  page,
  liveGameId,
  goToLiveGame,
  openSettingsModal,
  onSignIn,
  isUserAdmin = false,
}) {
  const hasLive = !!liveGameId;

  // Determine header background color based on user role - SIMPLIFIED
  const getHeaderBgColor = () => {
    if (isUserAdmin) {
      return "bg-gradient-to-r from-amber-50/90 via-orange-50/90 to-red-50/90 dark:from-amber-900/40 dark:via-orange-900/40 dark:to-red-900/40 border-b-2 border-orange-200/50 dark:border-orange-700/50"; // Admin - warm amber to red with border
    }
    return "bg-slate-50/80 dark:bg-slate-800/80"; // Everyone else - neutral slate
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

  // Check if any filters are active
  const hasActiveFilters = false; // Removed filter logic from header

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

  return (
    <header className={`${getHeaderBgColor()} backdrop-blur-sm sticky top-0 z-20 transition-all duration-500 shadow-sm`}>
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Live Button */}
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
              <span className="text-2xl animate-spin-slow group-hover:scale-110 transition-transform duration-300">🏀</span>
              <span className="hidden sm:inline text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Sahil's Stats
              </span>
            </div>
            {LiveIndicator}
          </div>

          {/* Right: Controls - Settings, Dashboard, Sign Out/In */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Button - Disabled for non-admins */}
            <button
              onClick={handleSettingsClick}
              disabled={!isUserAdmin}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                isUserAdmin
                  ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 cursor-pointer'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isUserAdmin ? "Settings" : "Settings (Admin Only)"}
            >
              <SlidersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Dashboard Button - Always visible */}
            <button
              onClick={() => setPage("dashboard")}
              className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2 transition-all"
              title="Dashboard"
            >
              <ChartIcon className="h-5 w-5" />
            </button>

            {/* Sign Out/Sign In Button - FIXED: Check for actual Google auth */}
            {user && !user.isAnonymous ? (
              <button
                onClick={onSignOut}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all"
                title="Sign Out"
              >
                <LogOutIcon className="h-5 w-5" />
              </button>
            ) : (
              onSignIn && (
                <button
                  onClick={onSignIn}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all"
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