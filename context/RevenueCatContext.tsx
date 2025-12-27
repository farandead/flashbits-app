import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Purchases from 'react-native-purchases';
import {
  initializeRevenueCat,
  setRevenueCatUserId,
  logOutRevenueCat,
  getCustomerInfo,
  hasActiveEntitlement,
  getOfferings,
  purchaseSubscription,
  restorePurchases,
  getSubscriptionStatus,
  syncWithFirebaseAuth,
  syncSubscriptionToFirestore,
  ENTITLEMENT_ID,
  SubscriptionStatus,
  SubscriptionPlan,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from '@/services/revenueCatService';
import { useAuth } from './AuthContext';

// Use console for RevenueCat logging
const log = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(`[RevenueCat Context] ${message}`, ...args);
  }
};

const logSuccess = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(`✅ [RevenueCat Context] ${message}`, ...args);
  }
};

const logError = (message: string, ...args: any[]) => {
  console.error(`❌ [RevenueCat Context] ${message}`, ...args);
};

interface RevenueCatContextType {
  // State
  isInitialized: boolean;
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  subscriptionStatus: SubscriptionStatus | null;
  
  // Actions
  refreshCustomerInfo: () => Promise<void>;
  checkEntitlement: () => Promise<boolean>;
  purchasePlan: (plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  refreshOfferings: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
};

interface RevenueCatProviderProps {
  children: ReactNode;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const init = async () => {
      try {
        log('Initializing RevenueCat context...');
        const initialized = await initializeRevenueCat();
        setIsInitialized(initialized);
        
        if (initialized) {
          try {
            await refreshOfferings();
            await refreshCustomerInfo();
            
            // Set up listener for automatic updates when purchases change
            // This ensures UI updates immediately when RevenueCat detects purchase changes
            Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
              log('Customer info updated via listener - refreshing state');
              setCustomerInfo(customerInfo);
              
              const entitled = await hasActiveEntitlement();
              setIsPro(entitled);
              
              const status = await getSubscriptionStatus();
              setSubscriptionStatus(status);
              
              log(`Pro status updated via listener: ${entitled}`);
            });
          } catch (error) {
            logError('Failed to refresh RevenueCat data:', error);
            // Don't crash - app can still work without RevenueCat data
          }
        }
      } catch (error) {
        logError('Failed to initialize RevenueCat context:', error);
        // Set initialized to false and loading to false so app can continue
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Sync with Firebase Auth when user changes
  useEffect(() => {
    const syncAuth = async () => {
      if (!isInitialized) return;

      if (isAuthenticated && user) {
        try {
          await syncWithFirebaseAuth();
          await refreshCustomerInfo();
        } catch (error) {
          logError('Failed to sync with Firebase Auth:', error);
        }
      } else {
        // User logged out, log out from RevenueCat
        try {
          await logOutRevenueCat();
          setIsPro(false);
          setCustomerInfo(null);
          setSubscriptionStatus(null);
        } catch (error) {
          logError('Failed to log out from RevenueCat:', error);
        }
      }
    };

    syncAuth();
  }, [isAuthenticated, user, isInitialized]);

  // Refresh customer info
  const refreshCustomerInfo = async () => {
    try {
      setIsLoading(true);
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      
      if (info) {
        const entitled = await hasActiveEntitlement();
        setIsPro(entitled);
        
        const status = await getSubscriptionStatus();
        setSubscriptionStatus(status);
        
        log(`Pro status: ${entitled}`);
        
        // Sync to Firestore whenever customer info is refreshed
        await syncSubscriptionToFirestore();
      } else {
        setIsPro(false);
        setSubscriptionStatus(null);
      }
    } catch (error) {
      logError('Failed to refresh customer info:', error);
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check entitlement
  const checkEntitlement = async (): Promise<boolean> => {
    try {
      const entitled = await hasActiveEntitlement();
      setIsPro(entitled);
      return entitled;
    } catch (error) {
        logError('Failed to check entitlement:', error);
      return false;
    }
  };

  // Refresh offerings
  const refreshOfferings = async () => {
    try {
      const offering = await getOfferings();
      setCurrentOffering(offering);
    } catch (error) {
        logError('Failed to refresh offerings:', error);
    }
  };

  // Purchase a plan
  const purchasePlan = async (
    plan: SubscriptionPlan
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const result = await purchaseSubscription(plan);
      
      if (result.success && result.customerInfo) {
        // Use the customerInfo directly from purchase result (most up-to-date)
        const customerInfo = result.customerInfo;
        
        // Immediately update state with new customer info
        setCustomerInfo(customerInfo);
        
        // Check entitlement directly from the purchase result (don't fetch again)
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const entitled = entitlement !== undefined;
        
        log(`Purchase completed - Checking entitlement directly from purchase result`);
        log(`Looking for entitlement: "${ENTITLEMENT_ID}"`);
        log(`All active entitlements: ${JSON.stringify(Object.keys(customerInfo.entitlements.active))}`);
        log(`All entitlements (active + all): ${JSON.stringify(Object.keys(customerInfo.entitlements.all))}`);
        log(`Active subscriptions: ${JSON.stringify(customerInfo.activeSubscriptions)}`);
        log(`Entitlement found: ${entitled}`);
        
        if (entitlement) {
          log(`Entitlement details: ${JSON.stringify({
            identifier: entitlement.identifier,
            productIdentifier: entitlement.productIdentifier,
            expirationDate: entitlement.expirationDate,
            willRenew: entitlement.willRenew
          })}`);
        } else {
          logError(`❌ Entitlement "${ENTITLEMENT_ID}" NOT FOUND in active entitlements!`);
          logError(`This means the product is not linked to the entitlement in RevenueCat dashboard.`);
          logError(`Please check RevenueCat Dashboard → Entitlements → "${ENTITLEMENT_ID}" → Attach product "${customerInfo.activeSubscriptions[0] || 'N/A'}"`);
        }
        
        // Update pro status immediately
        setIsPro(entitled);
        log(`Pro status set to: ${entitled}`);
        
        // Get subscription status from the customer info
        if (entitlement) {
          setSubscriptionStatus({
            isActive: true,
            expirationDate: entitlement.expirationDate || null,
            productIdentifier: entitlement.productIdentifier || null,
            willRenew: entitlement.willRenew || false,
            periodType: entitlement.periodType || null,
          });
        } else {
          setSubscriptionStatus({
            isActive: false,
            expirationDate: null,
            productIdentifier: null,
            willRenew: false,
            periodType: null,
          });
        }
        
        // Sync to Firestore immediately
        await syncSubscriptionToFirestore();
        
        // Force a refresh to ensure everything is in sync (but state is already updated)
        await refreshCustomerInfo();
        
        logSuccess('Purchase successful - Pro status updated immediately');
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
        logError('Purchase error:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restore = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const result = await restorePurchases();
      
      if (result.success && result.customerInfo) {
        // Use the customerInfo directly from restore result (most up-to-date)
        const restoredCustomerInfo = result.customerInfo;
        
        // Immediately update state with new customer info
        setCustomerInfo(restoredCustomerInfo);
        
        // Check entitlement directly from the restore result (don't fetch again)
        const entitlement = restoredCustomerInfo.entitlements.active[ENTITLEMENT_ID];
        const entitled = entitlement !== undefined;
        
        log(`Restore completed - Checking entitlement directly from restore result`);
        log(`Entitlement found: ${entitled}`);
        
        // Update pro status immediately
        setIsPro(entitled);
        
        // Get subscription status from the customer info
        if (entitlement) {
          setSubscriptionStatus({
            isActive: true,
            expirationDate: entitlement.expirationDate || null,
            productIdentifier: entitlement.productIdentifier || null,
            willRenew: entitlement.willRenew || false,
            periodType: entitlement.periodType || null,
          });
        } else {
          setSubscriptionStatus({
            isActive: false,
            expirationDate: null,
            productIdentifier: null,
            willRenew: false,
            periodType: null,
          });
        }
        
        // Sync to Firestore
        await syncSubscriptionToFirestore();
        
        logSuccess('Purchases restored successfully - Pro status updated immediately');
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
        logError('Restore error:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value: RevenueCatContextType = {
    isInitialized,
    isPro,
    isLoading,
    customerInfo,
    currentOffering,
    subscriptionStatus,
    refreshCustomerInfo,
    checkEntitlement,
    purchasePlan,
    restore,
    refreshOfferings,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};

