import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform, Alert } from 'react-native';
import { auth } from '@/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Product IDs - These need to match your App Store Connect product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'com.flashbits.pro.monthly', // Replace with your actual product ID
  YEARLY: 'com.flashbits.pro.yearly',   // Replace with your actual product ID
} as const;

export type SubscriptionPlan = 'monthly' | 'yearly';

interface PurchaseResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

/**
 * Initialize the In-App Purchase connection
 */
export const initializePurchases = async (): Promise<boolean> => {
  try {
    if (Platform.OS !== 'ios') {
      console.warn('In-App Purchases are only available on iOS');
      return false;
    }

    const isAvailable = await InAppPurchases.isAvailableAsync();
    if (!isAvailable) {
      console.warn('In-App Purchases are not available on this device');
      return false;
    }

    await InAppPurchases.connectAsync();
    console.log('✅ In-App Purchases connected');
    return true;
  } catch (error) {
    console.error('Error initializing purchases:', error);
    return false;
  }
};

/**
 * Get available products from the App Store
 */
export const getProducts = async () => {
  try {
    const products = await InAppPurchases.getProductsAsync([
      PRODUCT_IDS.MONTHLY,
      PRODUCT_IDS.YEARLY,
    ]);
    return products.results;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Purchase a subscription
 */
export const purchaseSubscription = async (
  plan: SubscriptionPlan
): Promise<PurchaseResult> => {
  try {
    const productId = plan === 'monthly' ? PRODUCT_IDS.MONTHLY : PRODUCT_IDS.YEARLY;
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: 'You must be signed in to make a purchase',
      };
    }

    // Start the purchase flow
    await InAppPurchases.purchaseItemAsync(productId);

    // Listen for purchase updates
    return new Promise((resolve) => {
      const subscription = InAppPurchases.setPurchaseListener(
        async ({ response, errorCode }) => {
          subscription.remove();

          if (errorCode) {
            if (errorCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
              resolve({
                success: false,
                error: 'Purchase was canceled',
              });
            } else {
              resolve({
                success: false,
                error: `Purchase failed: ${errorCode}`,
              });
            }
            return;
          }

          if (response) {
            const { results } = response;
            
            if (results && results.length > 0) {
              const purchase = results[0];
              
              // Verify and acknowledge the purchase
              try {
                // Acknowledge the purchase (required for subscriptions)
                if (purchase.acknowledged === false) {
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                }

                // Save subscription to Firestore
                await saveSubscriptionToFirestore(user.uid, plan, purchase);

                resolve({
                  success: true,
                  transactionId: purchase.orderId,
                });
              } catch (error) {
                console.error('Error processing purchase:', error);
                resolve({
                  success: false,
                  error: 'Failed to process purchase',
                });
              }
            } else {
              resolve({
                success: false,
                error: 'No purchase data received',
              });
            }
          }
        }
      );
    });
  } catch (error: any) {
    console.error('Error purchasing subscription:', error);
    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
};

/**
 * Save subscription information to Firestore
 */
const saveSubscriptionToFirestore = async (
  userId: string,
  plan: SubscriptionPlan,
  purchase: InAppPurchases.InAppPurchase
) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    
    if (plan === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const subscriptionData = {
      isPro: true,
      proExpiresAt: expiryDate.toISOString(),
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      purchaseDate: purchase.purchaseTime ? new Date(purchase.purchaseTime).toISOString() : new Date().toISOString(),
      transactionId: purchase.orderId,
      productId: purchase.productId,
      lastUpdated: new Date().toISOString(),
    };

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

    console.log('✅ Subscription saved to Firestore');
  } catch (error) {
    console.error('Error saving subscription to Firestore:', error);
    throw error;
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<PurchaseResult> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'You must be signed in to restore purchases',
      };
    }

    await InAppPurchases.getPurchaseHistoryAsync();
    
    return new Promise((resolve) => {
      const subscription = InAppPurchases.setPurchaseListener(
        async ({ response, errorCode }) => {
          subscription.remove();

          if (errorCode) {
            resolve({
              success: false,
              error: `Restore failed: ${errorCode}`,
            });
            return;
          }

          if (response && response.results && response.results.length > 0) {
            // Process restored purchases
            for (const purchase of response.results) {
              const productId = purchase.productId;
              const plan = productId === PRODUCT_IDS.MONTHLY ? 'monthly' : 'yearly';
              
              await saveSubscriptionToFirestore(user.uid, plan, purchase);
            }

            resolve({
              success: true,
            });
          } else {
            resolve({
              success: false,
              error: 'No previous purchases found',
            });
          }
        }
      );
    });
  } catch (error: any) {
    console.error('Error restoring purchases:', error);
    return {
      success: false,
      error: error.message || 'Restore failed',
    };
  }
};

/**
 * Disconnect from In-App Purchases
 */
export const disconnectPurchases = async () => {
  try {
    await InAppPurchases.disconnectAsync();
    console.log('✅ In-App Purchases disconnected');
  } catch (error) {
    console.error('Error disconnecting purchases:', error);
  }
};

