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

  // Option 4: Subtle Glow Effect styling
  const getHeaderBgColor = () => {
    if (isUserAdmin) {
      return "bg-white dark:bg-gray-800 border-b border-orange-200 dark:border-orange-700/50"; 
    }
    return "bg-slate-50/80 dark:bg-slate-800/80"; 
  };

  // Option 4: Subtle glow effect
  const getContainerStyles = () => {
    if (isUserAdmin) {
      return {
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    return {};
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

  return (
    <header 
      className={`${getHeaderBgColor()} backdrop-blur-sm sticky top-0 z-20 transition-all duration-500`}
      style={getContainerStyles()}
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Live Button */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 cursor-pointer group relative ${
                isUserAdmin ? 'p-1 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 shadow-lg sm:shadow-xl border border-orange-200 dark:border-orange-700 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300' : ''
              }`}
              onClick={() => {
                // Only admins can go to game setup, others go to dashboard
                if (isUserAdmin) {
                  setPage("game_setup");
                } else {
                  setPage("dashboard");
                }
              }}
            >
              <div className={`flex items-center justify-center text-lg ${
                isUserAdmin ? 'w-10 h-10' : ''
              }`}>
                <span className={`animate-spin-slow group-hover:scale-110 transition-transform duration-300 text-xl sm:text-2xl`}>🏀</span>
              </div>
              
              <div className="hidden sm:flex flex-col">
                <span className={`text-lg font-bold ${
                  isUserAdmin 
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent'
                }`}>
                  Sahil's Stats
                </span>
              </div>
            </div>
            {LiveIndicator}
          </div>

          {/* Right: Controls - Settings, Dashboard, Sign Out/In */}
          <div className="flex items-center gap-2 sm:gap-2">
            {/* Settings Button - Option 4 styling */}
            <button
              onClick={handleSettingsClick}
              disabled={!isUserAdmin}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                isUserAdmin
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white cursor-pointer shadow-lg hover:shadow-xl'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isUserAdmin ? "Settings" : "Settings (Admin Only)"}
            >
              <SlidersIcon className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>

            {/* Dashboard Button - Matching gradient colors for admin */}
            <button
              onClick={() => setPage("dashboard")}
              className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                isUserAdmin
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white cursor-pointer shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
              }`}
              title="Dashboard"
            >
              <ChartIcon className="h-5 w-5" />
            </button>

            {/* Sign Out/Sign In Button - Enhanced for admins */}
            {user && !user.isAnonymous ? (
              <button
                onClick={onSignOut}
                className={`rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all ${
                  isUserAdmin
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title="Sign Out"
              >
                <LogOutIcon className="h-5 w-5" />
              </button>
            ) : (
              onSignIn && (
                <button
                  onClick={onSignIn}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 flex items-center justify-center border-2 border-transparent transition-all shadow-md hover:shadow-lg"
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