import React, { useState, useEffect, useMemo } from "react";

const StatInput = ({ label, name, value, onChange }) => (
  <div className="flex flex-col items-center flex-1 min-w-[70px]">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      min={0}
      className="bg-gray-50 dark:bg-gray-700 rounded p-2 w-20 text-center border border-gray-300 dark:border-gray-600 
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      style={{
        MozAppearance: "textfield",
      }}
    />
  </div>
);

const StatStepper = ({ label, name, value, onChange }) => (
  <div className="flex flex-col items-center">
    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</span>
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={() => onChange(name, Math.max(0, value - 1))}
        className="bg-red-500 hover:bg-red-600 w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={value <= 0}
      >
        –
      </button>
      <span className="text-lg font-bold text-gray-900 dark:text-white w-6 text-center">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(name, value + 1)}
        className="bg-green-500 hover:bg-green-600 w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center shadow-md"
      >
        +
      </button>
    </div>
  </div>
);

export default function AddStatForm({ gameConfig, onAddStat, onCancel, isEditing = false, onUpdateStat, stats = [] }) {
  const [formData, setFormData] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get unique locations from previous games
  const uniqueLocations = useMemo(() => {
    const locationSet = new Set(stats.map((s) => s.location).filter(Boolean));
    return [...locationSet];
  }, [stats]);

  useEffect(() => {
    if (gameConfig) {
      setFormData({
        myTeamScore: gameConfig.myTeamScore || 0,
        opponentScore: gameConfig.opponentScore || 0,
        location: gameConfig.location || "",
        fg2m: gameConfig.fg2m || 0,
        fg2a: gameConfig.fg2a || 0,
        fg3m: gameConfig.fg3m || 0,
        fg3a: gameConfig.fg3a || 0,
        ftm: gameConfig.ftm || 0,
        fta: gameConfig.fta || 0,
        rebounds: gameConfig.rebounds || 0,
        assists: gameConfig.assists || 0,
        steals: gameConfig.steals || 0,
        blocks: gameConfig.blocks || 0,
        fouls: gameConfig.fouls || 0,
        turnovers: gameConfig.turnovers || 0,
      });
    }
  }, [isEditing, gameConfig]);

  const points = useMemo(() => {
    if (!formData) return 0;
    return (formData.fg2m * 2) + (formData.fg3m * 3) + formData.ftm;
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleTextInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStepperChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
          
          // Use Google Places API if available, otherwise fallback
          const googleApiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;
          
          if (googleApiKey && googleApiKey !== 'YOUR_API_KEY_HERE') {
            try {
              const placesResponse = await fetch(
                `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=gym&keyword=basketball|recreation|sports|center&key=${googleApiKey}`
              );
              const placesData = await placesResponse.json();
              
              if (placesData.results && placesData.results.length > 0) {
                const closestPlace = placesData.results[0];
                setFormData((prev) => ({ ...prev, location: closestPlace.name }));
                setIsGettingLocation(false);
                return;
              }
            } catch (error) {
              console.error("Google Places API error:", error);
            }
          }
          
          // Fallback to reverse geocoding
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          const locationName = data.locality || data.city || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setFormData((prev) => ({ ...prev, location: locationName }));
          setIsGettingLocation(false);
        } catch (error) {
          console.error("Error getting location name:", error);
          setFormData((prev) => ({ 
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      onUpdateStat(gameConfig.id, formData);
    } else {
      onAddStat(formData);
    }
  };

  if (!gameConfig || !formData) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading form...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-orange-500">{isEditing ? "Edit Game Stats" : "Enter Final Stats"}</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {gameConfig.teamName} vs {gameConfig.opponent}
          </p>
        </div>
        <div className="text-right mt-4 sm:mt-0">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Points</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{points}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Final Score */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Final Score</h3>
          <div className="flex gap-8 justify-center">
            <StatInput label={gameConfig.teamName} name="myTeamScore" value={formData.myTeamScore} onChange={handleInputChange} />
            <StatInput label={gameConfig.opponent} name="opponentScore" value={formData.opponentScore} onChange={handleInputChange} />
          </div>
        </div>


        {/* Shooting */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Shooting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 min-w-[200px]">
              <h4 className="text-md font-bold text-center mb-3">2-Pointers</h4>
              <div className="flex justify-around">
                <StatInput label="Made" name="fg2m" value={formData.fg2m} onChange={handleInputChange} />
                <StatInput label="Attempted" name="fg2a" value={formData.fg2a} onChange={handleInputChange} />
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 min-w-[200px]">
              <h4 className="text-md font-bold text-center mb-3">3-Pointers</h4>
              <div className="flex justify-around">
                <StatInput label="Made" name="fg3m" value={formData.fg3m} onChange={handleInputChange} />
                <StatInput label="Attempted" name="fg3a" value={formData.fg3a} onChange={handleInputChange} />
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 min-w-[200px]">
              <h4 className="text-md font-bold text-center mb-3">Free Throws</h4>
              <div className="flex justify-around">
                <StatInput label="Made" name="ftm" value={formData.ftm} onChange={handleInputChange} />
                <StatInput label="Attempted" name="fta" value={formData.fta} onChange={handleInputChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Performance</h3>
          {/* Row 1 */}
          <div className="flex flex-wrap md:flex-nowrap justify-center space-x-0 md:space-x-8 mb-4 gap-y-8">
            {[
              { label: "Rebounds", name: "rebounds" },
              { label: "Assists", name: "assists" },
              { label: "Steals", name: "steals" },
            ].map(({ label, name }, index) => (
              <div key={name} className="flex flex-col items-center relative px-4">
                <StatStepper label={label} name={name} value={formData[name]} onChange={handleStepperChange} />
                {index < 2 && (
                  <div className="hidden md:block absolute right-[-12px] top-2 bottom-2 w-[2px] bg-gray-400 dark:bg-gray-600"></div>
                )}
              </div>
            ))}
          </div>
          {/* Row 2 */}
          <div className="flex flex-wrap md:flex-nowrap justify-center space-x-0 md:space-x-8 gap-y-8">
            {[
              { label: "Blocks", name: "blocks" },
              { label: "Fouls", name: "fouls" },
              { label: "Turnovers", name: "turnovers" },
            ].map(({ label, name }, index) => (
              <div key={name} className="flex flex-col items-center relative px-4">
                <StatStepper label={label} name={name} value={formData[name]} onChange={handleStepperChange} />
                {index < 2 && (
                  <div className="hidden md:block absolute right-[-12px] top-2 bottom-2 w-[2px] bg-gray-400 dark:bg-gray-600"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg"
          >
            Save Stats
          </button>
        </div>
      </form>
    </div>
  );
}