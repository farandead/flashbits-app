# App Store Connect - In-App Purchase Setup Guide

This guide walks you through completing the In-App Purchase (IAP) setup in App Store Connect for App Store submission.

## Prerequisites

- ✅ Subscriptions already created in App Store Connect
- ✅ App Store Connect account access
- ✅ App version ready for submission

## Step-by-Step Instructions

### 1. Access Your Subscriptions

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → Select your app (**flashbits**)
3. In the left sidebar, click **Subscriptions** (under Features)
4. You should see your subscription groups (e.g., "Pro Subscription")

### 2. Open Each Subscription Product

1. Click on your subscription group
2. You'll see your subscription products (e.g., "Monthly Pro", "Yearly Pro")
3. Click on each subscription product to open its details page

### 3. Complete Required Metadata

For each subscription product, ensure the following are completed:

#### **Subscription Information**
- ✅ **Subscription Name**: Clear, descriptive name (e.g., "Monthly Pro", "Yearly Pro")
- ✅ **Subscription ID**: Your product identifier (e.g., `com.flashbits.pro.monthly`, `com.flashbits.pro.yearly`)
- ✅ **Subscription Group**: Should be assigned to a group
- ✅ **Duration**: Set correctly (1 month, 1 year, etc.)

#### **Pricing and Availability**
- ✅ **Price**: Set for all territories or specific regions
- ✅ **Availability**: Enabled for the countries you want to support
- ✅ **Free Trial**: If offering a 7-day trial, ensure it's configured here

#### **Localization**
- ✅ **Display Name**: User-facing name (e.g., "Pro Monthly", "Pro Yearly")
- ✅ **Description**: Clear description of what the subscription includes
  - Example: "Unlock unlimited access to all coding interview questions, track your progress, and access premium features."
- ✅ **Review Notes** (optional but recommended): Additional context for App Review

#### **Subscription Details**
- ✅ **Subscription Duration**: Correctly set (1 month, 1 year)
- ✅ **Introductory Offers**: If you have a free trial, configure it here
- ✅ **Promotional Offers**: Optional, for special promotions

### 4. Upload App Review Screenshot (REQUIRED)

**This is critical - Apple requires a screenshot for each IAP/subscription.**

1. In the subscription product page, scroll to **App Review Information**
2. Click **App Review Screenshot**
3. Upload a screenshot showing:
   - The subscription/paywall screen in your app
   - The subscription name and price clearly visible
   - The purchase button visible
   - Should be from the actual app (not a mockup)

**Screenshot Requirements:**
- Format: PNG or JPEG
- Size: Match your app's device size (e.g., iPhone 14 Pro Max: 1290 x 2796)
- Content: Must show the actual subscription screen from your app
- Quality: Clear, readable text

**How to Capture:**
1. Run your app on a device or simulator
2. Navigate to the paywall/subscription screen
3. Take a screenshot (iOS: Power + Volume Up, Simulator: Cmd + S)
4. Upload this screenshot to App Store Connect

### 5. Submit IAP for Review

1. After completing all metadata and uploading the screenshot, scroll to the top of the subscription product page
2. Click **Submit for Review** button (top right)
3. Review the checklist to ensure everything is complete
4. Confirm submission

**Status should change to:**
- ✅ **Submitted** or **In Review** (not "Ready to Submit")

### 6. Associate IAPs with App Version

**Important:** IAPs must be associated with the app version you're submitting.

1. Go back to your app's main page in App Store Connect
2. Navigate to **App Store** tab → **Version** (or **+ Version** if creating new)
3. Scroll down to **In-App Purchases** section
4. Click **+** next to "In-App Purchases"
5. Select your subscription products (Monthly Pro, Yearly Pro)
6. Click **Done**

**Alternative Method:**
- When submitting your app version for review, you'll see an option to include IAPs
- Make sure all your subscriptions are selected in the submission form

### 7. Verify IAP Status

Before submitting your app:

1. Go to **Subscriptions** → Your subscription group
2. Check each subscription product:
   - Status should be **Submitted** or **In Review**
   - All metadata should show as complete (green checkmarks)
   - App Review Screenshot should be uploaded
3. Go to your **App Version** page:
   - Verify IAPs are listed in the "In-App Purchases" section
   - They should be associated with the version you're submitting

## Common Issues & Solutions

### Issue: "Ready to Submit" Status
**Solution:** 
- Ensure all required fields are filled
- Upload the App Review Screenshot (this is often the missing piece)
- Click "Submit for Review" button

### Issue: IAP Not Showing in App Version
**Solution:**
- Manually add IAPs to the app version using the "+" button
- Ensure IAP status is "Submitted" or "In Review" (not "Ready to Submit")
- Save the app version after adding IAPs

### Issue: Missing App Review Screenshot
**Solution:**
- This is REQUIRED - you cannot submit without it
- Take a screenshot of your actual paywall screen
- Upload it in the subscription product's "App Review Information" section

### Issue: Pricing Not Set
**Solution:**
- Go to "Pricing and Availability"
- Set prices for at least your primary market (e.g., United States)
- You can set prices for all territories or specific regions

## Checklist Before App Submission

- [ ] All subscription products have complete metadata
- [ ] App Review Screenshot uploaded for each subscription
- [ ] Subscription status is **Submitted** or **In Review** (not "Ready to Submit")
- [ ] Subscriptions are associated with the app version you're submitting
- [ ] Pricing is set for your target markets
- [ ] Free trial (if applicable) is configured correctly
- [ ] Subscription descriptions are clear and accurate

## Your Subscription Product IDs

Based on your code, your subscription identifiers are:
- **Monthly**: `com.flashbits.pro.monthly`
- **Yearly**: `com.flashbits.pro.yearly`

Make sure these match exactly in App Store Connect.

## Additional Resources

- [Apple: In-App Purchase Configuration](https://developer.apple.com/documentation/storekit/in-app_purchase/configuring_in-app_purchases)
- [Apple: App Store Connect Help - Subscriptions](https://help.apple.com/app-store-connect/#/dev84a20166f)
- [Apple: App Review Guidelines - Section 2.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)

## Notes

- IAPs can be submitted independently of your app, but they must be approved before your app can be approved
- It's recommended to submit IAPs a few days before submitting your app
- If IAPs are rejected, you'll need to fix them and resubmit before your app can be approved
- The App Review Screenshot is mandatory - Apple uses it to verify your subscription implementation

