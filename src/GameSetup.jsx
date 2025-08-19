import React, { useState, useEffect, useMemo } from "react";

export default function GameSetup({ teams = [], stats = [], onSubmit }) {
  const [config, setConfig] = useState({
    teamName: "",
    opponent: "",
    gameFormat: localStorage.getItem("gameFormat") || "periods",
    periodLength: parseInt(localStorage.getItem("periodLength")) || 10,
    numPeriods: 4,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  });
  const [error, setError] = useState("");
  const uniqueTeams = useMemo(() => {
    // De-dupe by id and name (just in case)
    const map = new Map();
    for (const t of teams) {
      if (t && t.id && !map.has(t.name.toLowerCase())) {
        map.set(t.name.toLowerCase(), t);
      }
    }
    return Array.from(map.values());
  }, [teams]);

  const uniqueOpponents = useMemo(() => {
    const opponentSet = new Set(stats.map((s) => s.opponent).filter(Boolean));
    return [...opponentSet];
  }, [stats]);

  useEffect(() => {
    if (uniqueTeams.length > 0 && !config.teamName) {
      setConfig((prev) => ({ ...prev, teamName: uniqueTeams[0].name }));
    }
  }, [uniqueTeams, config.teamName]);

  const handleOpponentChange = (e) => {
    const value = e.target.value;
    setConfig((prev) => ({ ...prev, opponent: value }));
  };

  // Check if current opponent exists in database
  const opponentExists = uniqueOpponents.some(
    (opp) => opp.toLowerCase() === config.opponent.toLowerCase()
  );

  // Find close matches for suggestions
  const suggestedOpponent = uniqueOpponents.find(
    (opp) => 
      config.opponent.length >= 2 && 
      opp.toLowerCase().includes(config.opponent.toLowerCase()) &&
      opp.toLowerCase() !== config.opponent.toLowerCase()
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (mode) => {
    if (!config.teamName || !config.opponent) {
      setError("Please select a team and enter an opponent name.");
      return;
    }
    setError("");
    const gameTimestamp = new Date(
      `${config.date}T${config.time}`
    ).toISOString();
    if (typeof onSubmit === "function") {
      onSubmit({ ...config, timestamp: gameTimestamp }, mode);
    } else {
      setError("Internal error: Game submit not available.");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header with centered date/time */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1 border border-gray-300 dark:border-gray-600">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              name="date"
              value={config.date}
              onChange={handleChange}
              className="bg-transparent text-gray-900 dark:text-white text-sm outline-none appearance-none w-24"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1 border border-gray-300 dark:border-gray-600">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <input
              type="time"
              name="time"
              value={config.time}
              onChange={handleChange}
              className="bg-transparent text-gray-900 dark:text-white text-sm outline-none appearance-none w-24"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-4 text-center">
          {error}
        </p>
      )}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sahil's Team
          </label>
          <select
            name="teamName"
            value={config.teamName}
            onChange={handleChange}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full appearance-none"
          >
            <option value="" disabled>
              Select Team
            </option>
            {uniqueTeams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Opponent's Team
          </label>
          <input
            type="text"
            name="opponent"
            placeholder="e.g., Oakland Soldiers"
            value={config.opponent}
            onChange={handleOpponentChange}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {/* Status indicators */}
          {config.opponent && (
            <div className="mt-2 text-sm">
              {opponentExists ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Played before
                </div>
              ) : suggestedOpponent ? (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Did you mean: 
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, opponent: suggestedOpponent }))}
                    className="ml-1 text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {suggestedOpponent}
                  </button>
                  ?
                </div>
              ) : (
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New opponent
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6 space-y-4">
          <button
            onClick={() => handleSubmit("live")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center text-lg"
          >
            Start Live Game & Track Stats
          </button>
          <button
            onClick={() => handleSubmit("final")}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center text-lg border border-gray-300 dark:border-gray-600"
          >
            Enter Final Stats Only
          </button>
        </div>
      </div>
    </div>
  );
}