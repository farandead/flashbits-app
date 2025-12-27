# iOS Capabilities & Certificates Setup Guide

This guide covers all the iOS capabilities and certificates your flashbits app needs based on the features you're using.

## Required Capabilities

Based on your `app.json` and dependencies, your app needs these capabilities:

### 1. ✅ Sign In with Apple
**Required for**: Apple Sign In authentication

**Status**: Already configured in `app.json`
```json
"usesAppleSignIn": true
```

**Setup in Apple Developer**:
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Identifiers** → Select your App ID (`com.flashbits.app`)
4. Enable **"Sign In with Apple"** capability
5. Click **"Save"**

**Additional Setup Required**:
- Create a **Services ID** for Firebase (if using Firebase Auth with Apple)
- Create a **Key** for Sign In with Apple (if using Firebase Auth)

### 2. ✅ Push Notifications
**Required for**: Remote notifications (expo-notifications)

**Status**: Already configured in `app.json`
```json
"infoPlist": {
  "UIBackgroundModes": ["remote-notification"]
}
```

**Setup in Apple Developer**:
1. Go to **Identifiers** → Select your App ID (`com.flashbits.app`)
2. Enable **"Push Notifications"** capability
3. Click **"Save"**

**APNs Certificate Setup**:
1. Go to **Certificates** → **"+"** → **Apple Push Notification service SSL (Sandbox & Production)**
2. Select your App ID (`com.flashbits.app`)
3. Upload a Certificate Signing Request (CSR):
   - On Mac: Open **Keychain Access** → **Certificate Assistant** → **Request a Certificate**
   - Enter your email and name
   - Save CSR file
4. Upload the CSR and download the certificate
5. **Note**: EAS Build can handle this automatically, but you can set it up manually if needed

### 3. ✅ Background Modes
**Required for**: Remote notifications in background

**Status**: Already configured in `app.json`
```json
"UIBackgroundModes": ["remote-notification"]
```

**Setup in Apple Developer**:
1. Go to **Identifiers** → Select your App ID (`com.flashbits.app`)
2. Enable **"Background Modes"** capability
3. Check **"Remote notifications"**
4. Click **"Save"**

**Note**: This is automatically enabled when you enable Push Notifications.

## Optional Capabilities (Not Currently Used)

These capabilities are **NOT** required for your current app:

- ❌ **Associated Domains**: Not needed (unless you add universal links)
- ❌ **App Groups**: Not needed (unless sharing data between apps)
- ❌ **In-App Purchase**: Not needed (unless you add subscriptions)
- ❌ **Keychain Sharing**: Not needed (unless sharing keychain between apps)
- ❌ **Siri**: Not needed
- ❌ **Wallet**: Not needed

## Complete Setup Checklist

### Step 1: Register App ID in Apple Developer

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Identifiers** → **"+"** → **App IDs**
4. Select **"App"** → **Continue**
5. Fill in:
   - **Description**: flashbits
   - **Bundle ID**: `com.flashbits.app` (must match exactly)
6. Enable capabilities:
   - ✅ **Sign In with Apple**
   - ✅ **Push Notifications**
   - ✅ **Background Modes** (auto-enabled with Push Notifications)
7. Click **"Continue"** → **"Register"**

### Step 2: Configure Sign In with Apple (For Firebase)

If you're using Firebase Authentication with Apple Sign In:

#### 2.1 Create Services ID

1. Go to **Identifiers** → **"+"** → **Services IDs**
2. Fill in:
   - **Description**: flashbits Sign In
   - **Identifier**: `com.flashbits.signin` (or similar)
3. Enable **"Sign In with Apple"**
4. Click **"Configure"**
5. Add domains:
   - **Primary App ID**: Select `com.flashbits.app`
   - **Domains and Subdomains**: `flashprep-11c85.firebaseapp.com`
   - **Return URLs**: 
     - `https://flashprep-11c85.firebaseapp.com/__/auth/handler`
6. Click **"Save"** → **"Continue"** → **"Register"**

#### 2.2 Create Key for Sign In with Apple

1. Go to **Keys** → **"+"**
2. Fill in:
   - **Key Name**: flashbits Sign In Key
3. Enable **"Sign In with Apple"**
4. Click **"Configure"** → Select your Services ID → **"Save"**
5. Click **"Continue"** → **"Register"**
6. **IMPORTANT**: Download the `.p8` key file (you can only download once!)
7. Note the **Key ID**

#### 2.3 Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Authentication** → **Sign-in method** → **Apple**
3. Enable Apple Sign In
4. Enter:
   - **Services ID**: `com.flashbits.signin` (from Step 2.1)
   - **Apple Team ID**: Your Team ID (from Apple Developer)
   - **Key ID**: From Step 2.2
   - **Private Key**: Upload the `.p8` file from Step 2.2

### Step 3: Configure Push Notifications

#### 3.1 APNs Certificate (EAS Can Handle This)

**Option A: Let EAS Handle It (Recommended)**
- EAS Build automatically generates APNs certificates
- No manual setup needed
- Just ensure Push Notifications capability is enabled in App ID

