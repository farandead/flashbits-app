# App Store Connect Product Setup Guide

This guide will help you set up proper App Store Connect product identifiers for your subscriptions.

## 📋 Prerequisites

- App Store Connect account access
- App registered in App Store Connect with bundle ID: `com.flashbits.app`
- RevenueCat account and dashboard access

## 🎯 Product IDs to Create

You need to create two Auto-Renewable Subscriptions in App Store Connect:

1. **Monthly Subscription**
   - Product ID: `com.flashbits.pro.monthly`
   
2. **Yearly Subscription**
   - Product ID: `com.flashbits.pro.yearly`

**Note:** These product IDs are already created in your App Store Connect account.

## 📱 Step 1: Create Products in App Store Connect

### 1.1 Access App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Navigate to **My Apps** → Select your **Flashbits** app

### 1.2 Create Monthly Subscription

1. Go to **Features** tab → **In-App Purchases**
2. Click the **+** button to create a new in-app purchase
3. Select **Auto-Renewable Subscription**
4. Fill in the details:

   **Subscription Information:**
   - **Reference Name**: `Flashbits Pro Monthly`
   - **Product ID**: `com.flashbits.pro.monthly` ⚠️ **Must be exact**
   - **Subscription Group**: Create a new group called "Flashbits Pro" (or use existing)

   **Subscription Duration:**
   - Select **1 Month**

   **Price:**
   - Set your monthly price (e.g., $4.99/month)
   - Select all territories or specific ones

   **Localization:**
   - Add display name: "Flashbits Pro Monthly"
   - Add description: "Unlimited access to all coding interview questions and features"

5. Click **Save**

### 1.3 Create Yearly Subscription

1. Click the **+** button again
2. Select **Auto-Renewable Subscription**
3. Fill in the details:

   **Subscription Information:**
   - **Reference Name**: `Flashbits Pro Yearly`
   - **Product ID**: `com.flashbits.pro.yearly` ⚠️ **Must be exact**
   - **Subscription Group**: Select the same group as monthly ("Flashbits Pro")

   **Subscription Duration:**
   - Select **1 Year**

   **Price:**
   - Set your yearly price (e.g., $39.99/year)
   - Make sure it's a better value than monthly (typically 2 months free)

   **Localization:**
   - Add display name: "Flashbits Pro Yearly"
   - Add description: "Unlimited access to all coding interview questions and features. Best value!"

4. Click **Save**

### 1.4 Submit for Review (if needed)

- If your app is already live, you may need to submit these products for review
- If your app is in development, products are available immediately for sandbox testing

## 🔗 Step 2: Import Products into RevenueCat

### 2.1 Access RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Sign in to your account
3. Select your **Flashbits** project

### 2.2 Add Products

1. Navigate to **Products** in the left sidebar
2. Click **+ Add Product** or **Import from Store**

3. **For iOS:**
   - Select **App Store**
   - RevenueCat will automatically detect products from App Store Connect
   - Select both:
     - `com.flashbits.pro.monthly`
     - `com.flashbits.pro.yearly`
   - Click **Import**

4. **For Android (if applicable):**
   - Select **Google Play**
   - Create products with matching IDs or import from Play Console

### 2.3 Verify Product Configuration

1. Go to **Products** → Verify both products are listed:
   - ✅ `com.flashbits.pro.monthly`
   - ✅ `com.flashbits.pro.yearly`

2. Check that products are linked to your entitlement:
   - Go to **Entitlements** → "flashbits Pro"
   - Verify both products are attached

## 📦 Step 3: Create Packages in RevenueCat Offering

### 3.1 Create Packages

1. Go to **Offerings** → Select your **Current** offering (or create one)
2. Click **+ Add Package**

3. **Create Monthly Package:**
   - **Package Identifier**: `monthly` (can be different from product ID)
   - **Product**: Select `com.flashbits.pro.monthly`
   - Click **Save**

