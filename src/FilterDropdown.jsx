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

  // Close dropdown when clicking outside - but NOT on the filter button
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if the click was on the filter button itself - if so, don't close
        const filterButton = event.target.closest('[data-filter-button]');
        if (!filterButton) {
          onClose && onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Get unique values for filter options
  const uniqueOpponents = [...new Set(
    games.map(game => game.opponent)
         .filter(Boolean)
  )].sort();
  
  const uniqueDates = [...new Set(
    games.map(game => {
      // Handle both timestamp and date fields
      if (game.timestamp) {
        return new Date(game.timestamp).toISOString().split('T')[0];
      }
      if (game.date) {
        return game.date;
      }
      return null;
    })
    .filter(Boolean)
  )].sort().reverse(); // Most recent first

  // Check if any filters are active
  const hasActiveFilters = filters.searchTerm || filters.dateFilter || filters.outcomeFilter;

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      dateFilter: '',
      outcomeFilter: ''
    });
    // Close dropdown after clearing
    setTimeout(() => onClose && onClose(), 100);
  };

  // Handle filter changes with smoother auto-close
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    onFiltersChange(newFilters);
    
    // Smoother auto-close with longer delay for better UX
    setTimeout(() => onClose && onClose(), 400);
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transform transition-all duration-300 ease-out opacity-100 scale-100"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Games</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 transition-colors"
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
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none transition-colors"
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
            onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none transition-colors"
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
            onChange={(e) => handleFilterChange('outcomeFilter', e.target.value)}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 text-sm focus:ring-orange-500 focus:ring-1 outline-none transition-colors"
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