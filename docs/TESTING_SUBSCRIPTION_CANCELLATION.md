# Testing Subscription Cancellation - Complete Guide

This guide covers how to test subscription cancellation for Flashbits on both iOS and Android platforms.

## Prerequisites

1. **Sandbox/Test Accounts Set Up**
   - iOS: Sandbox tester account in App Store Connect
   - Android: Test account in Google Play Console
   - RevenueCat: Test API key configured (`test_RLxkHjNxnVRGtQlAkZofFMmiNfV`)

2. **Products Configured**
   - Products created in App Store Connect (iOS) and Google Play Console (Android)
   - Products linked in RevenueCat dashboard
   - Offerings configured in RevenueCat

3. **App Setup**
   - App installed on test device
   - Signed in with test account
   - RevenueCat SDK initialized

---

## iOS Testing (App Store / Sandbox)

### Step 1: Create Sandbox Tester Account

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Sandbox Testers**
3. Click **+** to create a new sandbox tester
4. Fill in:
   - First Name, Last Name
   - Email (must be unique, not used for real Apple ID)
   - Password
   - Country/Region
5. Save the account

### Step 2: Sign Out of Real Apple ID

**Important:** You must sign out of your real Apple ID on the test device.

1. On your iPhone/iPad:
   - Go to **Settings** → **[Your Name]** → **Media & Purchases**
   - Tap **Sign Out**
   - Or go to **Settings** → **App Store** → Tap your Apple ID → **Sign Out**

### Step 3: Make a Test Purchase

