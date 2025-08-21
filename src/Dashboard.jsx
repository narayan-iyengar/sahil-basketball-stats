import React, { useMemo, useState, useEffect, useRef } from "react";
import StatGraphModal from "./StatGraphModal";
import { PlusIcon, TrashIcon, ChevronRightIcon, FilterIcon } from "./icons";
import { getEarnedBadges, BadgeSummary, BadgeDisplay } from "./achievement_system";
import { PhotoUpload, PhotoThumbnails } from "./photo_system";
import FilterDropdown from "./FilterDropdown";

// Import admin utilities
import { canDelete, canWrite, showAccessDenied } from "./utils/adminUtils";

// Additional icons for mobile-friendly buttons
const SelectIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CancelIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6m0 12L6 6" />
  </svg>
);

const SelectAllIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ClearIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Subtle checkmark icon
const CheckIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Expandable bar icon
const ExpandableBar = ({ isExpanded, className = "" }) => (
  <div className={`w-12 h-1 bg-gray-400 rounded-full transition-all duration-200 ${isExpanded ? 'bg-orange-500' : ''} ${className}`} />
);

// Card for stat values
const StatCard = ({ label, value, onClick, clickable }) => (
  <div
    className={`bg-gray-100 dark:bg-gray-700 flex flex-col rounded-lg p-2 items-center min-w-[70px] transition cursor-pointer ${
      clickable ? "hover:shadow-lg hover:bg-orange-50 dark:hover:bg-orange-900" : ""
    }`}
    onClick={clickable ? onClick : undefined}
  >
    <span className="text-xs text-orange-500 mb-1">{label}</span>
    <span className="text-2xl font-bold text-black dark:text-white">{value}</span>
  </div>
);

// Group games by age
function groupGamesByAge(games) {
  const BIRTH = new Date("2016-11-01");
  const byAge = {};
  games.forEach((g) => {
    if (!g.timestamp) return;
    const gameDate = new Date(g.timestamp);
    let age = gameDate.getFullYear() - BIRTH.getFullYear();
    const isBeforeBirthday =
      gameDate.getMonth() < 10 ||
      (gameDate.getMonth() === 10 && gameDate.getDate() < 1);
    if (isBeforeBirthday) age -= 1;
    if (age < 8) return;
    if (!byAge[age])
      byAge[age] = {
        value: 0,
        date: `Age ${age}`,
        team: g.teamName,
        opponent: g.opponent,
      };
    byAge[age].value += 1;
  });
  return Object.entries(byAge)
    .map(([k, v]) => ({ ...v, date: v.date }))
    .sort((a, b) => Number(a.date.split(" ")[1]) - Number(b.date.split(" ")[1]));
}

