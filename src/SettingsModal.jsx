import React, { useState, useEffect } from "react";
import {
  SunIcon,
  MoonIcon,
  TrashIcon,
  ChartIcon,
} from "./icons";
import SaveStatusIndicator from "./SaveStatusIndicator";

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
}) {
  const [newTeam, setNewTeam] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "saving", "success", "error"

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedFormat = localStorage.getItem("gameFormat");
    const savedLength = localStorage.getItem("periodLength");
    
    if (savedFormat && savedFormat !== gameFormat) {
      setGameFormat(savedFormat);
    }
    if (savedLength && parseInt(savedLength) !== periodLength) {
      setPeriodLength(parseInt(savedLength));
    }
  }, []);

  // De-dupe teams by id (should not be needed if parent does it right)
  const uniqueTeams = Array.from(
    new Map(teams.map((t) => [t.id, t])).values()
  );

  // Prevent duplicate teams by name (case insensitive)
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

  // Game format/length changes with persistence
  const handleGameFormatChange = (format) => {
    setGameFormat(format);
    localStorage.setItem("gameFormat", format);
    setSaveStatus("success");
    setTimeout(() => setSaveStatus(""), 1200);
  };

  const handlePeriodLengthChange = (val) => {
    const length = Number(val);
    setPeriodLength(length);
    localStorage.setItem("periodLength", length.toString());
    setSaveStatus("success");
    setTimeout(() => setSaveStatus(""), 1200);
  };

  // Theme switcher with close
  const handleThemeToggle = () => {
    toggleTheme();
    setSaveStatus("success");
    setTimeout(() => {
      setSaveStatus("");
      onClose();
    }, 200);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl max-w-md w-full mx-2 p-6 relative">
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

        {/* Game Format */}
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
              type="number"
              min="1"
              max="30"
              className="bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 w-24"
              value={periodLength}
              onChange={e => handlePeriodLengthChange(e.target.value)}
            />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-4 justify-end mt-4">
          <button
            onClick={handleThemeToggle}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Switch theme"
          >
            {theme === "dark" ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </button>
          <button
            onClick={handleDeleteAllLiveGames}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-400 hover:text-red-600"
            title="Delete all live games"
          >
            <TrashIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}