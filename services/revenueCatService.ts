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
// Use console for RevenueCat logging (debug utility doesn't support 'revenuecat' type)
const log = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(`[RevenueCat] ${message}`, ...args);
  }
};

const logSuccess = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.log(`✅ [RevenueCat] ${message}`, ...args);
  }
};

const logError = (message: string, ...args: any[]) => {
  console.error(`❌ [RevenueCat] ${message}`, ...args);
};

// RevenueCat API Key
const REVENUECAT_API_KEY = 'appl_hMEAXDEWgsafXafxJrgvrZLFrnE';

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
    log('Initializing RevenueCat SDK...');
    
    // Set log level for debugging
    // Note: DEBUG level may show cache errors in iOS simulator (non-critical)
    // These errors don't affect functionality - RevenueCat will work fine
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.WARN); // Use WARN to reduce noise, or DEBUG for full logs
    } else {
      Purchases.setLogLevel(LOG_LEVEL.ERROR); // Only errors in production
    }

    // Configure RevenueCat with your API key
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    // Set up customer info update listener to automatically refresh when purchases change
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      log('Customer info updated - syncing to Firestore');
      // Automatically sync to Firestore when customer info updates
      syncSubscriptionToFirestore().catch((error) => {
        logError('Failed to sync after customer info update:', error);
      });
    });

    logSuccess('RevenueCat SDK initialized successfully');

    // Set user ID if user is authenticated
    const user = auth.currentUser;
    if (user) {
      await setRevenueCatUserId(user.uid);
    }

    return true;
  } catch (error: any) {
    logError('Failed to initialize RevenueCat:', error);
    return false;
  }
};

/**
 * Set the RevenueCat user ID (should match Firebase Auth UID)
 * Call this after user signs in
 */
export const setRevenueCatUserId = async (userId: string): Promise<void> => {
  try {
    log(`Setting RevenueCat user ID: ${userId}`);
    await Purchases.logIn(userId);
    logSuccess('RevenueCat user ID set successfully');
  } catch (error: any) {
    logError('Failed to set RevenueCat user ID:', error);
    throw error;
  }
};

/**
 * Log out the current RevenueCat user
 * Call this when user signs out
 */
export const logOutRevenueCat = async (): Promise<void> => {
  try {
    log('Logging out RevenueCat user');
    await Purchases.logOut();
    logSuccess('RevenueCat user logged out');
  } catch (error: any) {
    logError('Failed to log out RevenueCat user:', error);
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
    logError('Failed to get customer info:', error);
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
    log(`Has active entitlement: ${isEntitled}`);
    return isEntitled;
  } catch (error: any) {
    logError('Failed to check entitlement:', error);
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
      logSuccess('Found current offering');
      return offerings.current;
    }
    
      log('No current offering found');
    return null;
  } catch (error: any) {
    logError('Failed to get offerings:', error);
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
      log('No offering found, returning empty packages array');
      return [];
    }
    
    const packages = offering.availablePackages;
    log(`Found ${packages.length} packages: ${packages.map(p => p.identifier).join(', ')}`);
    return packages;
  } catch (error: any) {
    logError('Failed to get packages:', error);
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
    log(`Purchasing package: ${packageToPurchase.identifier}`);
    log(`Product ID: ${packageToPurchase.product.identifier}`);
    log(`Price: ${packageToPurchase.product.priceString}`);
    log(`Title: ${packageToPurchase.product.title}`);
    log(`Description: ${packageToPurchase.product.description || 'N/A'}`);
    
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    logSuccess('Purchase successful');
    
    // Sync subscription status to Firestore after successful purchase
    await syncSubscriptionToFirestore();
    
    return {
      success: true,
      customerInfo,
    };
  } catch (error: any) {
    logError('Purchase failed:', error);
    
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
      logError(`Package for ${plan} plan not found. Available packages: ${availableIdentifiers}`);
      
      return {
        success: false,
        error: `Package for ${plan} plan not found. Available packages: ${availableIdentifiers}`,
      };
    }
    
    log(`Found matching package for ${plan}: ${packageToPurchase.identifier}`);
    return await purchasePackage(packageToPurchase);
  } catch (error: any) {
    logError('Failed to purchase subscription:', error);
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
    log('Restoring purchases...');
    
    const customerInfo = await Purchases.restorePurchases();
    
    logSuccess('Purchases restored successfully');
    
    // Sync subscription status to Firestore after successful restore
    await syncSubscriptionToFirestore();
    
    return {
      success: true,
      customerInfo,
    };
  } catch (error: any) {
    logError('Failed to restore purchases:', error);
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
    logError('Failed to get subscription status:', error);
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
      log('No Firebase user, skipping Firestore sync');
      return;
    }

    const customerInfo = await getCustomerInfo();
    if (!customerInfo) {
      log('No customer info, skipping Firestore sync');
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

    logSuccess('Subscription status synced to Firestore');
  } catch (error: any) {
    logError('Failed to sync subscription to Firestore:', error);
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
      log('No Firebase user, skipping sync');
      return;
    }
    
    await setRevenueCatUserId(user.uid);
    logSuccess('Synced RevenueCat with Firebase Auth');
    
    // Also sync subscription status to Firestore
    await syncSubscriptionToFirestore();
  } catch (error: any) {
    logError('Failed to sync with Firebase Auth:', error);
  }
};

