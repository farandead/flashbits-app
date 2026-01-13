# GitHub OAuth Configuration Fix

## Problem
GitHub OAuth was failing with "redirect is not associated with the app" because:
- The redirect URI was not stable (changed between Expo Go and dev builds)
- GitHub requires exact matching of registered callback URLs

## Solution

### 1. Use Development Build (NOT Expo Go)
GitHub OAuth requires a stable redirect URI. Expo Go uses `exp://` URLs that change constantly.

**Use a development build:**
```bash
# iOS
npx expo run:ios

# Android  
npx expo run:android
```

### 2. Configure GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App
3. In **"Authorization callback URL"**, set EXACTLY:
   ```
   flashbits://auth
   ```
4. Click **"Update application"**

### 3. Code Configuration

The code now explicitly forces the custom scheme:
```typescript
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'flashbits',
  path: 'auth',
});
```

This ensures the redirect URI is always `flashbits://auth`, matching your GitHub OAuth App settings.

## Important Notes

- ✅ **DO**: Use development builds for OAuth testing
- ❌ **DON'T**: Use Expo Go for OAuth (redirect URI will be `exp://` which changes)
- ✅ **DO**: Set GitHub callback URL to exactly `flashbits://auth`
- ❌ **DON'T**: Use HTTPS proxy URLs (deprecated by Expo)

## Verification

When you run the app, check the console. You should see:
```
🔗 GitHub OAuth Redirect URI: flashbits://auth
👆 Set this EXACTLY in your GitHub OAuth App → Authorization callback URL
💡 Should be: flashbits://auth
```

If you see a warning about the scheme not being `flashbits://`, you're likely using Expo Go instead of a development build.

## Troubleshooting

### Still getting "redirect is not associated" error?

1. **Check you're using a development build** (not Expo Go)
   - Restart with: `npx expo run:ios` or `npx expo run:android`

2. **Verify GitHub OAuth App settings**
   - Callback URL must be exactly: `flashbits://auth`
   - No trailing slashes
   - Case-sensitive

3. **Check console output**
   - Redirect URI should be: `flashbits://auth`
   - If it's `exp://...`, you're using Expo Go

4. **Clear app cache and restart**
   - Sometimes cached redirect URIs can cause issues