1. Open your app on the test device
2. Sign in with your Firebase test account
3. Navigate to the paywall/subscription screen
4. Tap to purchase a subscription
5. When prompted for Apple ID, use your **sandbox tester account** credentials
6. Complete the purchase (it won't charge real money)

### Step 4: Verify Active Subscription

1. In your app, verify Pro features are unlocked
2. Check RevenueCat Dashboard:
   - Go to **Customers** → Find your test user
   - Verify subscription is active
   - Note the expiration date

### Step 5: Cancel Subscription

**Method 1: Through iOS Settings (Recommended)**

1. On your test device, go to **Settings** app
2. Tap your **name** at the top (sandbox account)
3. Tap **Subscriptions**
4. Find **Flashbits** in the list
5. Tap **Flashbits**
6. Tap **Cancel Subscription**
7. Confirm cancellation

**Method 2: Through App Store Website**

1. Go to [https://apps.apple.com/account/subscriptions](https://apps.apple.com/account/subscriptions)
2. Sign in with your sandbox tester account
3. Find Flashbits subscription
4. Click **Cancel Subscription**

### Step 6: Verify Cancellation Status

1. **In iOS Settings:**
   - Subscription should show "Expires on [date]"
   - Should say "Will not renew"

2. **In RevenueCat Dashboard:**
   - Go to **Customers** → Your test user
   - Check subscription status
   - Should show as "active" but "will not renew"
   - Expiration date should be visible

3. **In Your App:**
   - Pro features should still work (until expiration)
   - Subscription status should reflect "will not renew"

### Step 7: Test Expiration (Optional - Fast Testing)

To test expiration without waiting:

1. **Option A: Wait for Natural Expiration**
   - Sandbox subscriptions typically expire in 1-5 minutes for testing
   - Check RevenueCat dashboard for expiration

2. **Option B: Use StoreKit Configuration File (Xcode)**
   - Create StoreKit configuration file in Xcode
   - Set shorter expiration times for testing
   - Load configuration in simulator

3. **Option C: Adjust System Date (Not Recommended)**
   - Change device date to after expiration
   - May cause issues with other apps

### Step 8: Verify Post-Expiration Behavior

1. After expiration:
   - Pro features should be locked
   - User should see paywall again
   - Subscription status should show as expired

2. Check RevenueCat Dashboard:
   - Subscription should show as "expired"
   - Entitlement should be inactive

---

## Android Testing (Google Play)

### Step 1: Create Test Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **License testing**
3. Add test email addresses
4. Or create a test account in **Users and permissions**

### Step 2: Add Test Account to Device

1. On your Android device:
   - Go to **Settings** → **Accounts**
   - Add the test Google account
   - Make sure it's the active account for Play Store

### Step 3: Make a Test Purchase

1. Open your app
2. Sign in with Firebase test account
3. Navigate to subscription screen
4. Tap to purchase
5. Complete purchase with test account
6. **Note:** Test purchases are free but simulate real purchases

### Step 4: Verify Active Subscription

1. In app: Verify Pro features unlocked
2. In Google Play Console:
   - Go to **Monetization** → **Subscriptions**
   - Find your test subscription
3. In RevenueCat Dashboard:
   - Check customer subscription status

### Step 5: Cancel Subscription

**Method 1: Through Google Play Store App**

1. Open **Google Play Store** app
2. Tap **Menu (☰)** → **Subscriptions**
3. Find **Flashbits**
4. Tap **Cancel subscription**
5. Confirm cancellation

**Method 2: Through Play Store Website**

1. Go to [https://play.google.com/store/account/subscriptions](https://play.google.com/store/account/subscriptions)
2. Sign in with test account
3. Find Flashbits subscription
4. Click **Cancel subscription**

### Step 6: Verify Cancellation

1. **In Play Store:**
   - Subscription shows expiration date
   - Status shows "Cancels on [date]"

2. **In RevenueCat Dashboard:**
   - Subscription active but "will not renew"
   - Expiration date visible

3. **In Your App:**
   - Pro features still work until expiration

### Step 7: Test Expiration

Android test subscriptions typically expire quickly (minutes to hours):

1. Wait for natural expiration
2. Or manually expire in Play Console (if you have access)
3. Verify app behavior after expiration

---

## Testing with RevenueCat Dashboard

### Monitor Subscription Status

1. **Go to RevenueCat Dashboard:**
   - Navigate to **Customers**
   - Search for your test user (by Firebase UID or email)

2. **Check Subscription Details:**
   - Active status
   - Expiration date
   - Renewal status (will renew / will not renew)
   - Product identifier
   - Store (App Store / Play Store)

3. **View Events:**
   - Check **Events** tab for subscription lifecycle events
   - Look for: `CANCELLATION`, `EXPIRATION`, `RENEWAL`

### Test Different Scenarios

1. **Immediate Cancellation:**
   - Cancel right after purchase
   - Verify status updates in RevenueCat
   - Verify app still shows Pro (until expiration)

2. **Cancellation Before Renewal:**
   - Purchase subscription
   - Wait a bit
   - Cancel before renewal date
   - Verify it doesn't renew

3. **Reactivation:**
   - Cancel subscription
   - Before expiration, reactivate
   - Verify subscription continues

4. **Expiration:**
   - Let subscription expire
   - Verify Pro features lock
   - Verify user can purchase again

---

## Testing In-App Cancellation Flow

### Test "Manage Subscription" Button

1. In your app Settings:
   - Tap **"Manage"** button (if Pro user)
   - Should open store subscription page
   - Verify link works correctly

2. Test on both platforms:
   - iOS: Should open App Store subscriptions
   - Android: Should open Play Store subscriptions

### Test Customer Center (If Enabled)

1. In app Settings:
   - Tap **"Open Customer Center"**
   - Should open RevenueCat Customer Center
   - Verify cancellation option available (if configured)

2. Test cancellation through Customer Center:
   - Cancel subscription
   - Verify status updates in app
   - Check RevenueCat dashboard

---

## What to Verify

### ✅ Immediate After Cancellation

- [ ] Subscription marked as "will not renew" in store
- [ ] RevenueCat dashboard shows correct status
- [ ] App still shows Pro access (until expiration)
- [ ] User can still use Pro features
- [ ] No immediate change to app experience

### ✅ During Cancellation Period

- [ ] App correctly shows expiration date
- [ ] Subscription status visible in app
- [ ] User can reactivate if desired
- [ ] No billing occurs after cancellation

### ✅ After Expiration

- [ ] Pro features locked in app
- [ ] Paywall appears when accessing Pro content
- [ ] User downgraded to free tier
- [ ] Subscription status shows as expired
- [ ] User can purchase again

### ✅ App Behavior

- [ ] Subscription status updates in real-time
- [ ] No crashes or errors during cancellation
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] User feedback is clear

---

## Common Issues & Solutions

### Issue: Can't See Subscription in Settings

**Solution:**
- Make sure you're signed in with sandbox account (iOS)
- Verify subscription was actually purchased
- Check RevenueCat dashboard for subscription status
- Wait a few minutes for sync

### Issue: Cancellation Not Reflecting in App

**Solution:**
- Check RevenueCat dashboard for status
- Refresh customer info in app
- Verify RevenueCat SDK is syncing correctly
- Check network connectivity

### Issue: Subscription Expires Immediately

**Solution:**
- This is normal for sandbox/test subscriptions
- Sandbox subscriptions have short expiration times
- Use StoreKit configuration for longer test periods (iOS)
- Check Play Console settings (Android)

### Issue: Can't Cancel Subscription

**Solution:**
- Verify you're using the correct account
- Check if subscription is already cancelled
- Try canceling through website instead of app
- Verify store account permissions

---

## Quick Testing Checklist

### iOS Sandbox Testing

- [ ] Sandbox tester account created
- [ ] Signed out of real Apple ID
- [ ] Made test purchase with sandbox account
- [ ] Verified Pro features unlocked
- [ ] Canceled through Settings → Subscriptions
- [ ] Verified cancellation status in app
- [ ] Verified status in RevenueCat dashboard
- [ ] Tested expiration behavior

### Android Testing

- [ ] Test account added to device
- [ ] Made test purchase
- [ ] Verified Pro features unlocked
- [ ] Canceled through Play Store
- [ ] Verified cancellation status
- [ ] Checked RevenueCat dashboard
- [ ] Tested expiration

### RevenueCat Verification

- [ ] Customer appears in dashboard
- [ ] Subscription status correct
- [ ] Events logged correctly
- [ ] Entitlement status updates
- [ ] Expiration date visible

---

## Tips for Efficient Testing

1. **Use Multiple Test Accounts:**
   - Create several sandbox/test accounts
   - Test different scenarios with different accounts
   - Keep track of which account is for which test

2. **Monitor RevenueCat Dashboard:**
   - Keep dashboard open during testing
   - Watch for real-time status updates
   - Check Events tab for detailed logs

3. **Test Edge Cases:**
   - Cancel immediately after purchase
   - Cancel right before expiration
   - Test network issues during cancellation
   - Test app restart after cancellation

4. **Document Issues:**
   - Note any bugs or unexpected behavior
   - Screenshot error messages
   - Check RevenueCat logs for errors

5. **Test Both Platforms:**
   - iOS and Android handle subscriptions differently
   - Test cancellation flow on both
   - Verify consistent behavior

---

## Resources

- [Apple Sandbox Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [Google Play Testing Guide](https://developer.android.com/google/play/billing/test)
- [RevenueCat Testing Documentation](https://www.revenuecat.com/docs/testing)
- [StoreKit Configuration File](https://developer.apple.com/documentation/storekit/in-app_purchase/creating_a_storekit_configuration_file)

---

## Support

If you encounter issues during testing:

1. Check RevenueCat dashboard for error logs
2. Verify products are correctly configured
3. Ensure test accounts are set up properly
4. Check app logs for RevenueCat errors
5. Review RevenueCat documentation

For app-specific issues, check:
- `services/revenueCatService.ts` for purchase logic
- `context/RevenueCatContext.tsx` for state management
- `components/CustomerCenter.tsx` for cancellation UI

