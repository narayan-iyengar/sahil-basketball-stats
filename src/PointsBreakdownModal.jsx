import React from "react";
import { CloseIcon } from "./icons";

// Points breakdown modal component
export default function PointsBreakdownModal({ game, onClose }) {
  if (!game) return null;

  // Calculate total points
  const totalPoints = (game.fg2m * 2) + (game.fg3m * 3) + game.ftm;
  
  // Get period breakdown if available, otherwise estimate
  const periodBreakdown = game.periodBreakdown || estimatePeriodBreakdown(game);
  
  // Determine period format
  const isHalves = game.gameFormat === "halves" || game.numPeriods === 2;
  const periodName = isHalves ? "Half" : "Period";
  const totalPeriods = isHalves ? 2 : 4;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-orange-500">
            Points Breakdown
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Game Info */}
        <div className="mb-4 text-center">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {game.teamName} vs {game.opponent}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(game.timestamp).toLocaleDateString()}
          </p>
        </div>

        {/* Total Points Display */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-4 text-center">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {totalPoints}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Points
          </div>
        </div>

        {/* Period Breakdown */}
        <div className="space-y-3 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {periodName} Breakdown
          </h4>
          {Array.from({ length: totalPeriods }, (_, index) => {
            const period = index + 1;
            const points = periodBreakdown[period] || 0;
            return (
              <div
                key={period}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {periodName} {period}
                </span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {points} pts
                </span>
              </div>
            );
          })}
        </div>

        {/* Shooting Breakdown */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Shooting Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {(game.fg2m * 2) || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                2-Pointers
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {game.fg2m || 0}/{game.fg2a || 0}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {(game.fg3m * 3) || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                3-Pointers
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {game.fg3m || 0}/{game.fg3a || 0}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {game.ftm || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Free Throws
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {game.ftm || 0}/{game.fta || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to estimate period breakdown when not available
function estimatePeriodBreakdown(game) {
  const totalPoints = (game.fg2m * 2) + (game.fg3m * 3) + game.ftm;
  const isHalves = game.gameFormat === "halves" || game.numPeriods === 2;
  const numPeriods = isHalves ? 2 : 4;
  
  // If no breakdown data, distribute points somewhat randomly but realistically
  const breakdown = {};
  
  if (totalPoints === 0) {
    // No points scored
    for (let i = 1; i <= numPeriods; i++) {
      breakdown[i] = 0;
    }
    return breakdown;
  }
  
  // Create a realistic distribution
  // Usually more points in second half/later periods
  const weights = isHalves 
    ? [0.45, 0.55] // First half slightly less, second half slightly more
    : [0.22, 0.28, 0.24, 0.26]; // Gradually increasing with slight variance
  
  let remainingPoints = totalPoints;
  
  for (let i = 0; i < numPeriods - 1; i++) {
    const periodPoints = Math.round(totalPoints * weights[i]);
    breakdown[i + 1] = Math.min(periodPoints, remainingPoints);
    remainingPoints -= breakdown[i + 1];
  }
  
  // Put remaining points in last period
  breakdown[numPeriods] = remainingPoints;
  
  return breakdown;
}