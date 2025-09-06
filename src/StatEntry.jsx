import React, { useState, useEffect } from "react";
import StatStepperGroup from "./StatStepperGroup";
import StatStepper from "./StatStepper";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { ShareIcon } from "./icons";

export default function StatEntry({ 
  gameConfig, 
  isLive = false,
  onSave, 
  onCancel,
  onShare,
  saveStatus,
  shareMessage 
}) {
  const [stats, setStats] = useState({
    myTeamScore: 0,
    opponentScore: 0,
    fg2m: 0,
    fg2a: 0,
    fg3m: 0,
    fg3a: 0,
    ftm: 0,
    fta: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fouls: 0,
    turnovers: 0,
  });

  useEffect(() => {
    if (gameConfig) {
      setStats({
        myTeamScore: gameConfig.myTeamScore || gameConfig.homeScore || 0,
        opponentScore: gameConfig.opponentScore || gameConfig.awayScore || 0,
        fg2m: gameConfig.fg2m || gameConfig.playerStats?.fg2m || 0,
        fg2a: gameConfig.fg2a || gameConfig.playerStats?.fg2a || 0,
        fg3m: gameConfig.fg3m || gameConfig.playerStats?.fg3m || 0,
        fg3a: gameConfig.fg3a || gameConfig.playerStats?.fg3a || 0,
        ftm: gameConfig.ftm || gameConfig.playerStats?.ftm || 0,
        fta: gameConfig.fta || gameConfig.playerStats?.fta || 0,
        rebounds: gameConfig.rebounds || gameConfig.playerStats?.rebounds || 0,
        assists: gameConfig.assists || gameConfig.playerStats?.assists || 0,
        steals: gameConfig.steals || gameConfig.playerStats?.steals || 0,
        blocks: gameConfig.blocks || gameConfig.playerStats?.blocks || 0,
        fouls: gameConfig.fouls || gameConfig.playerStats?.fouls || 0,
        turnovers: gameConfig.turnovers || gameConfig.playerStats?.turnovers || 0,
      });
    }
  }, [gameConfig]);

  const points = (stats.fg2m * 2) + (stats.fg3m * 3) + stats.ftm;

  const handleScoreChange = (team, delta) => {
    const key = team === "home" ? "myTeamScore" : "opponentScore";
    setStats(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta)
    }));
  };

  // FIXED: Stat change handler with corrected shooting logic
  const handleStatChange = (statName, delta) => {
    setStats(prev => {
      const newStats = { ...prev };
      const newValue = Math.max(0, prev[statName] + delta);
      newStats[statName] = newValue;
      
      // FIXED: Shot attempt logic - same as LiveGameAdmin
      // For made shots - every increase/decrease in made should increase/decrease attempts
      if (statName === "fg2m") {
        if (delta > 0) {
          // Increasing made shots - always increase attempts by the same amount
          newStats.fg2a = prev.fg2a + delta;
        } else if (delta < 0) {
          // Decreasing made shots - decrease attempts but keep attempts >= made
          newStats.fg2a = Math.max(newValue, prev.fg2a + delta);
        }
      }
      
      if (statName === "fg3m") {
        if (delta > 0) {
          // Increasing made shots - always increase attempts by the same amount
          newStats.fg3a = prev.fg3a + delta;
        } else if (delta < 0) {
          // Decreasing made shots - decrease attempts but keep attempts >= made
          newStats.fg3a = Math.max(newValue, prev.fg3a + delta);
        }
      }
      
      if (statName === "ftm") {
        if (delta > 0) {
          // Increasing made shots - always increase attempts by the same amount
          newStats.fta = prev.fta + delta;
        } else if (delta < 0) {
          // Decreasing made shots - decrease attempts but keep attempts >= made
          newStats.fta = Math.max(newValue, prev.fta + delta);
        }
      }
      
      // For attempt shots - ensure made <= attempts
      if (statName === "fg2a") {
        if (delta < 0) {
          // Decreasing attempts - ensure made doesn't exceed attempts
          newStats.fg2m = Math.min(prev.fg2m, newValue);
        }
        // When increasing attempts, no need to change made shots
      }
      
      if (statName === "fg3a") {
        if (delta < 0) {
          // Decreasing attempts - ensure made doesn't exceed attempts
          newStats.fg3m = Math.min(prev.fg3m, newValue);
        }
        // When increasing attempts, no need to change made shots
      }
      
      if (statName === "fta") {
        if (delta < 0) {
          // Decreasing attempts - ensure made doesn't exceed attempts
          newStats.ftm = Math.min(prev.ftm, newValue);
        }
        // When increasing attempts, no need to change made shots
      }
      
      return newStats;
    });
  };

  const handleSubmit = () => {
    onSave(stats);
  };

  if (!gameConfig) {
    return (
      <div className="max-w-md mx-auto text-center p-10">
        <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-24">
      {/* Score and game info card - similar to LiveGameAdmin */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 relative">
        <div className="absolute top-2 right-2">
          {saveStatus && <SaveStatusIndicator status={saveStatus} />}
        </div>
        
        <div className="flex justify-around items-center text-center mb-4">
          <div className="w-1/3 flex flex-col items-center relative">
            <span className="text-lg font-bold truncate text-center">{gameConfig.teamName}</span>
            <div className="flex items-center">
              <span className="text-5xl font-mono">{stats.myTeamScore}</span>
            </div>
          </div>
          <div className="w-1/3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-orange-500">Final Stats</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{gameConfig.opponent}</span>
          </div>
          <div className="w-1/3 flex flex-col items-center relative">
            <span className="text-lg font-bold truncate text-center">{gameConfig.opponent}</span>
            <div className="flex items-center">
              <span className="text-5xl font-mono">{stats.opponentScore}</span>
            </div>
          </div>
        </div>
        
        {/* Score controls - similar to LiveGameAdmin */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg">
            <button 
              onClick={() => handleScoreChange("home", -1)} 
              className="bg-red-500 w-7 h-7 rounded-md text-lg font-bold disabled:opacity-50" 
              disabled={stats.myTeamScore <= 0}
            >
              -
            </button>
            <span className="font-semibold text-sm px-1">{gameConfig.teamName}</span>
            <button 
              onClick={() => handleScoreChange("home", 1)} 
              className="bg-green-500 w-7 h-7 rounded-md text-lg font-bold"
            >
              +
            </button>
          </div>
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg">
            <button 
              onClick={() => handleScoreChange("away", -1)} 
              className="bg-red-500 w-7 h-7 rounded-md text-lg font-bold disabled:opacity-50" 
              disabled={stats.opponentScore <= 0}
            >
              -
            </button>
            <span className="font-semibold text-sm px-1">{gameConfig.opponent}</span>
            <button 
              onClick={() => handleScoreChange("away", 1)} 
              className="bg-green-500 w-7 h-7 rounded-md text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Stats card - exactly like LiveGameAdmin */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-center text-orange-500 mb-4">Sahil's Stats</h3>
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{points}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 block">Total Points</span>
        </div>
        
        <div className="space-y-4">
          <StatStepperGroup 
            label="2-Pointers" 
            madeValue={stats.fg2m} 
            attValue={stats.fg2a} 
            onStatChange={handleStatChange} 
            madeKey="fg2m" 
            attKey="fg2a" 
          />
          <StatStepperGroup 
            label="3-Pointers" 
            madeValue={stats.fg3m} 
            attValue={stats.fg3a} 
            onStatChange={handleStatChange} 
            madeKey="fg3m" 
            attKey="fg3a" 
          />
          <StatStepperGroup 
            label="Free Throws" 
            madeValue={stats.ftm} 
            attValue={stats.fta} 
            onStatChange={handleStatChange} 
            madeKey="ftm" 
            attKey="fta" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <StatStepper 
            label="Rebounds" 
            value={stats.rebounds} 
            onIncrement={() => handleStatChange("rebounds", 1)} 
            onDecrement={() => handleStatChange("rebounds", -1)} 
          />
          <StatStepper 
            label="Assists" 
            value={stats.assists} 
            onIncrement={() => handleStatChange("assists", 1)} 
            onDecrement={() => handleStatChange("assists", -1)} 
          />
          <StatStepper 
            label="Steals" 
            value={stats.steals} 
            onIncrement={() => handleStatChange("steals", 1)} 
            onDecrement={() => handleStatChange("steals", -1)} 
          />
          <StatStepper 
            label="Blocks" 
            value={stats.blocks} 
            onIncrement={() => handleStatChange("blocks", 1)} 
            onDecrement={() => handleStatChange("blocks", -1)} 
          />
          <StatStepper 
            label="Fouls" 
            value={stats.fouls} 
            onIncrement={() => handleStatChange("fouls", 1)} 
            onDecrement={() => handleStatChange("fouls", -1)} 
          />
          <StatStepper 
            label="Turnovers" 
            value={stats.turnovers} 
            onIncrement={() => handleStatChange("turnovers", 1)} 
            onDecrement={() => handleStatChange("turnovers", -1)} 
          />
        </div>
      </div>

      {/* Bottom action buttons - similar to LiveGameAdmin */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-3 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-lg font-bold text-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg font-bold text-lg bg-green-500 hover:bg-green-600 text-white"
          >
            Save Stats
          </button>
        </div>
      </div>
    </div>
  );
}