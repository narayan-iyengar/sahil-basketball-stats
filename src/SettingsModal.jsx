import React, { useState, useEffect } from "react";
import {
  SunIcon,
  MoonIcon,
  TrashIcon,
  ChartIcon,
} from "./icons";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { OfflineStorage } from "./utils/offlineUtils";

// Add missing icons
const SyncIcon = ({ className = "", spinning = false }) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const WiFiOnIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WiFiOffIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 8.5a5 5 0 007 0M5 12.5a9 9 0 0014 0M12 21l0-8.5m-7-2.5a13 13 0 0014 0" />
  </svg>
);

const DatabaseIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

export default function SettingsModal({
  open,
  onClose,
  teams = [],
  onAddTeam,
  onDeleteTeam,
  gameFormat,
  setGameFormat,
  theme,
  toggleTheme,
  periodLength,
  setPeriodLength,
  onDeleteAllLiveGames,
  isOnline = true,           // Add this with default
  pendingCount = 0,          // Add this with default  
  onManualSync,              // Add this
  syncInProgress = false,    // Add this with default
  isUserAdmin = false,       // Add this with default
}) {
  const [newTeam, setNewTeam] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "saving", "success", "error"
  const [localPeriodLength, setLocalPeriodLength] = useState(periodLength.toString());

  // Sync local state when props change
  useEffect(() => {
    setLocalPeriodLength(periodLength.toString());
  }, [periodLength]);

  // De-dupe teams by id (should not be needed if parent does it right)
  const uniqueTeams = Array.from(
    new Map(teams.map((t) => [t.id, t])).values()
  );

  // Prevent duplicate teams by name (case insensitive)
  /*
  const handleAddTeam = async (name) => {
    const trimmed = name.trim();
    if (
      !trimmed ||
      teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 1200);
      return;
    }
    setSaveStatus("saving");
    try {
      await onAddTeam(trimmed);
      setSaveStatus("success");
      setNewTeam("");
      // Teams list will update by parent via props, so do not push here!
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus(""), 1200);
  };
  */


  //Offline handleAddTeam:

const handleAddTeam = async (name) => {
  const trimmed = name.trim();
  if (!trimmed || teams.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
    setSaveStatus("error");
    setTimeout(() => setSaveStatus(""), 1200);
    return;
  }
  
  setSaveStatus("saving");
  try {
    if (isOnline) {
      await onAddTeam(trimmed);
    } else {
      // Create team offline
      const tempId = OfflineStorage.savePendingTeam({ name: trimmed });
      // Update local state immediately
      setTeams(prev => [...prev, { id: tempId, name: trimmed, isOffline: true }]);
      alert("Team saved offline. Will sync when online.");
    }
    setSaveStatus("success");
    setNewTeam("");
  } catch {
    setSaveStatus("error");
  }
  setTimeout(() => setSaveStatus(""), 1200);
};

  const handleDeleteTeam = async (id) => {
    setSaveStatus("saving");
    try {
      await onDeleteTeam(id);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus(""), 1200);
  };

  // Game format/length changes with Firebase persistence
  const handleGameFormatChange = async (format) => {
    setSaveStatus("saving");
    try {
      await setGameFormat(format); // This now calls updateGameSettings in App.jsx
      setSaveStatus("success");
    } catch (error) {
      console.error("Error updating game format:", error);
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus(""), 1200);
  };

  const handlePeriodLengthChange = async (value) => {
    // Update local state immediately for responsive UI
    setLocalPeriodLength(value);
    
    // Only save to Firebase if it's a valid number
    const length = parseInt(value) || 0;
    if (length > 0) {
      setSaveStatus("saving");
      try {
        await setPeriodLength(length); // This now calls updateGameSettings in App.jsx
        setSaveStatus("success");
      } catch (error) {
        console.error("Error updating period length:", error);
        setSaveStatus("error");
      }
      setTimeout(() => setSaveStatus(""), 1200);
    }
  };

  // Handle blur event to ensure we have a valid value
  const handlePeriodLengthBlur = () => {
    const length = parseInt(localPeriodLength) || 10; // Default to 10 if invalid
    if (length !== periodLength) {
      setLocalPeriodLength(length.toString());
      handlePeriodLengthChange(length.toString());
    }
  };

  // Theme switcher - don't close modal, just toggle theme
  const handleThemeToggle = () => {
    toggleTheme();
    setSaveStatus("success");
    setTimeout(() => setSaveStatus(""), 1200);
  };

  // Delete live games (closes modal)
  const handleDeleteAllLiveGames = async () => {
    setSaveStatus("saving");
    try {
      await onDeleteAllLiveGames();
      setSaveStatus("success");
      setTimeout(() => {
        setSaveStatus("");
        onClose();
      }, 300);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 1200);
    }
  };

  // Handle manual sync with error handling
  const handleSyncClick = async () => {
    if (!onManualSync) {
      console.warn("onManualSync prop not provided to SettingsModal");
      return;
    }
    
    setSaveStatus("saving");
    try {
      await onManualSync();
      setSaveStatus("success");
    } catch (error) {
      console.error("Sync failed:", error);
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus(""), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl max-w-md w-full mx-2 p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-3 text-2xl text-gray-500 hover:text-orange-500"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold font-bold text-orange-500 mb-6 flex items-center">
          Settings
          <SaveStatusIndicator status={saveStatus} />
        </h2>

        {/* Teams */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Teams</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Add new team"
              className="flex-1 rounded bg-gray-100 dark:bg-gray-800 p-2 outline-none border border-gray-300 dark:border-gray-600"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTeam.trim()) {
                  handleAddTeam(newTeam.trim());
                }
              }}
            />
            <button
              className="bg-orange-500 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded disabled:opacity-50"
              onClick={() => handleAddTeam(newTeam)}
              disabled={!newTeam.trim()}
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {uniqueTeams.map((team) => (
              <li key={team.id} className="flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                <span>{team.name}</span>
                <button
                  className="p-1 text-red-400 hover:text-red-600 rounded"
                  onClick={() => handleDeleteTeam(team.id)}
                  title="Delete Team"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Game Format - Now with Firebase sync */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Game Format</h3>
          <div className="flex gap-4 items-center mb-2">
            <label>
              <input
                type="radio"
                className="mr-1"
                name="gameFormat"
                value="periods"
                checked={gameFormat === "periods"}
                onChange={() => handleGameFormatChange("periods")}
              />
              Periods
            </label>
            <label>
              <input
                type="radio"
                className="mr-1"
                name="gameFormat"
                value="halves"
                checked={gameFormat === "halves"}
                onChange={() => handleGameFormatChange("halves")}
              />
              Halves
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Length (minutes per {gameFormat === "halves" ? "half" : "period"})
            </label>
            <input
              type="text"
              min="1"
              max="30"
              className="bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 w-24 text-gray-900 dark:text-white"
              value={localPeriodLength}
              onChange={(e) => {
                // Allow any input while typing, including empty string
                setLocalPeriodLength(e.target.value);
              }}
              onBlur={handlePeriodLengthBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePeriodLengthBlur();
                }
              }}
              placeholder="10"
            />
          </div>
        </div>

        {/* Actions row - Theme toggle and data management icons */}
        <div className="flex items-center justify-between mt-4">
          {/* Left: Data management icons (only for admins) */}
          {isUserAdmin && (
            <div className="flex items-center gap-2">
              {/* Sync status indicator */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <WiFiOnIcon className="w-5 h-5 text-green-600 dark:text-green-400" title="Online" />
                  </div>
                ) : (
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <WiFiOffIcon className="w-5 h-5 text-red-600 dark:text-red-400" title="Offline" />
                  </div>
                )}
                {pendingCount > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {pendingCount}
                  </span>
                )}
              </div>
              
              {/* Sync button (only if needed) */}
              {pendingCount > 0 && (
                <button
                  onClick={handleSyncClick}
                  disabled={syncInProgress || !isOnline}
                  className="p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded transition-colors"
                  title={`Sync ${pendingCount} items`}
                >
                  <SyncIcon className={`w-6 h-6 ${syncInProgress ? 'animate-spin' : ''}`} />
                </button>
              )}
              
              {/* Clear offline data */}
              <button
                onClick={() => {
                  if (window.confirm('Clear all cached offline data? This cannot be undone.')) {
                    OfflineStorage.clearAllOfflineData();
                    alert('Offline data cleared');
                    setSaveStatus("success");
                    setTimeout(() => setSaveStatus(""), 1200);
                  }
                }}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600 hover:text-red-700"
                title="Clear All Offline Data"
              >
                <DatabaseIcon className="w-4 h-4" />
              </button>
              
              {/* Delete live games */}
              <button
                onClick={handleDeleteAllLiveGames}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600 hover:text-red-700"
                title="Delete All Live Games"
              >
                <TrashIcon className="w-6 h-6" />
              </button>
            </div>
          )}
          
          {/* Right: Theme toggle */}
          <button
            onClick={handleThemeToggle}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Switch theme"
          >
            {theme === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}