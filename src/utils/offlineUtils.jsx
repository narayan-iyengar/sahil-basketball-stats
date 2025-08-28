// src/utils/offlineUtils.js
export class OfflineStorage {
  static KEYS = {
    PENDING_GAMES: 'sahil_stats_pending_games',
    PENDING_UPDATES: 'sahil_stats_pending_updates',
    PENDING_LIVE_UPDATES: 'sahil_stats_pending_live_updates',
    CACHED_DATA: 'sahil_stats_cached_data',
    SYNC_STATUS: 'sahil_stats_sync_status'
  };

  // Save a new game that couldn't be synced online
  static savePendingGame(gameData) {
    const pending = this.getPendingGames();
    const gameWithId = { 
      ...gameData, 
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      offlineCreatedAt: new Date().toISOString()
    };
    pending.push(gameWithId);
    localStorage.setItem(this.KEYS.PENDING_GAMES, JSON.stringify(pending));
    return gameWithId.tempId;
  }

  // Get all pending games
  static getPendingGames() {
    const stored = localStorage.getItem(this.KEYS.PENDING_GAMES);
    return stored ? JSON.parse(stored) : [];
  }

  // Remove a pending game after successful sync
  static removePendingGame(tempId) {
    const pending = this.getPendingGames();
    const filtered = pending.filter(game => game.tempId !== tempId);
    localStorage.setItem(this.KEYS.PENDING_GAMES, JSON.stringify(filtered));
  }

  // Save an update to an existing game
  static savePendingUpdate(gameId, updates) {
    const pending = this.getPendingUpdates();
    pending[gameId] = { 
      ...pending[gameId], 
      ...updates, 
      timestamp: Date.now(),
      offlineModifiedAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.PENDING_UPDATES, JSON.stringify(pending));
  }

  // Get all pending updates
  static getPendingUpdates() {
    const stored = localStorage.getItem(this.KEYS.PENDING_UPDATES);
    return stored ? JSON.parse(stored) : {};
  }

  // Clear a pending update after successful sync
  static clearPendingUpdate(gameId) {
    const pending = this.getPendingUpdates();
    delete pending[gameId];
    localStorage.setItem(this.KEYS.PENDING_UPDATES, JSON.stringify(pending));
  }

  // Save live game updates (for ongoing games)
  static savePendingLiveUpdate(liveGameId, updates) {
    const pending = this.getPendingLiveUpdates();
    if (!pending[liveGameId]) {
      pending[liveGameId] = [];
    }
    pending[liveGameId].push({
      ...updates,
      timestamp: Date.now(),
      offlineModifiedAt: new Date().toISOString()
    });
    localStorage.setItem(this.KEYS.PENDING_LIVE_UPDATES, JSON.stringify(pending));
  }

  // Get pending live game updates
  static getPendingLiveUpdates() {
    const stored = localStorage.getItem(this.KEYS.PENDING_LIVE_UPDATES);
    return stored ? JSON.parse(stored) : {};
  }

  // Clear live game updates after sync
  static clearPendingLiveUpdates(liveGameId) {
    const pending = this.getPendingLiveUpdates();
    delete pending[liveGameId];
    localStorage.setItem(this.KEYS.PENDING_LIVE_UPDATES, JSON.stringify(pending));
  }

  // Get total count of pending items
  static getPendingCount() {
    const pendingGames = this.getPendingGames().length;
    const pendingUpdates = Object.keys(this.getPendingUpdates()).length;
    const pendingLiveUpdates = Object.keys(this.getPendingLiveUpdates()).length;
    return pendingGames + pendingUpdates + pendingLiveUpdates;
  }

  // Cache data for offline viewing
  static cacheData(key, data) {
    const cache = this.getCachedData();
    cache[key] = {
      data,
      cachedAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.CACHED_DATA, JSON.stringify(cache));
  }

  // Get cached data
  static getCachedData(key = null) {
    const stored = localStorage.getItem(this.KEYS.CACHED_DATA);
    const cache = stored ? JSON.parse(stored) : {};
    return key ? cache[key]?.data : cache;
  }

  // Clear all cached data
  static clearCache() {
    localStorage.removeItem(this.KEYS.CACHED_DATA);
  }

  // Get sync status
  static getSyncStatus() {
    return localStorage.getItem(this.KEYS.SYNC_STATUS) || 'online';
  }

  // Set sync status
  static setSyncStatus(status) {
    localStorage.setItem(this.KEYS.SYNC_STATUS, status);
  }

  // Clear all offline data (useful for debugging or reset)
  static clearAllOfflineData() {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Get summary of offline data for debugging
  static getOfflineSummary() {
    return {
      pendingGames: this.getPendingGames().length,
      pendingUpdates: Object.keys(this.getPendingUpdates()).length,
      pendingLiveUpdates: Object.keys(this.getPendingLiveUpdates()).length,
      totalPending: this.getPendingCount(),
      cacheKeys: Object.keys(this.getCachedData()),
      syncStatus: this.getSyncStatus()
    };
  }

static savePendingTeam(teamData) {
  const pending = this.getPendingTeams();
  const teamWithId = { 
    ...teamData, 
    tempId: `temp_team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    offlineCreatedAt: new Date().toISOString()
  };
  pending.push(teamWithId);
  localStorage.setItem('sahil_stats_pending_teams', JSON.stringify(pending));
  return teamWithId.tempId;
}

static getPendingTeams() {
  const stored = localStorage.getItem('sahil_stats_pending_teams');
  return stored ? JSON.parse(stored) : [];
}

static removePendingTeam(tempId) {
  const pending = this.getPendingTeams();
  const filtered = pending.filter(team => team.tempId !== tempId);
  localStorage.setItem('sahil_stats_pending_teams', JSON.stringify(filtered));
}
}
