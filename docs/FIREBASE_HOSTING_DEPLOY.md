# Deploying to Firebase Hosting

This guide covers deploying your Expo web app to Firebase Hosting.

## Prerequisites

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Verify your project**:
   ```bash
   firebase projects:list
   ```

   Your project `flashprep-11c85` should be listed.

## Quick Deploy

### Step 1: Build the Web App

```bash
npm run build:web
```

This will:
- Export your Expo app as a static web build
- Create files in the `web-build/` directory
- Include all necessary assets and JavaScript bundles

### Step 2: Deploy to Firebase Hosting

```bash
npm run deploy:web
```

Or manually:
```bash
firebase deploy --only hosting
```

## One-Command Deploy

Deploy everything (web app + Firestore rules + functions):
```bash
npm run deploy:all
```

## Environment Variables for Web Build

Since you're building for web, make sure your environment variables are set. The build process will use values from your `.env` file or you can set them inline:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_key \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=flashprep-11c85 \
npx expo export:web
```

Or update the build script in `package.json` to use environment variables.

## Firebase Hosting Configuration

The `firebase.json` file is configured with:

- **Public directory**: `web-build` (Expo's web export directory)
- **Rewrites**: All routes redirect to `index.html` (for React Router)
- **Caching**: Optimized cache headers for static assets

## Deployment Steps

### 1. Build the App

```bash
npm run build:web
```

**Expected output:**
```
✔ Finished exporting
  Exporting...
  Bundling JavaScript...
  Exporting images...
  Exporting fonts...
  Exporting static files...
```

### 2. Preview Locally (Optional)

Before deploying, preview the build locally:

```bash
firebase serve --only hosting
```

Then visit `http://localhost:5000` to test.

### 3. Deploy

```bash
firebase deploy --only hosting
```

**Expected output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/flashprep-11c85/overview
Hosting URL: https://flashprep-11c85.web.app
```

## Your App URLs

After deployment, your app will be available at:

- **Primary URL**: `https://flashprep-11c85.web.app`
- **Custom Domain** (if configured): Your custom domain

## Deploying Firestore Rules (Optional)

If you've updated Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Deploying Functions (Optional)

If you have Cloud Functions:

```bash
firebase deploy --only functions
```

## Continuous Deployment

### Option 1: GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build:web
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: flashprep-11c85
```

### Option 2: Firebase CLI in CI/CD

```bash
# In your CI/CD pipeline
npm install
npm run build:web
firebase deploy --only hosting --token $FIREBASE_TOKEN
```

## Troubleshooting

### Build Fails

1. **Check for errors**:
   ```bash
   npm run build:web
   ```

2. **Clear cache and rebuild**:
   ```bash
   rm -rf web-build .expo
   npm run build:web
   ```

### Deployment Fails

1. **Check Firebase login**:
   ```bash
   firebase login:list
   ```

2. **Verify project**:
   ```bash
   firebase use
   ```

3. **Check permissions**:
   - Ensure you have "Firebase Hosting Admin" role in Firebase Console

### Environment Variables Not Working

1. **Set variables before build**:
   ```bash
   export EXPO_PUBLIC_FIREBASE_API_KEY=your_key
   npm run build:web
   ```

2. **Or use a `.env.production` file** (Expo will load it automatically)

### App Shows Blank Page

1. **Check browser console** for errors
2. **Verify Firebase config** is correct
3. **Check network tab** for failed requests
4. **Ensure rewrites are configured** in `firebase.json`

## Custom Domain Setup

1. **Add custom domain in Firebase Console**:
   - Go to Hosting > Add custom domain
   - Follow the verification steps

2. **Update DNS records** as instructed by Firebase

3. **SSL certificate** will be automatically provisioned

## Rollback

If something goes wrong, rollback to previous version:

```bash
firebase hosting:clone flashprep-11c85:live flashprep-11c85:previous
```

Or use Firebase Console:
- Go to Hosting > Releases
- Click "Rollback" on a previous release

## Monitoring

After deployment, monitor your app:

- **Firebase Console**: https://console.firebase.google.com/project/flashprep-11c85/hosting
- **Performance**: Check hosting metrics in Firebase Console
- **Analytics**: View user analytics in Firebase Console

## Next Steps

1. ✅ Build your web app: `npm run build:web`
2. ✅ Deploy to Firebase: `npm run deploy:web`
3. ✅ Test your live URL
4. ✅ Set up custom domain (optional)
5. ✅ Configure CI/CD for automatic deployments (optional)

Your app is now live at: **https://flashprep-11c85.web.app** 🚀

