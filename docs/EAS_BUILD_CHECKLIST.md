# EAS Build Checklist - iOS Development Profile

## ✅ Pre-Build Verification

### 1. EAS CLI Setup
- [x] EAS CLI installed and logged in
- [x] Account: `deadshotz`
- [x] Project ID: `089e5e90-e324-4ebf-83d9-187ca241a71f`

### 2. Configuration Files

#### `eas.json` - Development Profile
```json
{
  "development": {
    "node": "22.13.1", ✅
    "developmentClient": true, ✅
    "distribution": "internal", ✅
    "ios": {
      "simulator": false ✅
    }
  }
}
```

**Status**: ✅ All settings correct for development build

#### `app.json` - iOS Configuration
```json
{
  "ios": {
    "bundleIdentifier": "com.flashbits.app", ✅
    "appleTeamId": "P4U95U8X93", ✅
    "buildNumber": "1", ✅
    "usesAppleSignIn": true, ✅
    "googleServicesFile": "./GoogleService-Info.plist" ✅
  }
}
```

**Status**: ✅ All iOS settings configured correctly

### 3. Environment Variables

All required environment variables are set in `eas.json`:
- [x] `EXPO_PUBLIC_FIREBASE_API_KEY`
- [x] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [x] `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- [x] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [x] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [x] `EXPO_PUBLIC_FIREBASE_APP_ID`
- [x] `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [x] `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- [x] `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- [x] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [x] `EXPO_PUBLIC_CLOUD_FUNCTION_URL`
- [x] `EXPO_PUBLIC_REVENUECAT_API_KEY`

**Status**: ✅ All environment variables configured

### 4. Required Files

- [x] `GoogleService-Info.plist` (referenced in app.json)
- [x] `app.json` (valid JSON)
- [x] `eas.json` (valid JSON)
- [x] `package.json` (dependencies listed)

### 5. Apple Developer Setup

**Note**: For development builds, EAS can automatically manage credentials. However, you should verify:

- [ ] Apple Developer account is active
- [ ] Bundle ID `com.flashbits.app` is registered in Apple Developer Portal
- [ ] Required capabilities enabled:
  - [ ] Sign In with Apple
  - [ ] Push Notifications
  - [ ] Background Modes (for remote notifications)

**To check/configure credentials:**
```bash
eas credentials
```

### 6. Potential Issues Found

#### ⚠️ Apple Team ID Mismatch

**Issue**: There's a discrepancy in Apple Team IDs:
- `app.json`: `appleTeamId: "P4U95U8X93"`
- `eas.json` (submit section): `appleTeamId: "8D4VX8MVPN"`

**Impact**: This won't affect development builds, but may cause issues during submission.

**Action**: Verify which Team ID is correct and update both files to match.

**To find your correct Team ID:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Check your Team ID in the top right corner
3. Or check App Store Connect → Users and Access → Your Team ID

### 7. Build Command

**Command to run:**
```bash
eas build --platform ios --profile development
```

**Expected behavior:**
- Builds a development client (Expo Dev Client)
- Can be installed on physical iOS devices
- Includes development tools and hot reloading
- Distribution: Internal (via EAS)

### 8. First-Time Build Setup

If this is your first iOS build with EAS:

1. **EAS will prompt for credentials:**
   - Choose "Let EAS handle it" (recommended)
   - Provide your Apple ID when prompted
   - EAS will automatically:
     - Generate distribution certificate
     - Create provisioning profile
     - Configure everything

2. **If credentials already exist:**
   - EAS will use existing credentials
   - No prompts needed

### 9. Build Process

**What happens during build:**
1. EAS validates configuration
2. Checks for credentials (creates if needed)
3. Builds iOS app in cloud
4. Generates `.ipa` file
5. Provides download link

**Build time:** Typically 10-20 minutes

### 10. Post-Build

**After build completes:**
1. Download the `.ipa` file
2. Install on device using:
   - EAS Build page (QR code)
   - Direct download link
   - TestFlight (if configured)

**For development builds:**
- Install Expo Go or Dev Client first
- Then install your development build
- Use `npx expo start --dev-client` to connect

## 🚀 Ready to Build?

### Quick Check Command

Run this to verify everything:
```bash
# Check EAS login
eas whoami

# Validate configuration
eas build:configure

# Check credentials status
eas credentials
```

### Build Command

```bash
eas build --platform ios --profile development
```

## ❌ Common Issues & Solutions

### Issue: "No credentials found"
**Solution**: Run `eas credentials` and let EAS manage credentials automatically

### Issue: "Bundle ID not found"
**Solution**: 
1. Go to Apple Developer Portal
2. Register bundle ID: `com.flashbits.app`
3. Enable required capabilities

### Issue: "Apple Team ID mismatch"
**Solution**: 
1. Verify correct Team ID in Apple Developer Portal
2. Update `app.json` and `eas.json` to match

### Issue: "Missing GoogleService-Info.plist"
**Solution**: 
1. Download from Firebase Console
2. Place in project root
3. Verify path in `app.json` matches

### Issue: "Environment variable not found"
**Solution**: 
1. Check `eas.json` has all required variables
2. Verify variable names start with `EXPO_PUBLIC_`
3. Check for typos

## 📝 Notes

- **Development builds** are for testing on physical devices
- **Simulator builds** are not available for development profile (set to `false`)
- **Distribution** is set to `internal` - builds are shared via EAS
- **Node version** 22.13.1 is specified - ensure compatibility

## ✅ Final Checklist Before Building

- [ ] EAS CLI logged in (`eas whoami`)
- [ ] All environment variables set in `eas.json`
- [ ] `GoogleService-Info.plist` exists in project root
- [ ] Bundle ID registered in Apple Developer Portal
- [ ] Apple Team ID verified and consistent
- [ ] Required capabilities enabled in Apple Developer Portal
- [ ] Dependencies installed (`npm install`)
- [ ] No TypeScript/linting errors

---

**Ready to build?** Run:
```bash
eas build --platform ios --profile development
```

