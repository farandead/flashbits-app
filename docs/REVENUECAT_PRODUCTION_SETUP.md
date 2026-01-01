# RevenueCat Production Setup Guide

Complete guide to set up RevenueCat for production, including API keys, products, and entitlements.

## 📋 Prerequisites

- RevenueCat account (sign up at [revenuecat.com](https://www.revenuecat.com))
- App Store Connect account (for iOS)
- Google Play Console account (for Android)
- Your app already configured in App Store Connect / Google Play Console

## 🔑 Step 1: Get Your Production API Keys

### For iOS:

1. **Log in to RevenueCat Dashboard**
   - Go to [app.revenuecat.com](https://app.revenuecat.com)
   - Select your project (or create a new one)

2. **Navigate to API Keys**
   - Click on **Project Settings** (gear icon in top right)
   - Go to **API Keys** section
   - You'll see two keys:
     - **Public SDK Key (iOS)** - This is your production key
     - **Public SDK Key (Android)** - For Android production

3. **Copy Your Keys**
   - Copy the iOS key (starts with `appl_`)
   - Copy the Android key (starts with `goog_`)
   - **Important**: These are the same keys for both sandbox and production. RevenueCat automatically handles the environment.

### Understanding RevenueCat Keys:

- **One Key for All Environments**: RevenueCat uses the same API key for sandbox and production
- **Environment Detection**: RevenueCat automatically detects if you're in sandbox or production based on:
  - iOS: The app's build configuration (Debug vs Release)
  - Android: The app's signing configuration
- **No Separate Keys Needed**: Unlike some services, you don't need separate sandbox/production keys

## 🏪 Step 2: Set Up Products in App Store Connect (iOS)

### 2.1 Create Subscription Products

1. **Go to App Store Connect**
   - Navigate to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Select your app
   - Go to **Features** → **In-App Purchases**

2. **Create Monthly Subscription**
   - Click **+** to create new subscription
   - Select **Auto-Renewable Subscription**
   - Fill in:
     - **Reference Name**: `Monthly Pro Subscription`
     - **Product ID**: `monthly` (or your custom ID)
     - **Subscription Group**: Create new group (e.g., "Pro Subscription")
     - **Subscription Duration**: 1 Month
     - **Price**: Set your price (e.g., £9.99)
     - **Localizations**: Add description in all languages

3. **Create Yearly Subscription**
   - Repeat above steps
   - **Product ID**: `yearly` (or your custom ID)
   - **Subscription Duration**: 1 Year
   - **Price**: Set your price (e.g., £99.99)

4. **Submit for Review**
   - Both products need to be submitted and approved by Apple
   - This can take 24-48 hours

### 2.2 Important Product IDs

Make sure your product IDs match what's in your code:
- Check `services/revenueCatService.ts` for product identifiers
- Current setup uses: `monthly` and `yearly`

## 📱 Step 3: Set Up Products in Google Play Console (Android)

### 3.1 Create Subscription Products

1. **Go to Google Play Console**
   - Navigate to [play.google.com/console](https://play.google.com/console)
   - Select your app
   - Go to **Monetize** → **Products** → **Subscriptions**

2. **Create Monthly Subscription**
   - Click **Create subscription**
   - Fill in:
     - **Product ID**: `monthly` (must match iOS)
     - **Name**: `Monthly Pro Subscription`
     - **Billing period**: 1 month
     - **Price**: Set your price
     - **Free trial**: Optional (you can set 7 days here)
     - **Description**: Add description

3. **Create Yearly Subscription**
   - Repeat above steps
   - **Product ID**: `yearly` (must match iOS)
   - **Billing period**: 1 year
   - **Price**: Set your price

4. **Activate Products**
   - Products must be activated before they can be used
   - Click **Activate** on each product

## 🎯 Step 4: Configure RevenueCat Dashboard

### 4.1 Link Your App Stores

1. **Link App Store Connect**
   - Go to RevenueCat Dashboard → **Project Settings** → **Integrations**
   - Click **Connect** next to App Store Connect
   - Follow the authentication flow
   - Select your app

2. **Link Google Play Console**
   - Click **Connect** next to Google Play
   - Follow the authentication flow
   - Select your app

### 4.2 Create Entitlement

1. **Go to Entitlements**
   - Navigate to **Entitlements** in the left sidebar
   - Click **+ New**

2. **Create "pro" Entitlement**
   - **Identifier**: `pro` (must match `ENTITLEMENT_ID` in your code)
   - **Display Name**: `Pro Access`
   - **Description**: `Full access to Pro features`

3. **Save the Entitlement**

### 4.3 Create Products in RevenueCat

1. **Go to Products**
   - Navigate to **Products** in the left sidebar
   - Click **+ New**

2. **Add Monthly Product**
   - **Identifier**: `monthly`
   - **Type**: Subscription
   - **Store**: App Store Connect (iOS) or Google Play (Android)
   - **App Store Product ID**: `monthly` (must match App Store Connect)
   - **Attach to Entitlement**: Select `pro`
   - **Save**

3. **Add Yearly Product**
   - **Identifier**: `yearly`
   - **Type**: Subscription
   - **Store**: App Store Connect (iOS) or Google Play (Android)
   - **App Store Product ID**: `yearly` (must match App Store Connect)
   - **Attach to Entitlement**: Select `pro`
   - **Save**

### 4.4 Create Offering

1. **Go to Offerings**
   - Navigate to **Offerings** in the left sidebar
   - Click **+ New**

2. **Create Default Offering**
   - **Identifier**: `default` (or leave as default)
   - **Display Name**: `Pro Subscription`
   - **Description**: `Choose your Pro plan`

3. **Add Packages**
   - Click **Add Package**
   - Select your `monthly` product
   - Click **Add Package** again
   - Select your `yearly` product

4. **Set as Current Offering**
   - Toggle **Set as current offering** to ON
   - This makes it the default offering your app will fetch

5. **Save Offering**

## ⚙️ Step 5: Update Your Project Configuration

### 5.1 Update `eas.json`

Update your `eas.json` file with the production API key:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_REVENUECAT_API_KEY": "appl_YOUR_SANDBOX_KEY_HERE"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_REVENUECAT_API_KEY": "appl_YOUR_SANDBOX_KEY_HERE"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_REVENUECAT_API_KEY": "appl_YOUR_PRODUCTION_KEY_HERE"
      }
    }
  }
}
```

**Note**: RevenueCat uses the same key for sandbox and production, but you can use different keys if you have separate projects.

### 5.2 Create `.env` File (Optional for Local Development)

Create a `.env` file in your project root:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_YOUR_KEY_HERE
```

