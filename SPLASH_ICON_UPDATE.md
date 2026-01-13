# Updating Splash Icon - Fix Guide

## Problem
EAS Build caches splash screen assets, so updated splash icons may not appear in new builds.

## Solutions

### Option 1: Clear EAS Build Cache (Recommended)
When building with EAS, use the `--clear-cache` flag:

```bash
# For iOS
eas build --platform ios --profile production --clear-cache

# For Android
eas build --platform android --profile production --clear-cache
```

### Option 2: Increment Build Number
I've already incremented your iOS build number from "1" to "2" in `app.json`. This forces a fresh build.

For Android, you may also want to increment `versionCode` in `app.json` if you have it configured.

### Option 3: Clear Local Expo Cache
If testing locally:

```bash
# Clear Expo cache
npx expo start --clear

# Or remove .expo folder manually
rm -rf .expo
```

### Option 4: Verify File is Updated
Make sure your `splash-icon.png` file is actually updated:

```bash
# Check file modification time
ls -la assets/icons/splash-icon.png

# Verify it's the correct file
open assets/icons/splash-icon.png
```

## Verification Steps

1. **Check app.json configuration:**
   ```json
   "splash": {
     "image": "./assets/icons/splash-icon.png",
     "resizeMode": "contain",
     "backgroundColor": "#0D0D0D"
   }
   ```
   ✅ Already configured correctly

2. **Build with cache cleared:**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

3. **Test the build** - The splash screen should show your updated icon

## Notes

- Splash screens are generated at **build time**, not runtime
- EAS Build caches assets to speed up builds
- Always use `--clear-cache` when updating assets like icons, splash screens, etc.
- The build number has been incremented to "2" to force a fresh build

## Current Status

- ✅ Splash icon file exists: `assets/icons/splash-icon.png`
- ✅ Dimensions: 1179x2556 (correct)
- ✅ app.json configured correctly
- ✅ Build number incremented to "2"
- ⚠️ Next build should use `--clear-cache` flag


