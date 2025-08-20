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
  onSignIn,   // NEW: optional, for anonymous view
  // NEW PROPS FOR FILTERING
  games = [],
  dashboardFilters = {},
  onDashboardFiltersChange,
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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

  // Check if any filters are active
  const hasActiveFilters = dashboardFilters.searchTerm || dashboardFilters.dateFilter || dashboardFilters.outcomeFilter;

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    if (onDashboardFiltersChange) {
      onDashboardFiltersChange(newFilters);
    }
  };

  return (
    <header className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Live Button */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setPage("game_setup")}
            >
              <BasketballIcon className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500 animate-spin-slow hover:scale-110 transition-transform" />
            </div>
            {LiveIndicator}
          </div>

          {/* Right: Controls - Settings, Dashboard, Filter, Sign Out */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Button - Always visible */}
            <button
              onClick={openSettingsModal}
              className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2 transition-all `}
              title="Settings"
            >
              <SlidersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Dashboard Button - Always visible */}
            <button
              onClick={() => setPage("dashboard")}
              className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg p-2 transition-all`}
              title="Dashboard"
            >
              <ChartIcon className="h-5 w-5" />
            </button>

            {/* Filter Button - Always visible, functional only on Dashboard */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    if (page === "dashboard") {
                      setShowFilterDropdown(!showFilterDropdown);
                    }
                  }}
                  className={`flex items-center justify-center rounded-lg p-2 transition-all border-2 ${
                    page === "dashboard"
                      ? `bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 cursor-pointer ${
                          hasActiveFilters 
                            ? 'border-orange-300 shadow-sm shadow-orange-300/30' 
                            : 'border-transparent'
                        }`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border-transparent'
                  }`}
                  title={page === "dashboard" ? "Filter games" : "Filter only available on Dashboard"}
                  disabled={page !== "dashboard"}
                >
                  <FilterIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  {hasActiveFilters && page === "dashboard" && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></span>
                  )}
                </button>
                
                {showFilterDropdown && page === "dashboard" && (
                  <FilterDropdown 
                    games={games}
                    filters={dashboardFilters}
                    onFiltersChange={handleFiltersChange}
                    onClose={() => setShowFilterDropdown(false)}
                  />
                )}
              </div>
            )}

            {/* Sign Out/Sign In Button */}
            {user ? (
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
                  title="Sign In"
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