4. **Create Yearly Package:**
   - **Package Identifier**: `yearly` (can be different from product ID)
   - **Product**: Select `com.flashbits.pro.yearly`
   - Click **Save**

### 3.2 Verify Offering Configuration

Your offering should now have:
- ✅ Package: `monthly` → Product: `com.flashbits.pro.monthly`
- ✅ Package: `yearly` → Product: `com.flashbits.pro.yearly`

## ✅ Step 4: Verify Configuration

### 4.1 Check Bundle ID Match

Verify your app's bundle ID matches:
- **App Store Connect**: `com.flashbits.app`
- **app.json**: `com.flashbits.app` ✅ (already correct)

### 4.2 Test in App

1. Build and run your app on a **physical iOS device** (simulator doesn't support real payments)
2. Sign in with a **sandbox test account**
3. Open the paywall
4. Try to purchase a subscription
5. You should see the native StoreKit payment UI with your product IDs

### 4.3 Check Logs

In your app logs, you should see:
```
[RevenueCat] Found matching package for monthly: monthly
[RevenueCat] Purchasing package: monthly
```

The package identifier (`monthly`) is what RevenueCat uses internally, but it's linked to the real product ID (`com.flashbits.pro.monthly`) from App Store Connect.

## 🔍 Troubleshooting

### Product Not Found

**Error**: "No packages available" or "Product not found"

**Solutions:**
1. Verify product IDs in App Store Connect match exactly:
   - ✅ `com.flashbits.pro.monthly`
   - ✅ `com.flashbits.pro.yearly`
2. Check RevenueCat dashboard → Products → Verify products are imported
3. Verify products are linked to your entitlement
4. Check offering has packages added

### Package Matching Issues

**Error**: "Package for monthly plan not found"

**Solutions:**
1. Check RevenueCat offering → Verify packages exist
2. Check package identifiers contain keywords:
   - Monthly: `monthly` or `month`
   - Yearly: `yearly`, `annual`, or `year`
3. Check app logs for available package identifiers

### Sandbox Testing

**Issue**: Can't test purchases

**Solutions:**
1. Create sandbox test account in App Store Connect → Users and Access → Sandbox Testers
2. Sign out of your real Apple ID on the test device
3. Sign in with sandbox account when prompted
4. Use sandbox account to test purchases

## 📝 Summary Checklist

- [ ] Created `com.flashbits.pro.monthly` in App Store Connect ✅
- [ ] Created `com.flashbits.pro.yearly` in App Store Connect ✅
- [ ] Both products are Auto-Renewable Subscriptions
- [ ] Products are in the same subscription group
- [ ] Products imported into RevenueCat
- [ ] Products linked to "flashbits Pro" entitlement
- [ ] Packages created in RevenueCat offering:
  - [ ] Package `monthly` → Product `com.flashbits.pro.monthly`
  - [ ] Package `yearly` → Product `com.flashbits.pro.yearly`
- [ ] Offering set as "Current" in RevenueCat
- [ ] Bundle ID matches: `com.flashbits.app`
- [ ] Tested with sandbox account on physical device

## 🎉 Next Steps

Once products are set up:

1. **Test Purchases**: Use sandbox accounts to test the full purchase flow
2. **Monitor**: Check RevenueCat dashboard for purchase events
3. **Production**: When ready, switch to production API key in RevenueCat
4. **Submit App**: Submit your app with in-app purchases for App Store review

## 📚 Additional Resources

- [App Store Connect In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [RevenueCat Products Documentation](https://docs.revenuecat.com/docs/entitlements)
- [RevenueCat Offerings Documentation](https://docs.revenuecat.com/docs/offerings)

---

**Important Notes:**

- Product IDs are **case-sensitive** and must match exactly
- Package identifiers in RevenueCat can be different from product IDs
- The app matches packages by keywords, so package IDs like `monthly` or `yearly` work fine
- Always test with sandbox accounts before going live
- Products must be approved in App Store Connect before they work in production

