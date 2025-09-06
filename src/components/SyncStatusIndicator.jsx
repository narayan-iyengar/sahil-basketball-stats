// src/components/SyncStatusIndicator.jsx
import React, { useState, useEffect } from 'react';
import { SyncService } from '../services/syncService';
import { OfflineStorage } from '../utils/offlineUtils';

// Icons for sync status
const SyncIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const WifiOffIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 8.5a5 5 0 017 0M5 12.5a9 9 0 0114 0M12 21l0-8.5m-7-2.5a13 13 0 0114 0" />
  </svg>
);

const CheckIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ExclamationIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function SyncStatusIndicator({ 
  isOnline, 
  user, 
  size = "sm",
  showText = true,
  onClick = null 
}) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(null);

  const sizes = {
    xs: { icon: "w-3 h-3", text: "text-xs", padding: "px-1 py-0.5" },
    sm: { icon: "w-4 h-4", text: "text-xs", padding: "px-2 py-1" },
    md: { icon: "w-5 h-5", text: "text-sm", padding: "px-3 py-1.5" },
    lg: { icon: "w-6 h-6", text: "text-base", padding: "px-4 py-2" }
  };

  const sizeClasses = sizes[size] || sizes.sm;

  // Update pending count
  useEffect(() => {
    const updateCount = () => {
      setPendingCount(OfflineStorage.getPendingCount());
    };
    
    updateCount();
    
    // Check periodically for updates
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set up sync callbacks
  useEffect(() => {
    const syncCallback = ({ status, progress, error }) => {
      setSyncStatus(status);
      setSyncProgress(progress);
      
      if (status === 'completed' || status === 'error') {
        setTimeout(() => {
          setSyncStatus(null);
          setSyncProgress(null);
        }, 3000);
      }
    };

    SyncService.addSyncCallback(syncCallback);
    
    return () => {
      SyncService.removeSyncCallback(syncCallback);
    };
  }, []);

  // Handle manual sync
  const handleSync = async () => {
    if (!user || SyncService.isSyncing() || pendingCount === 0) return;
    
    try {
      const result = await SyncService.forceSyncNow(user);
      console.log("Manual sync result:", result);
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  // Render different states
  if (syncStatus === 'started' || syncStatus === 'syncing') {
    return (
      <div className={`flex items-center gap-1 text-blue-500 ${sizeClasses.padding} rounded-md bg-blue-50 dark:bg-blue-900/20`}>
        <SyncIcon className={`${sizeClasses.icon} animate-spin`} />
        {showText && (
          <span className={sizeClasses.text}>
            {syncProgress ? `Syncing ${syncProgress.item}...` : 'Syncing...'}
          </span>
        )}
      </div>
    );
  }

  if (syncStatus === 'completed') {
    return (
      <div className={`flex items-center gap-1 text-green-500 ${sizeClasses.padding} rounded-md bg-green-50 dark:bg-green-900/20`}>
        <CheckIcon className={sizeClasses.icon} />
        {showText && <span className={sizeClasses.text}>Synced!</span>}
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className={`flex items-center gap-1 text-red-500 ${sizeClasses.padding} rounded-md bg-red-50 dark:bg-red-900/20`}>
        <ExclamationIcon className={sizeClasses.icon} />
        {showText && <span className={sizeClasses.text}>Sync failed</span>}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`flex items-center gap-1 text-orange-500 ${sizeClasses.padding} rounded-md bg-orange-50 dark:bg-orange-900/20`}>
        <WifiOffIcon className={sizeClasses.icon} />
        {showText && (
          <span className={sizeClasses.text}>
            Offline{pendingCount > 0 && ` (${pendingCount})`}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    const Component = onClick ? 'button' : 'div';
    return (
      <Component 
        className={`flex items-center gap-1 text-amber-600 dark:text-amber-400 ${sizeClasses.padding} rounded-md bg-amber-50 dark:bg-amber-900/20 ${onClick ? 'hover:bg-amber-100 dark:hover:bg-amber-800/30 cursor-pointer transition-colors' : ''}`}
        onClick={onClick || handleSync}
        title={onClick ? undefined : "Click to sync now"}
      >
        <SyncIcon className={sizeClasses.icon} />
        {showText && (
          <span className={sizeClasses.text}>
            {pendingCount} pending
          </span>
        )}
      </Component>
    );
  }

  // Online with no pending items - show minimal indicator or nothing
  if (size === 'xs' || !showText) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 text-green-500 ${sizeClasses.padding}`}>
      <CheckIcon className={sizeClasses.icon} />
      {showText && <span className={sizeClasses.text}>Online</span>}
    </div>
  );
}

// Simplified version for header/toolbar use
export function SyncStatusBadge({ isOnline, user }) {
  return (
    <SyncStatusIndicator 
      isOnline={isOnline} 
      user={user} 
      size="xs" 
      showText={false}
    />
  );
}
