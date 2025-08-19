import React, { useMemo, useState, useEffect } from "react";
import StatGraphModal from "./StatGraphModal";
import { PlusIcon, TrashIcon, ChevronRightIcon } from "./icons";
import { getEarnedBadges, BadgeSummary, BadgeDisplay } from "./achievement_system";
import { PhotoUpload, PhotoThumbnails } from "./photo_system";

// Subtle checkmark icon
const CheckIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Expandable bar icon (same as LiveGameAdmin)
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

// Group games by *age* (year as of Sahil's birthday, 11/01/2016)
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
    if (age < 8) return; // Only show 8+ per user request
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
  stats = [],
  onDeleteGame,
  onUpdateGamePhotos, 
  externalFilters = {}, // NEW: Filters from header
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [graphData, setGraphData] = useState(null);
  
  // NEW: Use external filters if provided, otherwise use local state
  const [searchTerm, setSearchTerm] = useState(externalFilters.searchTerm || "");
  const [dateFilter, setDateFilter] = useState(externalFilters.dateFilter || "");
  const [outcomeFilter, setOutcomeFilter] = useState(externalFilters.outcomeFilter || ""); 
  
  const [expandedGameIds, setExpandedGameIds] = useState([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingGameId, setDeletingGameId] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const [showOpponentSuggestions, setShowOpponentSuggestions] = useState(false);
  
  // NEW: Multi-select state
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const GAMES_PER_PAGE = 4;

  // NEW: Update local filters when external filters change
  useEffect(() => {
    setSearchTerm(externalFilters.searchTerm || "");
    setDateFilter(externalFilters.dateFilter || "");
    setOutcomeFilter(externalFilters.outcomeFilter || "");
    setCurrentPage(1); // Reset to first page when filters change
  }, [externalFilters]);

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
      .slice(0, 7); // Limit to top 7
  }, [allOpponents, searchTerm]);

  // Aggregate stats (guard for stats being undefined)
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
      sortableItems = sortableItems.filter((game) =>
        (game.opponent || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
    if (dateFilter) {
      sortableItems = sortableItems.filter((game) => game.date === dateFilter);
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

  // Multi-select handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedGameIds([]);
  };

  const toggleGameSelection = (gameId) => {
    setSelectedGameIds(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const selectAllGames = () => {
    const currentPageGameIds = paginatedStats.map(game => game.id);
    setSelectedGameIds(currentPageGameIds);
  };

  const deselectAllGames = () => {
    setSelectedGameIds([]);
  };

  const handleBulkDelete = () => {
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

  // Deleting logic
  const handleDeleteClick = (gameId) => setDeletingGameId(gameId);
  const confirmDeleteGame = () => {
    if (deletingGameId) {
      onDeleteGame(deletingGameId);
      setDeletingGameId(null);
    }
  };
  const handleDeleteTeamClick = (teamId) => setDeletingTeamId(teamId);
  const confirmDeleteTeam = () => {
    if (deletingTeamId) {
      onDeleteTeam(deletingTeamId);
      setDeletingTeamId(null);
    }
  };
  const toggleExpandGame = (gameId) => {
    if (isSelectionMode) return; // Don't expand in selection mode
    setExpandedGameIds((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    );
  };

  // Add new team
  const handleTeamSubmit = (e) => {
    e.preventDefault();
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName("");
    }
  };

  // Helper to show zero for blank/undefined stat
  const showZero = (val) => (val === undefined || val === null || val === "" ? 0 : val);

  // --- Opponent Suggestion handlers ---
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
    <>
      {graphData && (
        <StatGraphModal graphData={graphData} onClose={() => setGraphData(null)} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career stats & teams */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-orange-500">
              Career Totals
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Games Played stat card (clickable!) */}
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
          <div
            className="flex flex-col items-center mb-4 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => setIsHistoryVisible(!isHistoryVisible)}
          >
            <ExpandableBar isExpanded={isHistoryVisible} />
            <h2 className="text-2xl font-bold text-orange-500 mt-2">
              Game History
            </h2>
          </div>
          {isHistoryVisible && (
            <>
              {/* Show filter status when filters come from header */}
              {(externalFilters.searchTerm || externalFilters.dateFilter || externalFilters.outcomeFilter) && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Active Filters:
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">
                    {externalFilters.searchTerm && <span className="block">• Opponent: {externalFilters.searchTerm}</span>}
                    {externalFilters.dateFilter && <span className="block">• Date: {new Date(externalFilters.dateFilter).toLocaleDateString()}</span>}
                    {externalFilters.outcomeFilter && <span className="block">• Result: {externalFilters.outcomeFilter === 'W' ? 'Wins' : externalFilters.outcomeFilter === 'L' ? 'Losses' : 'Ties'}</span>}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Use the filter button in the header to modify filters
                  </div>
                </div>
              )}

              {/* Multi-select controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectionMode}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      isSelectionMode 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isSelectionMode ? 'Cancel' : 'Select'}
                  </button>
                  
                  {isSelectionMode && (
                    <>
                      <button
                        onClick={selectAllGames}
                        className="px-2 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAllGames}
                        className="px-2 py-1 rounded text-xs bg-gray-500 text-white hover:bg-gray-600"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                
                {isSelectionMode && selectedGameIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedGameIds.length} selected
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                    >
                      <TrashIcon />
                      Delete Selected
                    </button>
                  </div>
                )}
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
                          onClick={() => isSelectionMode ? toggleGameSelection(game.id) : toggleExpandGame(game.id)}
                        >
                          <div className="flex items-center gap-2">
                            {/* Selection checkbox - subtle design */}
                            {isSelectionMode && (
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
                            
                            {!isSelectionMode && (
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
                            {/* Trash icon - hidden in selection mode */}
                            {!isSelectionMode && (
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
                            <PhotoUpload 
                              gameId={game.id} 
                              photos={game.photos || []} 
                              onPhotosUpdate={onUpdateGamePhotos || (() => console.error("onUpdateGamePhotos not provided"))}
                            />
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
      
      {/* Bulk Delete confirmation modal */}
      {showBulkDeleteConfirm && (
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

      {/* Delete confirmation modal */}
      {deletingGameId && (
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
      {/* Delete Team Modal */}
      {deletingTeamId && (
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
    </>
  );
}