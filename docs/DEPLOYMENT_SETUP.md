# Deployment Setup Checklist

## ✅ Environment Variables Configured

All Firebase and OAuth credentials now use environment variables with fallback values for local development.

### Files Updated:

1. **`config/firebase.ts`** - React Native/Expo app
   - Uses `EXPO_PUBLIC_*` prefix
   - Fallback values for local dev

2. **`Web/src/firebase.js`** - Landing page (Vite)
   - Uses `VITE_*` prefix
   - Fallback values for local dev

3. **`admin/src/firebase.js`** - Admin panel (Vite)
   - Uses `VITE_*` prefix
   - Fallback values for local dev

4. **`app/index.tsx`** - OAuth credentials
   - `EXPO_PUBLIC_GITHUB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
   - `EXPO_PUBLIC_CLOUD_FUNCTION_URL`

### Environment Files Created:

- ✅ `.env.example` (root) - Template for Expo app
- ✅ `Web/.env.example` - Template for landing page
- ✅ `admin/.env.example` - Template for admin panel

## 🚀 Deployment Steps

### For Expo/React Native App:

1. **EAS Build:**
   ```bash
   # Set environment variables in eas.json or use EAS Secrets
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
   ```

2. **Or in `eas.json`:**
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_FIREBASE_API_KEY": "your_value",
           "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your_value",
           "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your_value",
           "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your_value",
           "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "your_value",
           "EXPO_PUBLIC_FIREBASE_APP_ID": "your_value",
           "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID": "your_value",
           "EXPO_PUBLIC_GITHUB_CLIENT_ID": "your_value",
           "EXPO_PUBLIC_GOOGLE_CLIENT_ID": "your_value",
           "EXPO_PUBLIC_CLOUD_FUNCTION_URL": "your_value"
         }
       }
     }
   }
   ```

### For Web Landing Page (Vercel/Netlify):

1. Go to project settings
2. Add environment variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
3. Redeploy

### For Admin Panel (Vercel/Netlify):

1. Go to project settings
2. Add the same `VITE_*` variables as above
3. Redeploy

## 🔒 Security

- ✅ All `.env` files are gitignored
- ✅ Fallback values only used for local development
- ✅ Production deployments should use environment variables
- ✅ Never commit actual `.env` files

## 📝 Next Steps

1. Create `.env` files from `.env.example` in each directory
2. Fill in your actual credentials
3. Test locally to ensure everything works
4. Set environment variables in your deployment platform
5. Deploy!

For detailed instructions, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

