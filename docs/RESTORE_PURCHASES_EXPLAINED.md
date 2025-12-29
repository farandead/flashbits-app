# How Restore Purchases Works - Logical Flow

## Overview

The "Restore Purchases" feature allows users to recover their previous subscription purchases when they:
- Reinstall the app
- Switch to a new device
- Log in with a different account on the same device
- Experience sync issues

## Complete Flow Diagram

```
User Taps "Restore Purchases"
    ↓
Settings: handleRestorePurchases()
    ↓
RevenueCat Context: restore()
    ↓
RevenueCat Service: restorePurchases()
    ↓
RevenueCat SDK: Purchases.restorePurchases()
    ↓
RevenueCat Server API Call
    ↓
Apple/Google Store Verification
    ↓
Return Customer Info with Entitlements
    ↓
Update App State (isPro, subscriptionStatus)
    ↓
Show Success/Error Message
```

## Step-by-Step Breakdown

### 1. **User Interaction** (`app/settings.tsx`)

```typescript
const handleRestorePurchases = async () => {
  setIsRestoring(true);  // Show loading state
  const result = await restore();  // Call context function
  // Show success/error alert
}
```

**What happens:**
- User taps the "Restore Purchases" button
- Loading state is set (`isRestoring = true`)
- Haptic feedback is triggered
- Calls the `restore()` function from RevenueCat context

### 2. **Context Layer** (`context/RevenueCatContext.tsx`)

```typescript
const restore = async () => {
  setIsLoading(true);
  const result = await restorePurchases();  // Call service
  
  if (result.success && result.customerInfo) {
    // Update local state
    setCustomerInfo(result.customerInfo);
    const entitled = await hasActiveEntitlement();
    setIsPro(entitled);  // Update Pro status
    setSubscriptionStatus(status);  // Update subscription details
  }
  
  return { success, error };
}
```

**What happens:**
- Sets loading state
- Calls the service layer `restorePurchases()`
- If successful:
  - Updates customer info in context
  - Checks if user has active entitlement ("flashbits Pro")
  - Updates `isPro` state (triggers UI updates)
  - Updates subscription status (expiration date, renewal info)
- Returns result to UI layer

### 3. **Service Layer** (`services/revenueCatService.ts`)

```typescript
export const restorePurchases = async (): Promise<PurchaseResult> => {
  const customerInfo = await Purchases.restorePurchases();
  
  return {
    success: true,
    customerInfo,  // Contains all subscription data
  };
}
```

**What happens:**
- Calls RevenueCat SDK's `restorePurchases()` method
- RevenueCat SDK:
  1. **Identifies the user** (using RevenueCat user ID, which is synced with Firebase Auth UID)
  2. **Makes API call** to RevenueCat servers
  3. **RevenueCat servers** query Apple/Google stores:
     - iOS: Queries App Store receipt validation
     - Android: Queries Google Play purchase history
  4. **Verifies purchases** against store records
  5. **Returns customer info** with all active/inactive subscriptions

### 4. **RevenueCat Server Process**

**What RevenueCat does behind the scenes:**

1. **User Identification:**
   - Uses RevenueCat user ID (synced with Firebase Auth UID)
   - Links purchases to this user ID

2. **Store Verification:**
   - **iOS:** Validates App Store receipts
   - **Android:** Validates Google Play purchase tokens
   - Checks purchase history across all devices

3. **Entitlement Calculation:**
   - Determines which entitlements are active
   - Checks subscription expiration dates
   - Verifies auto-renewal status

4. **Returns Customer Info:**
   ```typescript
   {
     entitlements: {
       active: {
         "flashbits Pro": {
           isActive: true,
           expirationDate: "2024-12-31T23:59:59Z",
           productIdentifier: "yearly",
           willRenew: true
         }
       }
     },
     activeSubscriptions: [...],
     allPurchasedProductIdentifiers: [...]
   }
   ```

### 5. **State Update** (`context/RevenueCatContext.tsx`)

After receiving customer info:

```typescript
// Check entitlement
const entitled = await hasActiveEntitlement();
// This checks: customerInfo.entitlements.active["flashbits Pro"]

setIsPro(entitled);  // Updates Pro status
// This triggers:
// - UI updates (Pro badges, locked features)
// - Settings screen refresh
// - Any component using useRevenueCat() hook
```

**What happens:**
- `hasActiveEntitlement()` checks if "flashbits Pro" exists in active entitlements
- If yes: `isPro = true` → User gets Pro features
- If no: `isPro = false` → User sees free tier

### 6. **UI Feedback** (`app/settings.tsx`)

```typescript
if (result.success) {
  Alert.alert('Success', 'Your purchases have been restored.');
} else {
  Alert.alert('Restore Failed', result.error);
}
```

**What happens:**
- Success: Shows success message, Pro features unlock
- Failure: Shows error message (e.g., "No purchases found")

## Key Concepts

### Why Restore is Needed

**Problem:** When a user reinstalls an app or switches devices, the app doesn't know about previous purchases.

