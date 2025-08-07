import React, { useState } from "react";
import { TrashIcon } from "./icons";

export default function Settings({
  teams = [],
  onAddTeam,
  onDeleteTeam,
  gameFormat,
  setGameFormat,
  periodLength,
  setPeriodLength,
  numPeriods,
  setNumPeriods,
  onDeleteLiveGames,
}) {
  const [newTeam, setNewTeam] = useState("");
  const [error, setError] = useState("");

  // Add Team handler
  const handleAdd = () => {
    const name = newTeam.trim();
    if (!name) return;
    if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setError("Team already exists!");
      return;
    }
    setError("");
    onAddTeam(name);
    setNewTeam("");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-orange-500">Settings</h2>
      {/* Teams */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Teams</h3>
        <ul className="mb-2">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-700">
              <span>{team.name}</span>
              <button
                onClick={() => onDeleteTeam(team.id)}
                className="p-1 text-red-400 hover:text-red-600"
                title="Delete team"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="Add team"
            className="p-2 rounded border w-full"
          />
          <button
            onClick={handleAdd}
            className="bg-orange-500 text-white p-2 rounded"
          >
            Add
          </button>
        </div>
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      </div>

      {/* Game Format */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Game Format</h3>
        <div className="flex gap-2 mb-2">
          <select
            value={gameFormat}
            onChange={(e) => setGameFormat(e.target.value)}
            className="p-2 rounded border"
          >
            <option value="periods">4 Periods</option>
            <option value="halves">2 Halves</option>
          </select>
          <input
            type="number"
            min={1}
            value={periodLength}
            onChange={(e) => setPeriodLength(Number(e.target.value))}
            className="p-2 rounded border"
            placeholder="Length (min)"
          />
          <input
            type="number"
            min={1}
            value={numPeriods}
            onChange={(e) => setNumPeriods(Number(e.target.value))}
            className="p-2 rounded border"
            placeholder="Number"
          />
        </div>
      </div>

      {/* Delete live games */}
      <div>
        <h3 className="text-xl font-bold mb-2">Live Games</h3>
        <button
          onClick={onDeleteLiveGames}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Delete All Live Games
        </button>
      </div>
    </div>
  );
}

