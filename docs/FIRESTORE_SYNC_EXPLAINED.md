# Firestore Sync for Pro Status - Explained

## Overview

Yes! **Pro status IS saved to Firestore**. The app automatically syncs subscription status from RevenueCat to Firestore whenever:

1. User makes a purchase
2. User restores purchases
3. Customer info is refreshed
4. User signs in (syncs on login)

## Why Sync to Firestore?

### Benefits:

1. **Offline Access**: Pro status available even if RevenueCat API is down
2. **Analytics**: Track subscription metrics in Firestore
3. **Backend Integration**: Other services can check pro status
4. **Backup**: Redundant storage of subscription data
5. **Fast Queries**: Quick lookups without API calls

### Data Stored:

```typescript
{
  isPro: boolean,                    // Pro subscription status
  proExpiresAt: string | null,       // Subscription expiration date
  subscriptionStatus: 'active' | 'inactive',
  subscriptionPlan: 'monthly' | 'yearly' | null,
  willRenew: boolean,                // Auto-renewal status
  productId: string | null,          // Product identifier
  purchaseDate: string | null,       // Purchase date
  lastUpdated: string,              // Last sync timestamp
}
```

## How It Works

### 1. **After Purchase** (`revenueCatService.ts`)

```typescript
export const purchasePackage = async (packageToPurchase) => {
  const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
  
  // Automatically sync to Firestore
  await syncSubscriptionToFirestore();
  
  return { success: true, customerInfo };
}
```

**Flow:**
1. User completes purchase
2. RevenueCat returns customer info
3. `syncSubscriptionToFirestore()` is called automatically
4. Pro status saved to Firestore

### 2. **After Restore** (`revenueCatService.ts`)

```typescript
export const restorePurchases = async () => {
  const customerInfo = await Purchases.restorePurchases();
  
  // Automatically sync to Firestore
  await syncSubscriptionToFirestore();
  
  return { success: true, customerInfo };
}
```

**Flow:**
1. User restores purchases
2. RevenueCat returns customer info
3. `syncSubscriptionToFirestore()` is called automatically
4. Pro status synced to Firestore

### 3. **On Customer Info Refresh** (`RevenueCatContext.tsx`)

```typescript
const refreshCustomerInfo = async () => {
  const info = await getCustomerInfo();
  // ... update state ...
  
  // Sync to Firestore whenever customer info is refreshed
  await syncSubscriptionToFirestore();
}
```

**Flow:**
1. App refreshes customer info (on login, app start, etc.)
2. Updates local state
3. Syncs to Firestore automatically

### 4. **On User Login** (`revenueCatService.ts`)

```typescript
export const syncWithFirebaseAuth = async () => {
  await setRevenueCatUserId(user.uid);
  
  // Also sync subscription status to Firestore
  await syncSubscriptionToFirestore();
}
```

**Flow:**
1. User signs in
2. RevenueCat user ID is set
3. Subscription status synced to Firestore

## Sync Function Details

### `syncSubscriptionToFirestore()`

**Location:** `services/revenueCatService.ts`

**What it does:**

1. **Gets current user** from Firebase Auth
2. **Fetches customer info** from RevenueCat
3. **Checks entitlement** ("flashbits Pro")
4. **Extracts subscription data:**
   - `isPro`: true/false
   - `proExpiresAt`: expiration date
   - `subscriptionStatus`: active/inactive
   - `subscriptionPlan`: monthly/yearly
   - `willRenew`: auto-renewal status
   - `productId`: product identifier
   - `purchaseDate`: when purchased
5. **Saves to Firestore** at `/users/{userId}`

**Code:**
```typescript
export const syncSubscriptionToFirestore = async (): Promise<void> => {
  const user = auth.currentUser;
  const customerInfo = await getCustomerInfo();
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const isPro = entitlement !== undefined;
  
  const subscriptionData = {
    isPro,
    proExpiresAt: entitlement?.expirationDate || null,
    subscriptionStatus: isPro ? 'active' : 'inactive',
    subscriptionPlan: /* monthly or yearly */,
    willRenew: entitlement?.willRenew || false,
    productId: /* product identifier */,
    purchaseDate: /* purchase date */,
    lastUpdated: new Date().toISOString(),
  };
  
  await setDoc(doc(db, 'users', user.uid), subscriptionData, { merge: true });
}
```

## Firestore Document Structure

**Path:** `/users/{userId}`

**Example Document:**
```json
{
  "isPro": true,
  "proExpiresAt": "2024-12-31T23:59:59Z",
  "subscriptionStatus": "active",
  "subscriptionPlan": "yearly",
  "willRenew": true,
  "productId": "yearly",
  "purchaseDate": "2024-01-01T00:00:00Z",
  "lastUpdated": "2024-06-15T10:00:00Z",
  "name": "John Doe",
  "onboardingCompleted": true,
  "xp": 1500,
  "questionsAnswered": 45
}
```

## When Sync Happens

### Automatic Sync:

✅ **After purchase** - Immediately after successful purchase  
✅ **After restore** - Immediately after restore completes  
✅ **On login** - When user signs in  
✅ **On refresh** - When customer info is refreshed  

### Manual Sync:

You can also manually sync:
```typescript
import { syncSubscriptionToFirestore } from '@/services/revenueCatService';

await syncSubscriptionToFirestore();
```

## Data Flow

```
RevenueCat (Source of Truth)
    ↓
Customer Info (Entitlements)
    ↓
syncSubscriptionToFirestore()
    ↓
Firestore /users/{userId}
    ↓
Available for:
- Analytics
- Backend services
- Offline access
- Fast queries
```

## Reading Pro Status

### From RevenueCat (Primary Source):
```typescript
const { isPro } = useRevenueCat();  // Real-time, always accurate
```

### From Firestore (Backup/Cache):
```typescript
import { getUserProfile } from '@/services/userService';

const profile = await getUserProfile(userId);
const isPro = profile?.isPro || false;
```

## Best Practices

### 1. **RevenueCat is Source of Truth**
- Always check RevenueCat first for real-time status
- Firestore is a backup/cache
- Firestore may be slightly out of date

### 2. **Sync Frequency**
- Automatic syncs are sufficient
- Don't manually sync too frequently
- Sync happens on all important events

### 3. **Error Handling**
- Sync failures don't block purchases
- Errors are logged but don't affect user experience
- Firestore sync is best-effort

### 4. **Data Consistency**
- RevenueCat is authoritative
- Firestore is eventually consistent
- If there's a mismatch, trust RevenueCat

## Troubleshooting

### Pro Status Not Syncing

**Check:**
1. User is authenticated (`auth.currentUser` exists)
2. RevenueCat has customer info
3. Firestore permissions allow write
4. Network connectivity

**Debug:**
```typescript
// Check if sync is being called
console.log('Syncing to Firestore...');

// Check what data is being saved
const subscriptionData = { /* ... */ };
console.log('Saving:', subscriptionData);
```

### Firestore Not Updating

**Possible causes:**
1. Firestore security rules blocking write
2. User not authenticated
3. Network error
4. RevenueCat customer info missing

**Solution:**
- Check Firestore console for errors
- Verify security rules allow user to write to `/users/{userId}`
- Check network logs

## Summary

✅ **Pro status IS saved to Firestore**  
✅ **Automatic sync on purchase, restore, login, refresh**  
✅ **Firestore acts as backup/cache**  
✅ **RevenueCat remains source of truth**  
✅ **Available for analytics and backend services**  

The sync happens automatically and transparently - you don't need to do anything special. The pro status will be available in Firestore for analytics, backend services, and as a backup if RevenueCat is unavailable.