export default function Dashboard({
  user,
  stats = [],
  onDeleteGame,
  onUpdateGamePhotos, 
  externalFilters = {},
  isUserAdmin = false,
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [graphData, setGraphData] = useState(null);
  
  // Local filter state (no longer using external filters)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState(""); 
  
  // Filter dropdown state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [expandedGameIds, setExpandedGameIds] = useState([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingGameId, setDeletingGameId] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const [showOpponentSuggestions, setShowOpponentSuggestions] = useState(false);
  
  // Multi-select state
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const GAMES_PER_PAGE = 4;

  // Remove external filter sync since we're now handling filters locally
  // (removed useEffect for externalFilters)

  // Unique opponent suggestions
  const allOpponents = useMemo(() => {
    const oppSet = new Set();
    (stats || []).forEach(game => {
      if (game.opponent) oppSet.add(game.opponent.trim());
    });
    return Array.from(oppSet);
  }, [stats]);

  const filteredOpponentSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    return allOpponents
      .filter((opp) => opp.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 7);
  }, [allOpponents, searchTerm]);

  // Aggregate stats
  const aggregatedStats = (stats || []).reduce((acc, game) => {
    acc.points = (acc.points || 0) + (parseInt(game.points, 10) || 0);
    acc.fg2m = (acc.fg2m || 0) + (parseInt(game.fg2m, 10) || 0);
    acc.fg2a = (acc.fg2a || 0) + (parseInt(game.fg2a, 10) || 0);
    acc.fg3m = (acc.fg3m || 0) + (parseInt(game.fg3m, 10) || 0);
    acc.fg3a = (acc.fg3a || 0) + (parseInt(game.fg3a, 10) || 0);
    acc.ftm = (acc.ftm || 0) + (parseInt(game.ftm, 10) || 0);
    acc.fta = (acc.fta || 0) + (parseInt(game.fta, 10) || 0);
    acc.rebounds = (acc.rebounds || 0) + (parseInt(game.rebounds, 10) || 0);
    acc.assists = (acc.assists || 0) + (parseInt(game.assists, 10) || 0);
    acc.steals = (acc.steals || 0) + (parseInt(game.steals, 10) || 0);
    acc.blocks = (acc.blocks || 0) + (parseInt(game.blocks, 10) || 0);
    acc.fouls = (acc.fouls || 0) + (parseInt(game.fouls, 10) || 0);
    acc.turnovers = (acc.turnovers || 0) + (parseInt(game.turnovers, 10) || 0);
    acc.gamesPlayed = (acc.gamesPlayed || 0) + 1;
    return acc;
  }, {});

  const totalFgMade = (aggregatedStats.fg2m || 0) + (aggregatedStats.fg3m || 0);
  const totalFgAtt = (aggregatedStats.fg2a || 0) + (aggregatedStats.fg3a || 0);

  const formatPercent = (made, attempted) => {
    if (!attempted || attempted === 0) return "0%";
    return `${Math.round((made / attempted) * 100)}%`;
  };

  const formatRatio = (val1, val2) => {
    if (!val2 || val2 === 0) return val1 > 0 ? `${val1.toFixed(1)}` : "0.0";
    return (val1 / val2).toFixed(2);
  };

  // Filters and pagination
  const sortedAndFilteredStats = useMemo(() => {
    let sortableItems = [...(stats || [])];
    
    if (searchTerm) {
      sortableItems = sortableItems.filter((game) => {
        const opponent = game.opponent || "";
        return opponent.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    if (dateFilter) {
      sortableItems = sortableItems.filter((game) => {
        // Handle both timestamp and date formats
        let gameDate = "";
        if (game.timestamp) {
          gameDate = new Date(game.timestamp).toISOString().split('T')[0];
        } else if (game.date) {
          gameDate = game.date;
        }
        return gameDate === dateFilter;
      });
    }
    
    if (outcomeFilter) {
      sortableItems = sortableItems.filter((game) => game.outcome === outcomeFilter);
    }
    
    sortableItems.sort((a, b) => {
      if (a.timestamp < b.timestamp) return 1;
      if (a.timestamp > b.timestamp) return -1;
      return 0;
    });
    
    return sortableItems;
  }, [stats, searchTerm, dateFilter, outcomeFilter]);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
    return sortedAndFilteredStats.slice(
      startIndex,
      startIndex + GAMES_PER_PAGE
    );
  }, [sortedAndFilteredStats, currentPage]);
  
  const totalPages = Math.ceil(sortedAndFilteredStats.length / GAMES_PER_PAGE);

  // Stat graph handler
  const handleStatClick = (statKey, statName) => {
    if (statKey === "gamesPlayed") {
      setGraphData({
        statKey,
        statName: "Games Played per Age",
        data: groupGamesByAge(stats || []),
      });
    } else {
      const data = [...(stats || [])]
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .map((game) => ({
          value:
            statKey === "assistTurnoverRatio"
              ? game.turnovers
                ? (game.assists / game.turnovers).toFixed(2)
                : "0.00"
              : game[statKey] || 0,
          date: new Date(game.date).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          }),
          team: game.teamName,
          opponent: game.opponent,
        }));
      setGraphData({ statKey, statName, data });
    }
  };

  // Multi-select handlers with admin checks
  const toggleSelectionMode = () => {
    if (!isUserAdmin) {
      showAccessDenied('select and delete games');
      return;
    }
    setIsSelectionMode(!isSelectionMode);
    setSelectedGameIds([]);
  };

  const toggleGameSelection = (gameId) => {
    if (!isUserAdmin) return;
    setSelectedGameIds(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const selectAllGames = () => {
    if (!isUserAdmin) return;
    const currentPageGameIds = paginatedStats.map(game => game.id);
    setSelectedGameIds(currentPageGameIds);
  };

  const deselectAllGames = () => {
    setSelectedGameIds([]);
  };

  const handleBulkDelete = () => {
    if (!canDelete(user)) {
      showAccessDenied('delete games');
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    selectedGameIds.forEach(gameId => {
      onDeleteGame(gameId);
    });
    setSelectedGameIds([]);
    setIsSelectionMode(false);
    setShowBulkDeleteConfirm(false);
  };

  // Delete handlers with admin checks
  const handleDeleteClick = (gameId) => {
    if (!canDelete(user)) {
      showAccessDenied('delete games');
      return;
    }
    setDeletingGameId(gameId);
  };

  const confirmDeleteGame = () => {
    if (deletingGameId) {
      onDeleteGame(deletingGameId);
      setDeletingGameId(null);
    }
  };

  const handleDeleteTeamClick = (teamId) => {
    if (!canDelete(user)) {
      showAccessDenied('delete teams');
      return;
    }
    setDeletingTeamId(teamId);
  };

  const confirmDeleteTeam = () => {
    if (deletingTeamId) {
      onDeleteTeam(deletingTeamId);
      setDeletingTeamId(null);
    }
  };

  const toggleExpandGame = (gameId) => {
    if (isSelectionMode) return;
    setExpandedGameIds((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    );
  };

  // Add new team with admin check
  const handleTeamSubmit = (e) => {
    e.preventDefault();
    if (!canWrite(user)) {
      showAccessDenied('add teams');
      return;
    }
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName("");
    }
  };

  // Helper to show zero for blank/undefined stat
  const showZero = (val) => (val === undefined || val === null || val === "" ? 0 : val);

  // Opponent suggestion handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowOpponentSuggestions(true);
  };
  
  const handleOpponentSuggestionClick = (opp) => {
    setSearchTerm(opp);
    setShowOpponentSuggestions(false);
  };

  // Format timestamp properly
  const formatGameTimestamp = (timestamp) => {
    if (!timestamp) return "No date";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit", 
      year: "numeric"
    }) + " " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div>
      {graphData && (
        <StatGraphModal graphData={graphData} onClose={() => setGraphData(null)} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-orange-500">
              Career Totals
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatCard
                label="Games Played"
                value={aggregatedStats.gamesPlayed || 0}
              />
              <StatCard
                label="Points"
                value={aggregatedStats.points || 0}
                clickable
                onClick={() => handleStatClick("points", "Points")}
              />
              <StatCard
                label="Rebounds"
                value={aggregatedStats.rebounds || 0}
                clickable
                onClick={() => handleStatClick("rebounds", "Rebounds")}
              />
              <StatCard
                label="Assists"
                value={aggregatedStats.assists || 0}
                clickable
                onClick={() => handleStatClick("assists", "Assists")}
              />
              <StatCard
                label="Steals"
                value={aggregatedStats.steals || 0}
                clickable
                onClick={() => handleStatClick("steals", "Steals")}
              />
              <StatCard
                label="Blocks"
                value={aggregatedStats.blocks || 0}
                clickable
                onClick={() => handleStatClick("blocks", "Blocks")}
              />
              <StatCard
                label="Fouls"
                value={aggregatedStats.fouls || 0}
                clickable
                onClick={() => handleStatClick("fouls", "Fouls")}
              />
              <StatCard
                label="Turnovers"
                value={aggregatedStats.turnovers || 0}
                clickable
                onClick={() => handleStatClick("turnovers", "Turnovers")}
              />
              <StatCard
                label="A/T Ratio"
                value={formatRatio(aggregatedStats.assists, aggregatedStats.turnovers)}
              />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
            <h4 className="text-lg font-bold mb-3 text-orange-500">
              Shooting
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <StatCard
                label="FG%"
                value={formatPercent(totalFgMade, totalFgAtt)}
              />
              <StatCard
                label="FT%"
                value={formatPercent(aggregatedStats.ftm, aggregatedStats.fta)}
              />
              <StatCard
                label="2-Point %"
                value={formatPercent(aggregatedStats.fg2m, aggregatedStats.fg2a)}
              />
              <StatCard
                label="3-Point %"
                value={formatPercent(aggregatedStats.fg3m, aggregatedStats.fg3a)}
              />
            </div>
          </div>
        </div>

        {/* Game History */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Collapsible header - Centered */}
          <div 
            className="flex flex-col items-center mb-4 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => setIsHistoryVisible(!isHistoryVisible)}
          >
            <ExpandableBar isExpanded={isHistoryVisible} />
            <h2 className="text-2xl font-bold text-orange-500 mt-2">
              Game History
            </h2>
            {/* Filter status below title */}
            {(searchTerm || dateFilter || outcomeFilter) && (
              <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Showing {sortedAndFilteredStats.length} of {(stats || []).length} games
                {searchTerm && <span className="block text-xs">• Opponent: {searchTerm}</span>}
                {dateFilter && <span className="block text-xs">• Date: {new Date(dateFilter).toLocaleDateString()}</span>}
                {outcomeFilter && <span className="block text-xs">• Result: {outcomeFilter === 'W' ? 'Wins' : outcomeFilter === 'L' ? 'Losses' : 'Ties'}</span>}
              </div>
            )}
          </div>
          
          {isHistoryVisible && (
            <>
              {/* Control buttons row - Multi-select on left, Filter on right */}
              <div className="flex items-center justify-between mb-4">
                {/* Left side: Multi-select controls - Only show for admins */}
                <div className="flex items-center gap-2">
                  {isUserAdmin && (
                    <>
                      <button
                        onClick={toggleSelectionMode}
                        className={`px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs font-medium transition-colors flex items-center gap-2 sm:gap-1 min-h-[44px] sm:min-h-auto ${
                          isSelectionMode 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title={isSelectionMode ? 'Cancel selection' : 'Select multiple games'}
                      >
                        {isSelectionMode ? <CancelIcon className="h-4 w-4 sm:h-3 sm:w-3" /> : <SelectIcon className="h-4 w-4 sm:h-3 sm:w-3" />}
                        <span className="sm:hidden">{isSelectionMode ? 'Cancel' : 'Select'}</span>
                        <span className="hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
                      </button>
                      
                      {isSelectionMode && (
                        <>
                          <button
                            onClick={selectAllGames}
                            className="px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2 sm:gap-1 min-h-[44px] sm:min-h-auto"
                            title="Select all games on this page"
                          >
                            <SelectAllIcon className="h-4 w-4 sm:h-3 sm:w-3" />
                            <span className="sm:hidden">All</span>
                            <span className="hidden sm:inline">All</span>
                          </button>
                          <button
                            onClick={deselectAllGames}
                            className="px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-2 sm:gap-1 min-h-[44px] sm:min-h-auto"
                            title="Clear selection"
                          >
                            <ClearIcon className="h-4 w-4 sm:h-3 sm:w-3" />
                            <span className="sm:hidden">Clear</span>
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                
                {/* Right side: Filter button and selection actions */}
                <div className="flex items-center gap-2">
                  {/* Selection count and bulk delete - Show when in selection mode */}
                  {isUserAdmin && isSelectionMode && selectedGameIds.length > 0 && (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedGameIds.length} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs bg-red-500 text-white hover:bg-red-600 flex items-center gap-2 sm:gap-1 min-h-[44px] sm:min-h-auto"
                        title="Delete selected games"
                      >
                        <TrashIcon className="h-4 w-4 sm:h-3 sm:w-3" />
                        <span className="sm:hidden">Delete</span>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </>
                  )}
                  
                  {/* Filter Button - Toggle behavior with data attribute */}
                  <div className="relative">
                    <button
                      data-filter-button="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFilterDropdown(!showFilterDropdown);
                      }}
                      className={`px-3 py-2 sm:px-2 sm:py-1 rounded text-sm sm:text-xs font-medium transition-colors flex items-center gap-2 sm:gap-1 min-h-[44px] sm:min-h-auto ${
                        (searchTerm || dateFilter || outcomeFilter)
                          ? 'bg-orange-500 text-white shadow-sm' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title="Filter games"
                    >
                      <FilterIcon className="h-4 w-4 sm:h-3 sm:w-3" />
                      <span className="sm:hidden">Filter</span>
                      <span className="hidden sm:inline">Filter</span>
                    </button>
                    
                    {showFilterDropdown && (
                      <FilterDropdown 
                        games={stats}
                        filters={{
                          searchTerm,
                          dateFilter,
                          outcomeFilter
                        }}
                        onFiltersChange={(newFilters) => {
                          setSearchTerm(newFilters.searchTerm || "");
                          setDateFilter(newFilters.dateFilter || "");
                          setOutcomeFilter(newFilters.outcomeFilter || "");
                          setCurrentPage(1);
                        }}
                        onClose={() => setShowFilterDropdown(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
                {paginatedStats.length > 0 ? (
                  paginatedStats.map((game) => {
                    const expanded = expandedGameIds.includes(game.id);
                    const isSelected = selectedGameIds.includes(game.id);
                    const earnedBadges = getEarnedBadges(game);
                    return (
                      <div
                        key={game.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        {/* Header row with optional checkbox */}
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer"
                          onClick={() => isSelectionMode && isUserAdmin ? toggleGameSelection(game.id) : toggleExpandGame(game.id)}
                        >
                          <div className="flex items-center gap-2">
                            {/* Selection checkbox - only for admins */}
                            {isSelectionMode && isUserAdmin && (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-2 transition-colors ${
                                  isSelected 
                                    ? 'bg-orange-500 border-orange-500' 
                                    : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGameSelection(game.id);
                                }}
                              >
                                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                              </div>
                            )}
                            
                            {(!isSelectionMode || !isUserAdmin) && (
                              <ChevronRightIcon
                                className={`transition-transform duration-200 text-black dark:text-white ${
                                  expanded ? "rotate-90" : ""
                                }`}
                                style={{ minWidth: 20 }}
                              />
                            )}
                            
                            <div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">
                                {formatGameTimestamp(game.timestamp)}
                              </p>
                              <p className="font-bold text-lg text-orange-500">
                                {game.teamName} vs {game.opponent}
                              </p>
                              {game.location && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                  📍 {game.location}
                                </p>
                              )}
                              <p className="italic text-xs mt-1 text-gray-700 dark:text-gray-200">
                                {game.adminName ? `Scored by ${game.adminName}` : ""}
                              </p>
                              <BadgeSummary badges={earnedBadges} />
                              <PhotoThumbnails photos={game.photos} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Outcome badge */}
                            <span
                              className={`px-2 py-1 text-xs font-bold rounded-full ${
                                game.outcome === "W"
                                  ? "bg-green-100 text-green-800"
                                  : game.outcome === "L"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-200 text-gray-800"
                              }`}
                            >
                              {game.outcome || "T"} {showZero(game.myTeamScore)}-{showZero(game.opponentScore)}
                            </span>
                            {/* Trash icon - only show for admins and not in selection mode */}
                            {isUserAdmin && !isSelectionMode && (
                              <button
                                className="p-1 text-red-300 hover:text-red-500 rounded transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(game.id);
                                }}
                                title="Delete Game"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Expanded view - only show when not in selection mode */}
                        {expanded && !isSelectionMode && (
                          <div className="p-4 pt-2 relative">
                            {/* Stat grid using the same card style as Career Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                              <StatCard
                                label="Points"
                                value={showZero(game.points)}
                              />
                              <StatCard
                                label="2-Point Made/Att"
                                value={`${showZero(game.fg2m)}/${showZero(game.fg2a)}`}
                              />
                              <StatCard
                                label="3-Point Made/Att"
                                value={`${showZero(game.fg3m)}/${showZero(game.fg3a)}`}
                              />
                              <StatCard
                                label="FT Made/Att"
                                value={`${showZero(game.ftm)}/${showZero(game.fta)}`}
                              />
                              <StatCard
                                label="Rebounds"
                                value={showZero(game.rebounds)}
                              />
                              <StatCard
                                label="Assists"
                                value={showZero(game.assists)}
                              />
                              <StatCard
                                label="Steals"
                                value={showZero(game.steals)}
                              />
                              <StatCard
                                label="Blocks"
                                value={showZero(game.blocks)}
                              />
                              <StatCard
                                label="Fouls"
                                value={showZero(game.fouls)}
                              />
                              <StatCard
                                label="Turnovers"
                                value={showZero(game.turnovers)}
                              />
                              <StatCard
                                label="A/T Ratio"
                                value={formatRatio(
                                  showZero(game.assists),
                                  showZero(game.turnovers)
                                )}
                              />
                            </div>
                            <BadgeDisplay badges={earnedBadges} />
                            {/* Only show photo upload for admins */}
                            {isUserAdmin && (
                              <PhotoUpload 
                                gameId={game.id} 
                                photos={game.photos || []} 
                                onPhotosUpdate={onUpdateGamePhotos || (() => console.error("onUpdateGamePhotos not provided"))}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    No games found.
                  </div>
                )}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 gap-3">
                  <button
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <span className="text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Bulk Delete confirmation modal - only for admins */}
      {isUserAdmin && showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-sm mx-auto">
            <h3 className="text-lg font-bold mb-4 text-red-500">
              Delete {selectedGameIds.length} Games?
            </h3>
            <p className="mb-6">
              Are you sure you want to delete {selectedGameIds.length} selected game{selectedGameIds.length !== 1 ? 's' : ''}? This cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white font-bold"
                onClick={confirmBulkDelete}
              >
                Delete {selectedGameIds.length} Game{selectedGameIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal - only for admins */}
      {isUserAdmin && deletingGameId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-sm mx-auto">
            <h3 className="text-lg font-bold mb-4 text-red-500">
              Delete Game?
            </h3>
            <p className="mb-6">
              Are you sure you want to delete this game? This cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
                onClick={() => setDeletingGameId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white font-bold"
                onClick={() => {
                  if (deletingGameId) {
                    onDeleteGame(deletingGameId);
                    setDeletingGameId(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Team Modal - only for admins */}
      {isUserAdmin && deletingTeamId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-sm mx-auto">
            <h3 className="text-lg font-bold mb-4 text-red-500">
              Delete Team?
            </h3>
            <p className="mb-6">
              Are you sure you want to delete this team?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="px-4 py-2 rounded bg-red-500 text-white font-bold"
                onClick={confirmDeleteTeam}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}