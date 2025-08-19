import React, { useState, useRef, useEffect } from "react";

// Clear Icon
const ClearIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function FilterDropdown({ 
  games = [], 
  filters, 
  onFiltersChange,
  onClose,
  className = "" 
}) {
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose && onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Get unique values for filter options
  const uniqueOpponents = [...new Set(games.map(game => game.opponent).filter(Boolean))].sort();
  const uniqueDates = [...new Set(games.map(game => game.date).filter(Boolean))].sort().reverse(); // Most recent first

  // Check if any filters are active
  const hasActiveFilters = filters.searchTerm || filters.dateFilter || filters.outcomeFilter;

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      dateFilter: '',
      outcomeFilter: ''
    });
    onClose && onClose(); // Close dropdown after clearing
  };

  // Handle filter changes and close dropdown
  const handleFilterChange = (newFilters) => {
    onFiltersChange(newFilters);
    onClose && onClose(); // Close dropdown after selecting filter
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Games</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600"
            >
              <ClearIcon className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Opponent Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Opponent
          </label>
          <select
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange({ ...filters, searchTerm: e.target.value })}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none"
          >
            <option value="">All opponents</option>
            {uniqueOpponents.map((opponent, index) => (
              <option key={index} value={opponent}>
                {opponent}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Game Date
          </label>
          <select
            value={filters.dateFilter || ''}
            onChange={(e) => handleFilterChange({ ...filters, dateFilter: e.target.value })}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none"
          >
            <option value="">All dates</option>
            {uniqueDates.map((date, index) => (
              <option key={index} value={date}>
                {new Date(date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Result
          </label>
          <select
            value={filters.outcomeFilter || ''}
            onChange={(e) => handleFilterChange({ ...filters, outcomeFilter: e.target.value })}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none"
          >
            <option value="">All games</option>
            <option value="W">Wins</option>
            <option value="L">Losses</option>
            <option value="T">Ties</option>
          </select>
        </div>

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="font-medium">Active filters:</span>
            {filters.searchTerm && <span className="block">• Opponent: {filters.searchTerm}</span>}
            {filters.dateFilter && <span className="block">• Date: {new Date(filters.dateFilter).toLocaleDateString()}</span>}
            {filters.outcomeFilter && <span className="block">• Result: {filters.outcomeFilter === 'W' ? 'Wins' : filters.outcomeFilter === 'L' ? 'Losses' : 'Ties'}</span>}
          </div>
        )}
      </div>
    </div>
  );
}