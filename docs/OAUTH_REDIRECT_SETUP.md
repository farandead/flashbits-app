# OAuth Redirect URI Setup Guide

This guide explains how to configure redirect URIs for GitHub and Google OAuth in your flashbits app.

## Why HTTPS URLs?

Both GitHub and Google OAuth **require HTTPS redirect URIs**. Custom URL schemes like `exp://` or `flashbits://` are **not accepted**.

Expo provides an **auth proxy** that converts your app's custom scheme to an HTTPS URL that OAuth providers accept.

## How Expo Auth Proxy Works

When you use `useProxy: true` in `AuthSession.makeRedirectUri()`, Expo generates:

```
https://auth.expo.io/@[your-expo-username]/[app-slug]
```

For your app:
- **App slug**: `flashbits` (from `app.json`)
- **Expo username**: Check your console output or Expo account
- **Full URL**: `https://auth.expo.io/@deadshotz/flashbits`

## Step 1: Find Your Redirect URI

1. **Start your Expo app**:
   ```bash
   npm start
   ```

2. **Check the console output** - you'll see:
   ```
   🔗 GitHub OAuth Redirect URI: https://auth.expo.io/@[username]/flashbits
   👆 Copy this EXACTLY to your GitHub OAuth App callback URL
   
   🔗 Google OAuth Redirect URI: https://auth.expo.io/@[username]/flashbits
   👆 Copy this EXACTLY to your Google OAuth Client authorized redirect URIs
   ```

3. **Copy the exact HTTPS URL** shown in the console

## Step 2: Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on your OAuth App (or create a new one)
3. In **"Authorization callback URL"**, add:
   ```
   https://auth.expo.io/@[your-username]/flashbits
   ```
   Replace `[your-username]` with your actual Expo username from the console.

4. Click **"Update application"**

### GitHub OAuth App Settings Example:

- **Application name**: flashbits
- **Homepage URL**: `https://flashprep-11c85.web.app` (or your website)
- **Authorization callback URL**: `https://auth.expo.io/@[username]/flashbits`

## Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your **OAuth 2.0 Client ID** (or create a new one)
4. In **"Authorized redirect URIs"**, click **"+ ADD URI"**
5. Add:
   ```
   https://auth.expo.io/@[your-username]/flashbits
   ```
   Replace `[your-username]` with your actual Expo username from the console.

6. Click **"SAVE"**

### Google OAuth Client Settings:

- **Application type**: Web application
- **Name**: flashbits
- **Authorized JavaScript origins**: (optional, for web)
  - `https://flashprep-11c85.web.app`
- **Authorized redirect URIs**:
  - `https://auth.expo.io/@[username]/flashbits`

## Step 4: Verify Configuration

1. **Restart your Expo app** to see the new redirect URIs in console
2. **Test GitHub Sign In** - should work without errors
3. **Test Google Sign In** - should work without errors

## Common Issues

### Error: "redirect_uri mismatch"

**Problem**: The redirect URI in your OAuth provider doesn't match what the app is sending.

**Solution**:
1. Check the console for the exact redirect URI
2. Ensure it's copied **exactly** (including `https://`)
3. No trailing slashes
4. Case-sensitive - must match exactly

### Error: "redirect_uri is not associated with the application"

**Problem**: The redirect URI isn't added to your OAuth app settings.

**Solution**:
1. Go to your OAuth provider settings
2. Add the exact HTTPS URL from console
3. Save the changes
4. Wait a few seconds for changes to propagate
5. Try again

### Still Using `exp://` URLs

**Problem**: The app is still generating `exp://` URLs instead of HTTPS.

**Solution**:
- Ensure `useProxy: true` is set in `AuthSession.makeRedirectUri()`
- Don't specify `native` or `scheme` options when using proxy
- Restart your Expo dev server

## For Production Builds

The same HTTPS redirect URI works for:
- ✅ Development (Expo Go)
- ✅ Development builds
- ✅ Production builds
- ✅ App Store / Play Store releases

**No changes needed** - Expo's auth proxy handles everything!

## Multiple Environments

If you have different Expo accounts or projects:

- **Development**: `https://auth.expo.io/@[dev-username]/flashbits`
- **Staging**: `https://auth.expo.io/@[staging-username]/flashbits`
- **Production**: `https://auth.expo.io/@[prod-username]/flashbits`

You can add **multiple redirect URIs** to your OAuth apps to support all environments.

## Quick Checklist

- [ ] Started Expo app and checked console for redirect URI
- [ ] Copied exact HTTPS URL from console
- [ ] Added URL to GitHub OAuth App → Authorization callback URL
- [ ] Added URL to Google OAuth Client → Authorized redirect URIs
- [ ] Saved changes in both providers
- [ ] Restarted Expo app
- [ ] Tested GitHub sign in - works ✅
- [ ] Tested Google sign in - works ✅

## Example Console Output

When you start your app, you should see:

```
🔗 GitHub OAuth Redirect URI: https://auth.expo.io/@deadshotz/flashbits
👆 Copy this EXACTLY to your GitHub OAuth App callback URL

🔗 Google OAuth Redirect URI: https://auth.expo.io/@deadshotz/flashbits
👆 Copy this EXACTLY to your Google OAuth Client authorized redirect URIs
```

Copy these URLs and add them to your OAuth provider settings!

## Need Help?

If you're still getting errors:
1. Double-check the console output for the exact URL
2. Verify the URL is added correctly in OAuth provider settings
3. Ensure there are no typos or extra spaces
4. Wait a few seconds after saving - changes may take time to propagate