**Option B: Manual Setup**

1. Go to **Certificates** → **"+"** → **Apple Push Notification service SSL (Sandbox & Production)**
2. Select your App ID (`com.flashbits.app`)
3. Upload CSR (Certificate Signing Request):
   ```bash
   # On Mac, use Keychain Access:
   # Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   ```
4. Download the certificate
5. Upload to EAS (if not using automatic setup):
   ```bash
   eas credentials
   ```

#### 3.2 Configure Firebase Cloud Messaging (FCM)

If using Firebase for push notifications:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Project Settings** → **Cloud Messaging**
3. Upload APNs certificate or APNs Auth Key:
   - **Option 1**: Upload APNs Certificate (from Step 3.1)
   - **Option 2**: Use APNs Auth Key (recommended, easier to manage)
4. For APNs Auth Key:
   - Go to Apple Developer → **Keys**
   - Create key with **Apple Push Notifications service (APNs)** enabled
   - Download `.p8` file
   - Upload to Firebase with Key ID and Team ID

### Step 4: Verify Configuration

#### 4.1 Check App ID Capabilities

1. Go to **Identifiers** → Select `com.flashbits.app`
2. Verify these are enabled:
   - ✅ Sign In with Apple
   - ✅ Push Notifications
   - ✅ Background Modes (Remote notifications)

#### 4.2 Verify app.json Matches

Ensure your `app.json` has:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.flashbits.app",
      "usesAppleSignIn": true,
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

## EAS Build Automatic Setup

When you run your first build with EAS:

```bash
eas build --platform ios --profile production
```

EAS will:
1. ✅ Automatically create distribution certificate
2. ✅ Generate provisioning profile with all capabilities
3. ✅ Set up APNs certificates (if needed)
4. ✅ Configure everything based on your `app.json`

**You'll be prompted to**:
- Enter your Apple ID
- Select your team
- EAS handles the rest automatically

## Manual Certificate Management (If Needed)

If you prefer manual setup or need to troubleshoot:

```bash
# Manage credentials
eas credentials

# Options:
# - iOS: Set up credentials
# - iOS: Manage credentials
# - iOS: Remove credentials
```

## Troubleshooting

### Build Fails: "Missing Capability"

**Error**: `Missing required capability: Sign In with Apple`

**Fix**:
1. Go to Apple Developer → Identifiers
2. Select your App ID
3. Enable the missing capability
4. Save and rebuild

### Build Fails: "Invalid Provisioning Profile"

**Error**: Provisioning profile doesn't include required capabilities

**Fix**:
1. Delete old provisioning profile in Apple Developer
2. Let EAS regenerate it: `eas credentials`
3. Rebuild

### Push Notifications Not Working

**Check**:
1. ✅ Push Notifications enabled in App ID
2. ✅ APNs certificate/key configured in Firebase (if using FCM)
3. ✅ Background Modes enabled
4. ✅ User granted notification permissions in app

### Apple Sign In Not Working

**Check**:
1. ✅ `usesAppleSignIn: true` in `app.json`
2. ✅ Sign In with Apple enabled in App ID
3. ✅ Services ID created and configured (if using Firebase)
4. ✅ Key created and uploaded to Firebase (if using Firebase)

## Summary of Required Setup

### In Apple Developer Portal:

1. **App ID** (`com.flashbits.app`) with:
   - ✅ Sign In with Apple
   - ✅ Push Notifications
   - ✅ Background Modes (Remote notifications)

2. **Services ID** (for Firebase Apple Sign In):
   - Identifier: `com.flashbits.signin`
   - Sign In with Apple enabled
   - Domains configured

3. **Key** (for Firebase Apple Sign In):
   - Sign In with Apple enabled
   - `.p8` file downloaded and uploaded to Firebase

4. **APNs Certificate/Key** (for Push Notifications):
   - EAS can handle automatically
   - Or create manually and upload to Firebase

### In Your Code:

✅ Already configured in `app.json`:
- Bundle ID: `com.flashbits.app`
- `usesAppleSignIn: true`
- Background Modes: `["remote-notification"]`

### In Firebase Console:

- Apple Sign In configured (if using Firebase Auth)
- APNs certificate/key uploaded (if using FCM)

## Quick Reference

**App ID**: `com.flashbits.app`
**Required Capabilities**:
- Sign In with Apple
- Push Notifications
- Background Modes (Remote notifications)

**EAS Build**: Handles certificates automatically ✅
**Manual Setup**: Only needed for Firebase configuration

## Next Steps

1. ✅ Register App ID with required capabilities
2. ✅ Set up Services ID and Key (for Firebase Apple Sign In)
3. ✅ Configure Firebase with Apple Sign In credentials
4. ✅ Build your app: `eas build --platform ios --profile production`
5. ✅ EAS will handle certificates automatically!

Your app is already configured correctly in `app.json` - you just need to enable the capabilities in Apple Developer Portal! 🚀

