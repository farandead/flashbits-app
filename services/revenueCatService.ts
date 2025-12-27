import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
  LOG_LEVEL,
} from 'react-native-purchases';

// Re-export types for use in other files
export type { CustomerInfo, PurchasesOffering, PurchasesPackage, PurchasesStoreProduct };
import { Platform, Alert } from 'react-native';
import { auth, db } from '@/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { debug, debugError, debugSuccess } from '@/utils/debug';

// RevenueCat API Key - loaded from environment variables
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
if (!REVENUECAT_API_KEY) {
  throw new Error('EXPO_PUBLIC_REVENUECAT_API_KEY is not set. Please add it to your .env file.');
}

// Entitlement identifier
export const ENTITLEMENT_ID = 'pro';

// Product identifiers - these should match your App Store Connect IAP product IDs
// These are the actual product IDs from App Store Connect, not RevenueCat package identifiers
export const PRODUCT_IDENTIFIERS = {
  MONTHLY: 'com.flashbits.pro.monthly',
  YEARLY: 'com.flashbits.pro.yearly',
} as const;

// Note: RevenueCat package identifiers can be different (e.g., "monthly", "yearly")
// The package matching logic will find packages by checking if their identifier contains
// keywords like "monthly", "yearly", "annual", etc.

export type SubscriptionPlan = 'monthly' | 'yearly';

interface PurchaseResult {
  success: boolean;
  error?: string;
  customerInfo?: CustomerInfo;
}

/**
 * Initialize RevenueCat SDK
 * Call this once when your app starts
 */
export const initializeRevenueCat = async (): Promise<boolean> => {
  try {
    debug('revenueCat', 'Initializing RevenueCat SDK...');
    
    // Set log level for debugging
    // Note: Cache errors (ERROR level) are non-critical and common in development/simulator
    // They occur when RevenueCat tries to cache data but directories don't exist yet
    // These errors don't affect functionality - RevenueCat will work fine
    // Setting to ERROR level reduces noise from WARN messages (like missing App Store Connect metadata)
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.ERROR); // Only show errors in dev (cache errors are harmless)
    } else {
      Purchases.setLogLevel(LOG_LEVEL.ERROR); // Only errors in production
    }

    // Configure RevenueCat with your API key
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    // Set up customer info update listener to automatically refresh when purchases change
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      debug('revenueCat', 'Customer info updated - syncing to Firestore');
      // Automatically sync to Firestore when customer info updates
      syncSubscriptionToFirestore().catch((error) => {
        debugError('revenueCat', 'Failed to sync after customer info update:', error);
      });
    });

    debugSuccess('revenueCat', 'RevenueCat SDK initialized successfully');

    // Set user ID if user is authenticated
    const user = auth.currentUser;
    if (user) {
      await setRevenueCatUserId(user.uid);
    }

    return true;
  } catch (error: any) {
    debugError('revenueCat', 'Failed to initialize RevenueCat:', error);
    return false;
  }
};

/**
 * Set the RevenueCat user ID (should match Firebase Auth UID)
 * Call this after user signs in
 */
export const setRevenueCatUserId = async (userId: string): Promise<void> => {
  try {
    debug('revenueCat', `Setting RevenueCat user ID: ${userId}`);
    await Purchases.logIn(userId);
    debugSuccess('revenueCat', 'RevenueCat user ID set successfully');
  } catch (error: any) {
    debugError('revenueCat', 'Failed to set RevenueCat user ID:', error);
    throw error;
  }
};

/**
 * Log out the current RevenueCat user
 * Call this when user signs out
 */
export const logOutRevenueCat = async (): Promise<void> => {
  try {
    debug('revenueCat', 'Logging out RevenueCat user');
    await Purchases.logOut();
    debugSuccess('revenueCat', 'RevenueCat user logged out');
  } catch (error: any) {
    debugError('revenueCat', 'Failed to log out RevenueCat user:', error);
    throw error;
  }
};

/**
 * Get current customer info
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error: any) {
    debugError('revenueCat', 'Failed to get customer info:', error);
    return null;
  }
};

/**
 * Check if user has active entitlement
 */
