import React, { useState, useEffect, useMemo } from "react";

export default function GameSetup({ teams = [], stats = [], onSubmit }) {
  const [config, setConfig] = useState({
    teamName: "",
    opponent: "",
    gameFormat: "periods",
    periodLength: 10,
    numPeriods: 4,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  });
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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
    const opponentSet = new Set(stats.map((s) => s.opponent));
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
    if (value) {
      const filteredSuggestions = uniqueOpponents.filter((opp) =>
        opp.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (opponentName) => {
    setConfig((prev) => ({ ...prev, opponent: opponentName }));
    setSuggestions([]);
  };

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
      <h2 className="text-3xl font-bold text-orange-500 mb-6 text-center">
        Set Up New Game
      </h2>
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
            //className="bg-gray-50 dark:bg-gray-700 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full border border-gray-300 dark:border-gray-600"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full"

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
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Opponent's Team
          </label>
          <input
            type="text"
            name="opponent"
            placeholder="e.g., Oakland Soldiers"
            value={config.opponent}
            onChange={handleOpponentChange}
            //className="bg-gray-50 dark:bg-gray-700 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full border border-gray-300 dark:border-gray-600"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full"
            required
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md mt-1 max-h-40 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-500"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Game Date
            </label>
            <input
              type="date"
              name="date"
              value={config.date}
              onChange={handleChange}
              //className="bg-gray-50 dark:bg-gray-700 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full border border-gray-300 dark:border-gray-600"
             className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full"
              />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Game Time
            </label>
            <input
              type="time"
              name="time"
              value={config.time}
              onChange={handleChange}
              //className="bg-gray-50 dark:bg-gray-700 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full border border-gray-300 dark:border-gray-600"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none w-full"

            />
          </div>
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

