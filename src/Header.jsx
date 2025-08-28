import React, { useEffect, useState, useCallback } from "react";
import { BasketballIcon, LogOutIcon, ChartIcon, EyeIcon, UserIcon, SlidersIcon, FilterIcon } from "./icons";
import SyncStatusIndicator from "./components/SyncStatusIndicator";
import { OfflineStorage } from "./utils/offlineUtils";

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

// WiFi icons for online/offline status
const WiFiOnIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WiFiOffIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 8.5a5 5 0 017 0M5 12.5a9 9 0 0114 0M12 21l0-8.5m-7-2.5a13 13 0 0114 0" />
  </svg>
);

// Sync icon
const SyncIcon = ({ className = "", spinning = false }) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
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
  isOnline = true,
  onManualSync,
  syncInProgress = false,
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const hasLive = !!liveGameId;

  // Update pending count
  useEffect(() => {
    const updateCount = () => {
      setPendingCount(OfflineStorage.getPendingCount());
    };
    
    updateCount();
    const interval = setInterval(updateCount, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Clean header that blends seamlessly
  const getHeaderBgColor = () => {
    if (!isOnline) {
      return "bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800";
    }
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

            {/* Live Game Indicator */}
            {LiveIndicator}

            {/* WiFi Status Indicator - Match Live indicator styling */}
            <div className={`flex items-center gap-1 px-3 py-1.5 font-semibold text-sm rounded-full transition-all ${
              isOnline 
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 shadow-md'
                : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 shadow-md'
            }`}>
              {isOnline ? (
                <WiFiOnIcon className="w-3 h-3" />
              ) : (
                <WiFiOffIcon className="w-3 h-3" />
              )}
              <span className="font-bold tracking-wide">
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
              {!isOnline && pendingCount > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
                  {pendingCount}
                </span>
              )}
            </div>

            {/* Sync Indicator for Online Pending Items */}
            {isOnline && pendingCount > 0 && isUserAdmin && (
              <button
                onClick={handleSyncClick}
                disabled={syncInProgress}
                className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-full text-xs transition-colors disabled:opacity-50"
                title={`${pendingCount} items ready to sync`}
              >
                <SyncIcon className="w-3 h-3" spinning={syncInProgress} />
                <span className="hidden sm:inline">
                  {syncInProgress ? "Syncing..." : `${pendingCount} pending`}
                </span>
              </button>
            )}
          </div>

          {/* Right: Controls - Settings, Dashboard, Sign Out/In */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Button - Enhanced styling for admins */}
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

            {/* Sync Status Indicator - Compact version for header */}
            {isUserAdmin && (
              <div className="hidden lg:block">
                <SyncStatusIndicator 
                  isOnline={isOnline} 
                  user={user} 
                  size="xs" 
                  showText={false}
                  onClick={!syncInProgress && pendingCount > 0 ? handleSyncClick : undefined}
                />
              </div>
            )}

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

        {/* Secondary row for mobile sync status */}
        {!isOnline && isUserAdmin && pendingCount > 0 && (
          <div className="mt-2 lg:hidden flex justify-center">
            <button
              onClick={handleSyncClick}
              disabled={syncInProgress}
              className="flex items-center gap-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-yellow-900 rounded-full text-xs font-medium transition-colors"
            >
              <SyncIcon className="w-3 h-3" spinning={syncInProgress} />
              {syncInProgress ? "Syncing..." : `Sync ${pendingCount} items`}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}