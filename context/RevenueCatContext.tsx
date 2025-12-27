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
import { debug, debugError, debugSuccess } from '@/utils/debug';

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
    let customerInfoListener: (() => void) | null = null;
    let isMounted = true;
    
    const init = async () => {
      try {
        debug('revenueCat', 'Initializing RevenueCat context...');
        const initialized = await initializeRevenueCat();
        if (!isMounted) return;
        
        setIsInitialized(initialized);
        
        if (initialized) {
          try {
            await refreshOfferings();
            await refreshCustomerInfo();
            
            if (!isMounted) return;
            
            // Set up listener for automatic updates when purchases change
            // This ensures UI updates immediately when RevenueCat detects purchase changes
            // Note: addCustomerInfoUpdateListener returns an unsubscribe function
            const unsubscribe = Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
              if (!isMounted) return;
              
              debug('revenueCat', 'Customer info updated via listener - refreshing state');
              setCustomerInfo(customerInfo);
              
              const entitled = await hasActiveEntitlement();
              setIsPro(entitled);
              
              const status = await getSubscriptionStatus();
              setSubscriptionStatus(status);
              
              debug('revenueCat', `Pro status updated via listener: ${entitled}`);
            }) as (() => void) | undefined;
            
            // Store the unsubscribe function (if it exists)
            if (unsubscribe) {
              customerInfoListener = unsubscribe;
            }
          } catch (error) {
            debugError('revenueCat', 'Failed to refresh RevenueCat data:', error);
            // Don't crash - app can still work without RevenueCat data
          }
        }
      } catch (error) {
        debugError('revenueCat', 'Failed to initialize RevenueCat context:', error);
        // Set initialized to false and loading to false so app can continue
        if (isMounted) {
          setIsInitialized(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();
    
    // Cleanup: Remove customer info listener on unmount
    return () => {
      isMounted = false;
      if (customerInfoListener) {
        customerInfoListener();
        debug('revenueCat', 'Customer info listener cleaned up');
      }
    };
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
          debugError('revenueCat', 'Failed to sync with Firebase Auth:', error);
        }
      } else {
        // User logged out, log out from RevenueCat
        try {
          await logOutRevenueCat();
          setIsPro(false);
          setCustomerInfo(null);
          setSubscriptionStatus(null);
        } catch (error) {
          debugError('revenueCat', 'Failed to log out from RevenueCat:', error);
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
        
        debug('revenueCat', `Pro status: ${entitled}`);
        
        // Sync to Firestore whenever customer info is refreshed
        await syncSubscriptionToFirestore();
      } else {
        setIsPro(false);
        setSubscriptionStatus(null);
      }
    } catch (error) {
      debugError('revenueCat', 'Failed to refresh customer info:', error);
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
      debugError('revenueCat', 'Failed to check entitlement:', error);
      return false;
    }
  };

  // Refresh offerings
  const refreshOfferings = async () => {
    try {
      const offering = await getOfferings();
      setCurrentOffering(offering);
    } catch (error) {
        debugError('revenueCat', 'Failed to refresh offerings:', error);
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
        
        debug('revenueCat', `Purchase completed - Checking entitlement directly from purchase result`);
        debug('revenueCat', `Looking for entitlement: "${ENTITLEMENT_ID}"`);
        debug('revenueCat', `All active entitlements: ${JSON.stringify(Object.keys(customerInfo.entitlements.active))}`);
        debug('revenueCat', `All entitlements (active + all): ${JSON.stringify(Object.keys(customerInfo.entitlements.all))}`);
        debug('revenueCat', `Active subscriptions: ${JSON.stringify(customerInfo.activeSubscriptions)}`);
        debug('revenueCat', `Entitlement found: ${entitled}`);
        
        if (entitlement) {
          debug('revenueCat', `Entitlement details: ${JSON.stringify({
            identifier: entitlement.identifier,
            productIdentifier: entitlement.productIdentifier,
            expirationDate: entitlement.expirationDate,
            willRenew: entitlement.willRenew
          })}`);
        } else {
          debugError('revenueCat', `❌ Entitlement "${ENTITLEMENT_ID}" NOT FOUND in active entitlements!`);
          debugError('revenueCat', `This means the product is not linked to the entitlement in RevenueCat dashboard.`);
          debugError('revenueCat', `Please check RevenueCat Dashboard → Entitlements → "${ENTITLEMENT_ID}" → Attach product "${customerInfo.activeSubscriptions[0] || 'N/A'}"`);
        }
        
        // Update pro status immediately
        setIsPro(entitled);
        debug('revenueCat', `Pro status set to: ${entitled}`);
        
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
        
        debugSuccess('revenueCat', 'Purchase successful - Pro status updated immediately');
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
        debugError('revenueCat', 'Purchase error:', error);
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
        
        debug('revenueCat', `Restore completed - Checking entitlement directly from restore result`);
        debug('revenueCat', `Entitlement found: ${entitled}`);
        
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
        
        debugSuccess('revenueCat', 'Purchases restored successfully - Pro status updated immediately');
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
        debugError('revenueCat', 'Restore error:', error);
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

