// src/hooks/useNetworkStatus.js
import { useState, useEffect, useCallback } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  // Additional connectivity test using Firebase or a ping
  const [isConnected, setIsConnected] = useState(true);
  const [lastConnectivityCheck, setLastConnectivityCheck] = useState(Date.now());

  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsConnected(false);
      return false;
    }

    try {
      // Try to reach a reliable endpoint
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      setIsConnected(true);
      setLastConnectivityCheck(Date.now());
      return true;
    } catch (error) {
      setIsConnected(false);
      setLastConnectivityCheck(Date.now());
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(false);
      // Double-check with actual connectivity test
      checkConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnected(false);
      setWasOffline(true);
    };

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check when online
    const connectivityInterval = setInterval(() => {
      if (navigator.onLine && Date.now() - lastConnectivityCheck > 30000) { // Check every 30 seconds
        checkConnectivity();
      }
    }, 30000);

    // Initial connectivity check
    if (navigator.onLine) {
      checkConnectivity();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [checkConnectivity, lastConnectivityCheck]);

  // Return comprehensive network status
  return {
    isOnline: isOnline && isConnected,
    isConnected,
    wasOffline,
    browserOnline: navigator.onLine,
    checkConnectivity
  };
};