**Solution:** Restore queries the store (Apple/Google) to verify previous purchases and sync them to the current device.

### User Identification

**Critical:** RevenueCat uses the **user ID** to link purchases:

```typescript
// When user signs in
await Purchases.logIn(user.uid);  // Firebase Auth UID

// When restoring
// RevenueCat uses this same UID to find purchases
```

**Important:** 
- Same Apple ID/Google account = Same purchases
- RevenueCat user ID must match Firebase Auth UID
- This is why we sync on login: `syncWithFirebaseAuth()`

### What Gets Restored

✅ **Active subscriptions** - Currently valid subscriptions  
✅ **Expired subscriptions** - Past subscriptions (for history)  
✅ **Entitlements** - Access to "flashbits Pro"  
✅ **Purchase history** - All previous transactions  

❌ **Does NOT restore:**
- Cancelled subscriptions (unless still in billing period)
- Refunded purchases
- Purchases from different Apple ID/Google account

### When Restore Fails

**Common reasons:**

1. **No purchases found:**
   - User never purchased
   - Purchases were made with different Apple ID/Google account
   - Purchases were refunded

2. **Network error:**
   - No internet connection
   - RevenueCat API unavailable
   - Store API unavailable

3. **User ID mismatch:**
   - RevenueCat user ID doesn't match Firebase Auth UID
   - User logged in with different account

4. **Store verification failed:**
   - Receipt validation failed
   - Purchase tokens expired
   - Store API issues

## Example Scenarios

### Scenario 1: User Reinstalls App

1. User had Pro subscription on iPhone
2. User deletes app
3. User reinstalls app
4. User signs in with same account
5. User taps "Restore Purchases"
6. RevenueCat queries App Store
7. Finds active subscription
8. Restores "flashbits Pro" entitlement
9. User gets Pro features back ✅

### Scenario 2: User Switches Devices

1. User has Pro on iPhone
2. User gets new iPhone
3. User installs app on new device
4. User signs in with same Apple ID
5. User taps "Restore Purchases"
6. RevenueCat finds subscription linked to Apple ID
7. Restores entitlement
8. User gets Pro features on new device ✅

### Scenario 3: No Purchases Found

1. User never purchased
2. User taps "Restore Purchases"
3. RevenueCat queries stores
4. No purchases found for this user
5. Returns error: "No purchases found to restore"
6. User sees error message ❌

### Scenario 4: Different Account

1. User purchased with Apple ID: `user@example.com`
2. User signs in with different Apple ID: `other@example.com`
3. User taps "Restore Purchases"
4. RevenueCat queries for `other@example.com`
5. No purchases found (purchases are on `user@example.com`)
6. Returns error ❌

## Technical Details

### RevenueCat SDK Method

```typescript
Purchases.restorePurchases()
```

**What it does:**
- Makes HTTP request to RevenueCat API
- RevenueCat queries Apple/Google stores
- Validates receipts/purchase tokens
- Returns `CustomerInfo` object

**Network calls:**
- `POST /v1/subscribers/{user_id}/restore`
- RevenueCat → Apple App Store API
- RevenueCat → Google Play API

### Customer Info Structure

```typescript
{
  entitlements: {
    active: {
      "flashbits Pro": {
        identifier: "flashbits Pro",
        isActive: true,
        expirationDate: "2024-12-31T23:59:59Z",
        productIdentifier: "yearly",
        purchaseDate: "2024-01-01T00:00:00Z",
        willRenew: true,
        periodType: "NORMAL"
      }
    },
    all: { ... }
  },
  activeSubscriptions: ["yearly"],
  allPurchasedProductIdentifiers: ["yearly", "monthly"],
  latestExpirationDate: "2024-12-31T23:59:59Z",
  requestDate: "2024-06-15T10:00:00Z"
}
```

## Best Practices

### When to Call Restore

✅ **Good times:**
- After user signs in
- When user taps "Restore Purchases" button
- On app launch (optional, but can be automatic)

❌ **Avoid:**
- Calling too frequently (rate limiting)
- Calling without user action (privacy concerns)
- Calling on every app launch (unnecessary)

### Error Handling

Always handle these cases:
1. **No purchases found** - Normal, user just hasn't purchased
2. **Network errors** - Retry or show helpful message
3. **User cancellation** - User may have cancelled subscription
4. **Store verification failed** - Technical issue, may need retry

### User Experience

- Show loading state during restore
- Provide clear success/error messages
- Don't require restore for active users (auto-sync on login)
- Make restore easily accessible but not intrusive

## Summary

**Restore Purchases** is a **verification and sync process** that:

1. **Queries stores** (Apple/Google) for purchase history
2. **Validates receipts** to ensure purchases are legitimate
3. **Syncs entitlements** to current device/account
4. **Updates app state** to reflect subscription status
5. **Unlocks features** if subscription is active

It's essential for users who:
- Reinstall apps
- Switch devices
- Experience sync issues
- Want to verify their subscription status

The entire process is **secure** (validated by stores), **reliable** (handled by RevenueCat), and **user-friendly** (simple button tap).


