import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as Network from 'expo-network';
import { NetworkStateType } from 'expo-network';
import { AppState, AppStateStatus, View, StyleSheet } from 'react-native';
import { debug, debugSuccess, debugWarn, debugError } from '@/utils/debug';
import { syncAllData } from '@/services/syncService';
import { auth } from '@/config/firebase';
import { BackOnlineToast } from '@/components/StreakFire';
import { getQueueSize } from '@/services/statsQueueService';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: string | null;
  showBackOnlineToast: boolean;
  setShowBackOnlineToast: (show: boolean) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [networkType, setNetworkType] = useState<string | null>(null);
  const [showBackOnlineToast, setShowBackOnlineToast] = useState<boolean>(false);
  const [queuedItemsCount, setQueuedItemsCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasOfflineRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  const checkNetworkState = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isConnectedValue = networkState.isConnected ?? false;
      const isInternetReachableValue = networkState.isInternetReachable ?? null;
      const type = networkState.type ? String(networkState.type) : null;

      const wasOffline = wasOfflineRef.current;
      const isNowOnline = isConnectedValue && isInternetReachableValue === true;
      
      setIsConnected(isConnectedValue);
      setIsInternetReachable(isInternetReachableValue);
      setNetworkType(type);

      if (isNowOnline) {
        debugSuccess('network', `Network connected: ${type || 'unknown'}`);
        
        // Show back online notification if we just came back online
        if (wasOffline) {
          // Check for queued items
          getQueueSize()
            .then((count) => {
              setQueuedItemsCount(count);
              setShowBackOnlineToast(true);
            })
            .catch(() => {
              setQueuedItemsCount(0);
              setShowBackOnlineToast(true);
            });
        }
        
        // Trigger sync when coming back online and user is authenticated
        const isAuthenticated = !!auth.currentUser;
        if (wasOffline && isAuthenticated && !isSyncingRef.current) {
          debug('network', 'Network restored - triggering data sync...');
          isSyncingRef.current = true;
          
          // Sync in background (don't await to avoid blocking)
          syncAllData()
            .then((result) => {
              if (result.success) {
                debugSuccess('sync', 'Data sync completed successfully');
              } else {
                debugWarn('sync', 'Data sync completed with errors:', result.errors);
              }
            })
            .catch((error) => {
              debugError('sync', 'Data sync failed:', error);
            })
            .finally(() => {
              isSyncingRef.current = false;
            });
        }
        
        wasOfflineRef.current = false;
      } else {
        debugWarn('network', `Network disconnected or unreachable: connected=${isConnectedValue}, reachable=${isInternetReachableValue}, type=${type || 'unknown'}`);
        wasOfflineRef.current = true;
      }
    } catch (error) {
      debugWarn('network', 'Error fetching network state:', error);
      // Default to offline if we can't determine
      setIsConnected(false);
      setIsInternetReachable(false);
      setNetworkType(null);
    }
  };

  useEffect(() => {
    debug('network', 'Setting up network state monitoring...');

    // Check initial network state
    checkNetworkState();

    // Set up polling to check network state every 3 seconds
    intervalRef.current = setInterval(() => {
      checkNetworkState();
    }, 3000);

    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        debug('network', 'App came to foreground, checking network state...');
        
        // Check network state and sync if online
        try {
          const networkState = await Network.getNetworkStateAsync();
          const isOnline = networkState.isConnected && networkState.isInternetReachable === true;
          const isAuthenticated = !!auth.currentUser;
          
          if (isOnline && isAuthenticated && !isSyncingRef.current) {
            debug('network', 'App came to foreground - triggering data sync...');
            isSyncingRef.current = true;
            
            // Sync in background (don't await to avoid blocking)
            syncAllData()
              .then((result) => {
                if (result.success) {
                  debugSuccess('sync', 'Data sync completed successfully on foreground');
                } else {
                  debugWarn('sync', 'Data sync completed with errors:', result.errors);
                }
              })
              .catch((error) => {
                debugError('sync', 'Data sync failed on foreground:', error);
              })
              .finally(() => {
                isSyncingRef.current = false;
              });
          }
        } catch (error) {
          debugWarn('network', 'Error checking network state on foreground:', error);
        }
        
        // Also update the network state
        checkNetworkState();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
      debug('network', 'Network monitoring cleaned up');
    };
  }, []);

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
    networkType,
    showBackOnlineToast,
    setShowBackOnlineToast,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
      {showBackOnlineToast && (
        <BackOnlineToast
          queuedItems={queuedItemsCount}
          onComplete={() => setShowBackOnlineToast(false)}
        />
      )}
    </NetworkContext.Provider>
  );
};

