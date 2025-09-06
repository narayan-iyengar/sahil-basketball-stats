import React, { useState, useEffect, useMemo } from "react";

// Location icon
const LocationIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// GPS icon
const GPSIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export default function GameSetup({ teams = [], stats = [], onSubmit, onAddTeam }) {
  const [config, setConfig] = useState({
    teamName: "",
    opponent: "",
    location: "",
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showAddTeamInput, setShowAddTeamInput] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  
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

  // Get unique locations from previous games for suggestions
  const uniqueLocations = useMemo(() => {
    const locationSet = new Set(stats.map((s) => s.location).filter(Boolean));
    return [...locationSet].sort();
  }, [stats]);

  // Set default team when teams are available
  useEffect(() => {
    if (uniqueTeams.length > 0 && !config.teamName) {
      setConfig((prev) => ({ ...prev, teamName: uniqueTeams[0].name }));
    }
  }, [uniqueTeams, config.teamName]);

  // Handle adding new team
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    
    const exists = uniqueTeams.some((team) => team.name.toLowerCase() === newTeamName.toLowerCase());
    if (exists) {
      alert("Team already exists!");
      return;
    }
    
    try {
      const newTeam = await onAddTeam(newTeamName.trim());
      if (newTeam) {
        setConfig((prev) => ({ ...prev, teamName: newTeam.name }));
        setNewTeamName("");
        setShowAddTeamInput(false);
      }
    } catch (error) {
      console.error("Error adding team:", error);
      alert("Failed to add team. Please try again.");
    }
  };

  const handleOpponentChange = (e) => {
    const value = e.target.value;
    setConfig((prev) => ({ ...prev, opponent: value }));
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setConfig((prev) => ({ ...prev, location: value }));
  };

  const handleTeamNameChange = (e) => {
    const value = e.target.value;
    setConfig((prev) => ({ ...prev, teamName: value }));
  };

  // Auto-detect location using geolocation
  const getAutoLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Try to get a readable location name using reverse geocoding
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          // Use various fallbacks for location name
          const locationName = data.locality || data.city || data.principalSubdivision || 
                              `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setConfig((prev) => ({ ...prev, location: locationName }));
          setIsGettingLocation(false);
        } catch (error) {
          console.error("Error getting location name:", error);
          // Fallback to coordinates
          setConfig((prev) => ({ 
            ...prev, 
            location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
          }));
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please enter manually.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
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

  // Find location suggestions
  const suggestedLocations = uniqueLocations.filter(
    (loc) => 
      config.location.length >= 2 && 
      loc.toLowerCase().includes(config.location.toLowerCase()) &&
      loc.toLowerCase() !== config.location.toLowerCase()
  ).slice(0, 3);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamDropdownChange = (e) => {
    const value = e.target.value;
    
    if (value === "__ADD_NEW_TEAM__") {
      setShowAddTeamInput(true);
      // Don't change the team selection, keep current value
    } else {
      setConfig((prev) => ({ ...prev, teamName: value }));
    }
  };

  const handleSubmit = (mode) => {
    if (!config.teamName || !config.opponent) {
      setError("Please enter a team name and opponent name.");
      return;
    }
    
    setError("");
    const gameTimestamp = new Date(`${config.date}T${config.time}`).toISOString();
    
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
          <input
            type="date"
            name="date"
            value={config.date}
            onChange={handleChange}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm outline-none"
          />
          <input
            type="time"
            name="time"
            value={config.time}
            onChange={handleChange}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-4 text-center">
          {error}
        </p>
      )}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sahil's Team
          </label>
          
          {showAddTeamInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter new team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTeam();
                  }
                  if (e.key === 'Escape') {
                    setShowAddTeamInput(false);
                    setNewTeamName("");
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTeamInput(false);
                  setNewTeamName("");
                }}
                className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              name="teamName"
              value={config.teamName}
              onChange={handleTeamDropdownChange}
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
              <option value="__ADD_NEW_TEAM__" className="font-medium text-blue-600">
                ➕ Add New Team...
              </option>
            </select>
          )}
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

        {/* Location Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <LocationIcon className="inline w-4 h-4 mr-1" />
            Location
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="location"
              placeholder="e.g., Oakland Rec Center, Home Court"
              value={config.location}
              onChange={handleLocationChange}
              className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 rounded p-3 focus:ring-orange-500 focus:ring-2 outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button
              type="button"
              onClick={getAutoLocation}
              disabled={isGettingLocation}
              className="px-3 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center"
              title="Auto-detect location"
            >
              {isGettingLocation ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <GPSIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* Location suggestions */}
          {suggestedLocations.length > 0 && (
            <div className="mt-2 text-sm">
              <div className="text-gray-600 dark:text-gray-400 mb-1">Previous locations:</div>
              <div className="flex flex-wrap gap-1">
                {suggestedLocations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, location }))}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {config.location && !uniqueLocations.includes(config.location) && (
            <div className="mt-2 text-sm">
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New location
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6 space-y-4">
          {/* Live Game Button */}
          <button
            onClick={() => handleSubmit("live")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center text-lg"
            title="Start Live Game & Track Stats"
          >
            Start Live Game & Track Stats
          </button>
          
          {/* Regular Game Button */}
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