export const hasActiveEntitlement = async (): Promise<boolean> => {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;
    
    const isEntitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    debug('revenueCat', `Has active entitlement: ${isEntitled}`);
    return isEntitled;
  } catch (error: any) {
    debugError('revenueCat', 'Failed to check entitlement:', error);
    return false;
  }
};

/**
 * Get available offerings (packages/products)
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current !== null) {
      debugSuccess('revenueCat', 'Found current offering');
      return offerings.current;
    }
    
      debug('revenueCat', 'No current offering found');
    return null;
  } catch (error: any) {
    debugError('revenueCat', 'Failed to get offerings:', error);
    return null;
  }
};

/**
 * Get available packages from current offering
 */
export const getPackages = async (): Promise<PurchasesPackage[]> => {
  try {
    const offering = await getOfferings();
    if (!offering) {
      debug('revenueCat', 'No offering found, returning empty packages array');
      return [];
    }
    
    const packages = offering.availablePackages;
    debug('revenueCat', `Found ${packages.length} packages: ${packages.map(p => p.identifier).join(', ')}`);
    return packages;
  } catch (error: any) {
    debugError('revenueCat', 'Failed to get packages:', error);
    return [];
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (
  packageToPurchase: PurchasesPackage
): Promise<PurchaseResult> => {
  try {
    debug('revenueCat', `Purchasing package: ${packageToPurchase.identifier}`);
    debug('revenueCat', `Product ID: ${packageToPurchase.product.identifier}`);
    debug('revenueCat', `Price: ${packageToPurchase.product.priceString}`);
    debug('revenueCat', `Title: ${packageToPurchase.product.title}`);
    debug('revenueCat', `Description: ${packageToPurchase.product.description || 'N/A'}`);
    
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    debugSuccess('revenueCat', 'Purchase successful');
    
    // Sync subscription status to Firestore after successful purchase
    await syncSubscriptionToFirestore();
    
    return {
      success: true,
      customerInfo,
    };
  } catch (error: any) {
    debugError('revenueCat', 'Purchase failed:', error);
    
    // Handle user cancellation
    if (error.userCancelled) {
      return {
        success: false,
        error: 'Purchase was canceled',
      };
    }
    
    // Handle other errors
    return {
      success: false,
      error: error.message || 'Purchase failed. Please try again.',
    };
  }
};

/**
 * Helper function to determine if a package matches a plan type
 * This matches the logic used in Paywall component
 */
const packageMatchesPlan = (pkg: PurchasesPackage, plan: SubscriptionPlan): boolean => {
  const identifier = pkg.identifier.toLowerCase();
  
  if (plan === 'monthly') {
    return identifier.includes('monthly') || identifier.includes('month');
  } else if (plan === 'yearly') {
    return identifier.includes('yearly') || 
           identifier.includes('annual') || 
           identifier.includes('year');
  }
  
  return false;
};

/**
 * Purchase subscription by plan type
 */
export const purchaseSubscription = async (
  plan: SubscriptionPlan
): Promise<PurchaseResult> => {
  try {
    const packages = await getPackages();
    
    if (packages.length === 0) {
      return {
        success: false,
        error: 'No packages available. Please check your RevenueCat configuration.',
      };
    }
    
    // Find the package that matches the plan using consistent matching logic
    const packageToPurchase = packages.find((pkg) => packageMatchesPlan(pkg, plan));
    
    if (!packageToPurchase) {
      // Log available packages for debugging
      const availableIdentifiers = packages.map(p => p.identifier).join(', ');
      debugError('revenueCat', `Package for ${plan} plan not found. Available packages: ${availableIdentifiers}`);
      
      return {
        success: false,
        error: `Package for ${plan} plan not found. Available packages: ${availableIdentifiers}`,
      };
    }
    
    debug('revenueCat', `Found matching package for ${plan}: ${packageToPurchase.identifier}`);
    return await purchasePackage(packageToPurchase);
  } catch (error: any) {
    debugError('revenueCat', 'Failed to purchase subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to purchase subscription',
    };
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<PurchaseResult> => {
  try {
    debug('revenueCat', 'Restoring purchases...');
    
    const customerInfo = await Purchases.restorePurchases();
    
    debugSuccess('revenueCat', 'Purchases restored successfully');
    
    // Sync subscription status to Firestore after successful restore
    await syncSubscriptionToFirestore();
    
    return {
      success: true,
      customerInfo,
    };
  } catch (error: any) {
    debugError('revenueCat', 'Failed to restore purchases:', error);
    return {
      success: false,
      error: error.message || 'Failed to restore purchases',
    };
  }
};

/**
 * Get subscription status details
 */
export interface SubscriptionStatus {
  isActive: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
  willRenew: boolean;
  periodType: string | null;
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo) {
      return {
        isActive: false,
        expirationDate: null,
        productIdentifier: null,
        willRenew: false,
        periodType: null,
      };
    }
    
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (!entitlement) {
      return {
        isActive: false,
        expirationDate: null,
        productIdentifier: null,
        willRenew: false,
        periodType: null,
      };
    }
    
    return {
      isActive: true,
      expirationDate: entitlement.expirationDate || null,
      productIdentifier: entitlement.productIdentifier || null,
      willRenew: entitlement.willRenew || false,
      periodType: entitlement.periodType || null,
    };
  } catch (error: any) {
    debugError('revenueCat', 'Failed to get subscription status:', error);
    return {
      isActive: false,
      expirationDate: null,
      productIdentifier: null,
      willRenew: false,
      periodType: null,
    };
  }
};

/**
 * Sync subscription status to Firestore
 * Saves pro status and subscription details to user document
 */
export const syncSubscriptionToFirestore = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      debug('revenueCat', 'No Firebase user, skipping Firestore sync');
      return;
    }

    const customerInfo = await getCustomerInfo();
    if (!customerInfo) {
      debug('revenueCat', 'No customer info, skipping Firestore sync');
      return;
    }

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const isPro = entitlement !== undefined;
    
    const subscriptionData: any = {
      isPro,
      lastUpdated: new Date().toISOString(),
    };

    if (isPro && entitlement) {
      // User has active subscription
      subscriptionData.proExpiresAt = entitlement.expirationDate || null;
      subscriptionData.subscriptionStatus = 'active';
      subscriptionData.subscriptionPlan = entitlement.productIdentifier?.includes('monthly') ? 'monthly' : 
                                          entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 
                                          entitlement.productIdentifier || null;
      subscriptionData.willRenew = entitlement.willRenew || false;
      
      // Get product ID from active subscriptions (array of strings)
      if (customerInfo.activeSubscriptions.length > 0) {
        subscriptionData.productId = customerInfo.activeSubscriptions[0] || null;
      }
      
      // Get purchase date from entitlement if available
      if (entitlement.latestPurchaseDate) {
        subscriptionData.purchaseDate = entitlement.latestPurchaseDate;
      }
    } else {
      // User doesn't have active subscription
      subscriptionData.subscriptionStatus = 'inactive';
      subscriptionData.isPro = false;
    }

    // Save to Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing user document
      await setDoc(userRef, subscriptionData, { merge: true });
    } else {
      // Create new user document
      await setDoc(userRef, {
        ...subscriptionData,
        createdAt: new Date().toISOString(),
      });
    }

    debugSuccess('revenueCat', 'Subscription status synced to Firestore');
  } catch (error: any) {
    debugError('revenueCat', 'Failed to sync subscription to Firestore:', error);
  }
};

/**
 * Sync RevenueCat customer info with Firebase Auth
 * Call this when user signs in to ensure RevenueCat is linked to Firebase user
 */
export const syncWithFirebaseAuth = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      debug('revenueCat', 'No Firebase user, skipping sync');
      return;
    }
    
    await setRevenueCatUserId(user.uid);
    debugSuccess('revenueCat', 'Synced RevenueCat with Firebase Auth');
    
    // Also sync subscription status to Firestore
    await syncSubscriptionToFirestore();
  } catch (error: any) {
    debugError('revenueCat', 'Failed to sync with Firebase Auth:', error);
  }
};

