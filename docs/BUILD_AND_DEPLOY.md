# Building and Deploying the App

This guide covers building your Expo app for iOS, Android, and Web deployment.

## Prerequisites

1. **Install EAS CLI** (Expo Application Services):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Link your project** (if not already linked):
   ```bash
   eas build:configure
   ```

## Build Profiles

The `eas.json` file defines three build profiles:

- **development**: For testing with development client
- **preview**: For internal testing (APK/IPA files)
- **production**: For App Store/Play Store release

## Building for Android

### Preview Build (APK - for testing)
```bash
eas build --platform android --profile preview
```

### Production Build (AAB - for Play Store)
```bash
eas build --platform android --profile production
```

### Local Build (requires Android Studio)
```bash
npx expo run:android
```

## Building for iOS

### Preview Build (IPA - for TestFlight)
```bash
eas build --platform ios --profile preview
```

### Production Build (for App Store)
```bash
eas build --platform ios --profile production
```

### Local Build (requires Xcode and Apple Developer account)
```bash
npx expo run:ios
```

## Building for Web

### Development Build
```bash
npx expo export:web
```

### Production Build
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_key \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain \
# ... other env vars
npx expo export:web --output-dir web-build
```

Or use the build script:
```bash
npm run build:web
```

## Environment Variables

Environment variables are configured in `eas.json` for each build profile. For production, you may want to use EAS Secrets instead:

```bash
# Set secrets (more secure)
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value your_value
# ... repeat for all variables
```

Then remove the `env` section from `eas.json` production profile - EAS will use secrets automatically.

## Build Status

Check build status:
```bash
eas build:list
```

View specific build:
```bash
eas build:view [BUILD_ID]
```

## Submitting to App Stores

### iOS (App Store)

1. **Build and submit**:
   ```bash
   eas submit --platform ios --profile production
   ```

2. **Or build first, then submit**:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```

### Android (Google Play Store)

1. **Build and submit**:
   ```bash
   eas submit --platform android --profile production
   ```

2. **Or build first, then submit**:
   ```bash
   eas build --platform android --profile production
   eas submit --platform android --latest
   ```

## Web Deployment

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Build and deploy**:
   ```bash
   npx expo export:web
   cd web-build
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard**:
   - Go to Project Settings > Environment Variables
   - Add all `EXPO_PUBLIC_*` variables

### Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy**:
   ```bash
   npx expo export:web
   cd web-build
   netlify deploy --prod
   ```

3. **Set environment variables in Netlify dashboard**

## Quick Build Commands

Add these to your `package.json` scripts:

```json
{
  "scripts": {
    "build:android": "eas build --platform android --profile production",
    "build:ios": "eas build --platform ios --profile production",
    "build:web": "EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY npx expo export:web",
    "submit:android": "eas submit --platform android --latest",
    "submit:ios": "eas submit --platform ios --latest"
  }
}
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

### Environment Variables Not Working

1. **Verify in eas.json** or check secrets:
   ```bash
   eas secret:list
   ```

2. **Test locally first**:
   ```bash
   # Make sure .env file has values
   npx expo start
   ```

### iOS Code Signing Issues

1. **Configure credentials**:
   ```bash
   eas credentials
   ```

2. **Or let EAS manage automatically** (recommended)

## Next Steps

1. ✅ Set up EAS account and login
2. ✅ Configure build profiles in `eas.json`
3. ✅ Set environment variables (in eas.json or as secrets)
4. ✅ Run your first build
5. ✅ Submit to app stores when ready

For more details, see [Expo's Build Documentation](https://docs.expo.dev/build/introduction/).

