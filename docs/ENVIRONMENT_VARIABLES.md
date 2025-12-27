# Environment Variables Setup Guide

This project uses environment variables for Firebase configuration and OAuth credentials to enable secure deployment across different environments.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Firebase credentials** from [Firebase Console](https://console.firebase.google.com/)

3. **For Web/Admin:** Copy their respective `.env.example` files in their directories

## Environment Variable Files

### Root `.env` (Expo/React Native App)

Located at the project root. Used by the mobile app.

**Required Variables:**
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# OAuth Configuration
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_CLOUD_FUNCTION_URL=https://us-central1-your-project.cloudfunctions.net/exchangeGitHubCode
```

### `Web/.env` (Landing Page)

Located in the `Web/` directory. Used by the Vite-based landing page.

**Required Variables:**
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### `admin/.env` (Admin Panel)

Located in the `admin/` directory. Used by the Vite-based admin panel.

**Required Variables:**
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ > **Project Settings**
4. Scroll down to **Your apps** section
5. Click on your web app (or create one)
6. Copy the config values

## Getting OAuth Credentials

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: FlashPrep
   - **Homepage URL**: Your app URL
   - **Authorization callback URL**: `flashprep://auth` (for mobile) or your web URL
4. Copy the **Client ID**

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Create **OAuth 2.0 Client ID**
4. Copy the **Client ID**

### Cloud Function URL

1. Deploy your Firebase Cloud Function
2. Get the URL from Firebase Console > Functions
3. Format: `https://us-central1-{project-id}.cloudfunctions.net/exchangeGitHubCode`

## Deployment

### Expo/React Native (EAS Build)

For EAS Build, set environment variables in `eas.json` or use EAS Secrets:

```bash
# Set secrets via EAS CLI
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value your_value
# ... repeat for all variables
```

Or in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your_value",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your_value"
      }
    }
  }
}
```

### Vercel/Netlify (Web & Admin)

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add all `VITE_*` variables
4. Redeploy

### Local Development

1. Copy `.env.example` to `.env` in each directory
2. Fill in your credentials
3. Restart your dev server

## Fallback Values

All config files include fallback values for local development. These are the current production values and will be used if environment variables are not set.

**⚠️ Important:** Remove fallback values before deploying to production or use different values for different environments.

## Security Notes

- ✅ Firebase client-side API keys are safe to expose (they're public by design)
- ✅ `.env` files are gitignored
- ✅ Never commit `.env` files to version control
- ✅ Use different credentials for development/staging/production
- ✅ Rotate credentials if they're accidentally exposed

## Verification

After setting up environment variables:

1. **Expo App:** Restart Expo dev server and check console for Firebase initialization
2. **Web:** Restart Vite dev server and check browser console
3. **Admin:** Restart Vite dev server and check browser console

All should connect to Firebase without errors.