Add to `.gitignore`:
```
.env
.env.local
```

### 5.3 Verify Product Identifiers

Check `services/revenueCatService.ts` to ensure product IDs match:

```typescript
// These should match your App Store Connect / Google Play product IDs
export const PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
};

// This should match your RevenueCat entitlement identifier
export const ENTITLEMENT_ID = 'pro';
```

## 🧪 Step 6: Testing

### 6.1 Test in Sandbox (Development)

1. **Use Test Account**
   - Create a sandbox tester in App Store Connect
   - Sign out of your Apple ID on the device
   - Build and run your app
   - When prompted, sign in with sandbox tester account

2. **Test Purchase Flow**
   - Try purchasing a subscription
   - Verify it shows in RevenueCat dashboard
   - Check entitlement is granted

### 6.2 Test in Production (TestFlight)

1. **Build for TestFlight**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to TestFlight**
   ```bash
   eas submit --platform ios
   ```

3. **Test with Real Account**
   - Install from TestFlight
   - Use a real Apple ID (not sandbox)
   - Test purchase flow
   - **Note**: TestFlight uses production environment

### 6.3 Verify in RevenueCat Dashboard

1. **Check Customer Info**
   - Go to **Customers** in RevenueCat dashboard
   - Search for your test user
   - Verify subscription status
   - Check entitlement is active

2. **Check Events**
   - Go to **Events** tab
   - Verify purchase events are logged
   - Check for any errors

## 🚀 Step 7: Production Deployment

### 7.1 Final Checklist

Before going to production:

- [ ] Products created and approved in App Store Connect
- [ ] Products created and activated in Google Play Console
- [ ] Entitlement created in RevenueCat (`pro`)
- [ ] Products linked to entitlement in RevenueCat
- [ ] Offering created and set as current
- [ ] API key updated in `eas.json` for production profile
- [ ] Product IDs match between stores and code
- [ ] Tested in sandbox environment
- [ ] Tested in TestFlight (iOS) or Internal Testing (Android)

### 7.2 Build for Production

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### 7.3 Submit to Stores

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

## 🔍 Troubleshooting

### No Offerings Found

**Problem**: App can't fetch offerings from RevenueCat

**Solutions**:
- Verify API key is correct
- Check offering is set as "current" in RevenueCat dashboard
- Ensure products are attached to offering
- Verify network connectivity
- Check RevenueCat dashboard for errors

### Purchase Fails

**Problem**: Purchase doesn't complete

**Solutions**:
- Verify products exist in App Store Connect / Google Play
- Check product IDs match exactly
- Ensure products are approved/activated
- Verify test account is set up correctly
- Check RevenueCat dashboard for error logs

### Entitlement Not Active

**Problem**: User purchased but doesn't have Pro access

**Solutions**:
- Verify entitlement identifier matches (`pro`)
- Check products are linked to entitlement
- Verify purchase completed successfully
- Check RevenueCat dashboard → Customer → Entitlements
- Ensure `syncSubscriptionToFirestore()` is called

### Wrong Environment

**Problem**: Testing production purchases in development

**Solutions**:
- Use sandbox test account for development
- TestFlight automatically uses production
- Check App Store Connect for sandbox tester setup
- Verify you're signed out of real Apple ID when testing sandbox

## 📚 Additional Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Guide](https://support.google.com/googleplay/android-developer)
- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [RevenueCat iOS Setup](https://www.revenuecat.com/docs/getting-started/installation/ios)
- [RevenueCat Android Setup](https://www.revenuecat.com/docs/getting-started/installation/android)

## 🎯 Quick Reference

### Current Configuration in Your App

- **Entitlement ID**: `pro` (in `services/revenueCatService.ts`)
- **Product IDs**: `monthly`, `yearly`
- **API Key Location**: `eas.json` → `env.EXPO_PUBLIC_REVENUECAT_API_KEY`
- **Service File**: `services/revenueCatService.ts`
- **Context**: `context/RevenueCatContext.tsx`

### RevenueCat Dashboard Checklist

- [ ] Project created
- [ ] App Store Connect linked
- [ ] Google Play Console linked
- [ ] Entitlement `pro` created
- [ ] Product `monthly` created and linked to `pro`
- [ ] Product `yearly` created and linked to `pro`
- [ ] Offering created with both products
- [ ] Offering set as "current"
- [ ] API key copied

### App Store Connect Checklist

- [ ] Subscription group created
- [ ] Product `monthly` created and submitted
- [ ] Product `yearly` created and submitted
- [ ] Products approved by Apple
- [ ] Sandbox testers configured

### Google Play Console Checklist

- [ ] Product `monthly` created and activated
- [ ] Product `yearly` created and activated
- [ ] Test accounts configured (if needed)

---

**Need Help?** Check RevenueCat's [support documentation](https://www.revenuecat.com/docs) or their [community forum](https://community.revenuecat.com/).

