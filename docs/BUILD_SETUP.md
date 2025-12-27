# Build Setup Guide

This guide will help you set up and build your Expo app for iOS, Android, and Web.

## Prerequisites

1. **Node.js** (v18 or later)
2. **Expo account** (free at [expo.dev](https://expo.dev))
3. **For iOS builds**: Apple Developer account ($99/year) - only needed for App Store submission
4. **For Android builds**: Google Play Developer account ($25 one-time) - only needed for Play Store submission

## Step 1: Install EAS CLI

EAS (Expo Application Services) CLI is required for building your app:

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version
```

## Step 2: Login to Expo

```bash
eas login
```

This will open a browser window for authentication. If you don't have an account, create one at [expo.dev](https://expo.dev).

## Step 3: Configure Your Project

Your project is already configured with `eas.json`, but you should verify the configuration:

```bash
eas build:configure
```

This will:
- Link your project to your Expo account
- Verify your `eas.json` configuration
- Set up your project for builds

## Step 4: Understanding Build Profiles

Your `eas.json` has three build profiles:

### 1. **development** - For testing with development client
- iOS: Simulator builds
- Android: APK files
- Use for: Local testing and development

### 2. **preview** - For internal testing
- iOS: IPA files (for TestFlight or ad-hoc distribution)
- Android: APK files
- Use for: Testing with real devices, sharing with testers

### 3. **production** - For app stores
- iOS: App Store builds
- Android: AAB (Android App Bundle) for Play Store
- Use for: App Store and Play Store submission

## Step 5: Building Your App

### Build for Android (Preview/Testing)

**APK for testing:**
```bash
npm run build:android:preview
```

Or manually:
```bash
eas build --platform android --profile preview
```

**AAB for Play Store:**
```bash
npm run build:android
```

Or manually:
```bash
eas build --platform android --profile production
```

### Build for iOS (Preview/Testing)

**IPA for TestFlight:**
```bash
npm run build:ios:preview
```

Or manually:
```bash
eas build --platform ios --profile preview
```

**For App Store:**
```bash
npm run build:ios
```

Or manually:
```bash
eas build --platform ios --profile production
```

### Build for Web

```bash
npm run build:web
```

This creates static files in `web-build/` directory that can be deployed to Firebase Hosting or any static hosting service.

## Step 6: Monitor Build Progress

After starting a build, you'll get a build ID. Monitor progress:

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Or check online at: https://expo.dev/accounts/[your-username]/projects/flashbits/builds
```

## Step 7: Download Your Build

Once the build completes:

1. **From CLI**: The build URL will be shown in the terminal
2. **From Dashboard**: Visit [expo.dev](https://expo.dev) > Your Project > Builds
3. **Download**: Click the download link for your platform

## Environment Variables

Your environment variables are already configured in `eas.json` for all build profiles. They include:
- Firebase configuration
- OAuth credentials (GitHub, Google)
- Cloud Function URL

**Note**: For production, consider using EAS Secrets instead of hardcoding in `eas.json`:

```bash
# Set secrets (more secure)
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value your_value
# ... repeat for all variables
```

Then remove the `env` section from `eas.json` - EAS will use secrets automatically.

## iOS Build Requirements

### First Time Setup

1. **Apple Developer Account**: Required for production builds
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Cost: $99/year

2. **Configure Credentials** (EAS can do this automatically):
   ```bash
   eas credentials
   ```
   
   Choose:
   - **iOS**: Let EAS manage credentials automatically (recommended)
   - Or manually configure certificates and provisioning profiles

### Build Process

When you run your first iOS build:
- EAS will prompt you to set up credentials
- Choose "Let EAS handle it" for automatic setup
- You'll need to provide your Apple ID and team ID

## Android Build Requirements

### First Time Setup

1. **Google Play Developer Account**: Required for Play Store submission
   - Sign up at [play.google.com/console](https://play.google.com/console)
   - Cost: $25 one-time fee

2. **Keystore**: EAS can generate this automatically
   ```bash
   eas credentials
   ```
   
   Choose:
   - **Android**: Let EAS manage credentials automatically (recommended)

### Build Process

- EAS automatically generates a keystore for signing
- No manual configuration needed for preview builds
- For production, you may need to configure Play Store credentials

## Quick Build Commands Reference

```bash
# Android Preview (APK)
npm run build:android:preview

# Android Production (AAB)
npm run build:android

# iOS Preview (IPA)
npm run build:ios:preview

# iOS Production (App Store)
npm run build:ios

# Web Build
npm run build:web

# Submit to stores (after building)
npm run submit:android
npm run submit:ios
```

## Troubleshooting

### Build Fails

1. **Check build logs**:
   ```bash
   eas build:view [BUILD_ID]
   ```

2. **Clear cache and rebuild**:
   ```bash
   eas build --platform android --profile production --clear-cache
   ```

3. **Check environment variables**: Ensure all required variables are set in `eas.json` or as secrets

### Credentials Issues

1. **iOS**: Run `eas credentials` to reconfigure
2. **Android**: EAS manages keystores automatically, but you can check with `eas credentials`

### Environment Variables Not Working

1. **Verify in eas.json**: Check that all `EXPO_PUBLIC_*` variables are set
2. **Use EAS Secrets**: For production, consider using secrets instead
3. **Check build logs**: Variables are logged at build time

## Next Steps

1. ✅ Install EAS CLI: `npm install -g eas-cli`
2. ✅ Login: `eas login`
3. ✅ Configure: `eas build:configure`
4. ✅ Build: Choose your platform and run the build command
5. ✅ Test: Download and test your build
6. ✅ Submit: When ready, submit to app stores

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Expo Dashboard](https://expo.dev)

## Build Time Estimates

- **Android APK**: ~10-15 minutes
- **Android AAB**: ~10-15 minutes
- **iOS IPA**: ~15-20 minutes
- **iOS App Store**: ~15-20 minutes

Builds run in the cloud, so you can continue working while they build!

