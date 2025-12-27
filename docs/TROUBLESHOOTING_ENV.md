# Troubleshooting Environment Variables

## Error: "api-key-not-valid" or "Firebase configuration incomplete"

This means Expo isn't loading your environment variables from the `.env` file.

## Quick Fix Steps:

### 1. Verify `.env` file exists and is in the root directory

```bash
# From project root, check if .env exists
ls -la .env
```

### 2. Check `.env` file format

Your `.env` file should look like this (no quotes, no spaces around `=`):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCC8QQdswUwhn9Cc_9AZjTOI-rYisjYL3M
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=flashprep-11c85.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=flashprep-11c85
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=flashprep-11c85.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=258968844420
EXPO_PUBLIC_FIREBASE_APP_ID=1:258968844420:web:3ce107a1de69ffa8d5aad1
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Q1XG9SFFTB
```

**Common mistakes:**
- ❌ `EXPO_PUBLIC_FIREBASE_API_KEY = "value"` (spaces around =, quotes)
- ✅ `EXPO_PUBLIC_FIREBASE_API_KEY=value` (no spaces, no quotes)

### 3. Restart Expo Dev Server

**⚠️ CRITICAL:** Expo only loads environment variables when it starts. You MUST restart:

```bash
# Stop your current Expo server (Ctrl+C)
# Then restart with cache clear
npx expo start --clear
```

Or:
```bash
# Stop server
# Clear cache and restart
rm -rf .expo
npx expo start
```

### 4. Verify Environment Variables are Loading

After restarting, check the console output. You should see:
```
[firebase] Environment variables check:
[firebase]   EXPO_PUBLIC_FIREBASE_API_KEY: ✓ Set (AIzaSyCC8...)
[firebase]   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: ✓ Set
[firebase]   EXPO_PUBLIC_FIREBASE_PROJECT_ID: ✓ Set
```

If you see `✗ Missing`, the variables aren't loading.

## Still Not Working?

### Option 1: Use app.json (Temporary)

Add to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "firebaseApiKey": "AIzaSyCC8QQdswUwhn9Cc_9AZjTOI-rYisjYL3M",
      "firebaseAuthDomain": "flashprep-11c85.firebaseapp.com",
      "firebaseProjectId": "flashprep-11c85",
      "firebaseStorageBucket": "flashprep-11c85.firebasestorage.app",
      "firebaseMessagingSenderId": "258968844420",
      "firebaseAppId": "1:258968844420:web:3ce107a1de69ffa8d5aad1",
      "firebaseMeasurementId": "G-Q1XG9SFFTB"
    }
  }
}
```

Then access via `Constants.expoConfig?.extra?.firebaseApiKey` (requires `expo-constants`).

### Option 2: Hardcode Temporarily (Development Only)

For quick local testing, you can temporarily hardcode values in `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCC8QQdswUwhn9Cc_9AZjTOI-rYisjYL3M",
  // ... rest of config
};
```

**⚠️ Remember to switch back to environment variables before committing!**

## Check Your Setup

Run this to verify your .env file:

```bash
# Check if .env exists
test -f .env && echo "✓ .env exists" || echo "✗ .env missing"

# Check if variables are set (won't show values, just confirms they exist)
grep -q "EXPO_PUBLIC_FIREBASE_API_KEY" .env && echo "✓ API_KEY found" || echo "✗ API_KEY missing"
```

## Need Help?

1. Check console logs for the debug output showing which variables are missing
2. Verify `.env` file is in the project root (same directory as `package.json`)
3. Ensure no typos in variable names (must start with `EXPO_PUBLIC_`)
4. Restart Expo server completely (not just reload)

