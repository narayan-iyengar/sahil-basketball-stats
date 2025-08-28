// src/services/syncService.js
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { OfflineStorage } from "../utils/offlineUtils";

export class SyncService {
  static syncInProgress = false;
  static syncCallbacks = [];

  // Add callback for sync progress updates
  static addSyncCallback(callback) {
    this.syncCallbacks.push(callback);
  }

  // Remove sync callback
  static removeSyncCallback(callback) {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  // Notify all callbacks about sync progress
  static notifyCallbacks(status, progress = null, error = null) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback({ status, progress, error });
      } catch (e) {
        console.error("Sync callback error:", e);
      }
    });
  }

  // Main sync function
  static async syncAllOfflineData(user) {
    if (this.syncInProgress) {
      console.log("Sync already in progress");
      return { success: false, message: "Sync already in progress" };
    }

    if (!user) {
      console.log("No user provided for sync");
      return { success: false, message: "No user provided" };
    }

    this.syncInProgress = true;
    this.notifyCallbacks('started');

    const results = {
      games: { synced: 0, failed: 0 },
      updates: { synced: 0, failed: 0 },
      liveUpdates: { synced: 0, failed: 0 }
    };

    try {
      // Sync pending games
      await this.syncPendingGames(results);
      
      // Sync pending updates
      await this.syncPendingUpdates(results);
      
      // Sync pending live updates
      await this.syncPendingLiveUpdates(results);

      const totalSynced = results.games.synced + results.updates.synced + results.liveUpdates.synced;
      const totalFailed = results.games.failed + results.updates.failed + results.liveUpdates.failed;

      this.notifyCallbacks('completed', results);

      return {
        success: totalFailed === 0,
        results,
        message: `Synced ${totalSynced} items${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`
      };

    } catch (error) {
      console.error("Sync failed:", error);
      this.notifyCallbacks('error', null, error);
      return {
        success: false,
        message: "Sync failed: " + error.message,
        error
      };
    } finally {
      this.syncInProgress = false;
    }
  }




static async syncPendingTeams(results) {
  const pendingTeams = OfflineStorage.getPendingTeams();
  
  for (let i = 0; i < pendingTeams.length; i++) {
    const team = pendingTeams[i];
    
    try {
      this.notifyCallbacks('syncing', {
        type: 'teams',
        current: i + 1,
        total: pendingTeams.length,
        item: team.name
      });

      const { tempId, offlineCreatedAt, ...teamData } = team;
      
      // Add the team to Firebase
      const docRef = await addDoc(collection(db, "teams"), teamData);
      
      // Remove from pending list
      OfflineStorage.removePendingTeam(tempId);
      
      results.teams = results.teams || { synced: 0, failed: 0 };
      results.teams.synced++;
      
      console.log(`Synced team: ${team.name} (${tempId} -> ${docRef.id})`);

    } catch (error) {
      console.error(`Failed to sync team ${team.tempId}:`, error);
      results.teams = results.teams || { synced: 0, failed: 0 };
      results.teams.failed++;
    }
  }
}
  // Sync pending new games
  static async syncPendingGames(results) {
    const pendingGames = OfflineStorage.getPendingGames();
    
    for (let i = 0; i < pendingGames.length; i++) {
      const game = pendingGames[i];
      
      try {
        this.notifyCallbacks('syncing', {
          type: 'games',
          current: i + 1,
          total: pendingGames.length,
          item: `${game.teamName} vs ${game.opponent}`
        });

        const { tempId, offlineCreatedAt, ...gameData } = game;
        
        // Add the game to Firebase
        const docRef = await addDoc(collection(db, "games"), gameData);
        
        // Remove from pending list
        OfflineStorage.removePendingGame(tempId);
        
        results.games.synced++;
        
        console.log(`Synced game: ${game.teamName} vs ${game.opponent} (${tempId} -> ${docRef.id})`);

      } catch (error) {
        console.error(`Failed to sync game ${game.tempId}:`, error);
        results.games.failed++;
        
        // Don't remove from pending list if sync failed
        // Maybe add retry count or timestamp for exponential backoff
      }
    }
  }

  // Sync pending game updates
  static async syncPendingUpdates(results) {
    const pendingUpdates = OfflineStorage.getPendingUpdates();
    const updateIds = Object.keys(pendingUpdates);
    
    for (let i = 0; i < updateIds.length; i++) {
      const gameId = updateIds[i];
      const updates = pendingUpdates[gameId];
      
      try {
        this.notifyCallbacks('syncing', {
          type: 'updates',
          current: i + 1,
          total: updateIds.length,
          item: `Game ${gameId}`
        });

        const { timestamp, offlineModifiedAt, ...updateData } = updates;
        
        // Update the game in Firebase
        await updateDoc(doc(db, "games", gameId), updateData);
        
        // Remove from pending list
        OfflineStorage.clearPendingUpdate(gameId);
        
        results.updates.synced++;
        
        console.log(`Synced update for game: ${gameId}`);

      } catch (error) {
        console.error(`Failed to sync update for game ${gameId}:`, error);
        results.updates.failed++;
      }
    }
  }

  // Sync pending live game updates
  static async syncPendingLiveUpdates(results) {
    const pendingLiveUpdates = OfflineStorage.getPendingLiveUpdates();
    const liveGameIds = Object.keys(pendingLiveUpdates);
    
    for (let i = 0; i < liveGameIds.length; i++) {
      const liveGameId = liveGameIds[i];
      const updates = pendingLiveUpdates[liveGameId];
      
      try {
        this.notifyCallbacks('syncing', {
          type: 'liveUpdates',
          current: i + 1,
          total: liveGameIds.length,
          item: `Live Game ${liveGameId}`
        });

        // Apply updates in chronological order
        const sortedUpdates = updates.sort((a, b) => a.timestamp - b.timestamp);
        
        for (const update of sortedUpdates) {
          const { timestamp, offlineModifiedAt, ...updateData } = update;
          await updateDoc(doc(db, "liveGames", liveGameId), updateData);
        }
        
        // Remove from pending list
        OfflineStorage.clearPendingLiveUpdates(liveGameId);
        
        results.liveUpdates.synced++;
        
        console.log(`Synced ${updates.length} live updates for game: ${liveGameId}`);

      } catch (error) {
        console.error(`Failed to sync live updates for game ${liveGameId}:`, error);
        results.liveUpdates.failed++;
      }
    }
  }

  // Force sync now (manual trigger)
  static async forceSyncNow(user) {
    console.log("Force sync triggered");
    return await this.syncAllOfflineData(user);
  }

  // Get sync status
  static isSyncing() {
    return this.syncInProgress;
  }

  // Get pending count
  static getPendingCount() {
    return OfflineStorage.getPendingCount();
  }
}
