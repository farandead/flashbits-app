# Firebase Authentication Setup Guide

This guide walks you through setting up Firebase Authentication with **Apple**, **GitHub**, and **Phone Number** sign-in methods.

---

## 📋 Prerequisites

1. Firebase project already created (you have this: `flashprep-11c85`)
2. Expo project set up
3. Apple Developer account (for Apple Sign In)
4. GitHub account (for GitHub OAuth)

---

## 🔧 Step 1: Install Required Packages

Run this command in your project directory:

```bash
npx expo install expo-apple-authentication expo-auth-session expo-crypto expo-web-browser
```

---

## 🍎 Step 2: Set Up Apple Sign In

### 2.1 Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Sign-in method**
3. Click **Apple** and enable it
4. You'll need:
   - **Services ID**: Your Apple Services ID (e.g., `com.yourcompany.flashprep.signin`)
   - **Apple Team ID**: Found in Apple Developer Portal
   - **Key ID** and **Private Key**: From Apple Developer Portal

### 2.2 Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**

#### Create an App ID:
1. Go to **Identifiers** → **App IDs**
2. Create a new App ID with **Sign In with Apple** capability enabled
3. Use your bundle identifier (e.g., `com.yourcompany.flashprep`)

#### Create a Services ID:
1. Go to **Identifiers** → **Services IDs**
2. Create a new Services ID
3. Enable **Sign In with Apple**
4. Configure domains:
   - **Domains**: `flashprep-11c85.firebaseapp.com`
   - **Return URLs**: `https://flashprep-11c85.firebaseapp.com/__/auth/handler`

#### Create a Key:
1. Go to **Keys**
2. Create a new key with **Sign In with Apple** enabled
3. Download the `.p8` file (save it securely!)
4. Note the **Key ID**

### 2.3 Update app.json

Add Apple Sign In capability:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.flashprep",
      "usesAppleSignIn": true
    }
  }
}
```

---

## 🐙 Step 3: Set Up GitHub OAuth

### 3.1 Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name**: FlashPrep
   - **Homepage URL**: `https://flashprep-11c85.firebaseapp.com`
   - **Authorization callback URL**: `https://flashprep-11c85.firebaseapp.com/__/auth/handler`
4. Click **Register Application**
5. Note your **Client ID**
6. Generate a **Client Secret** and save it

### 3.2 Firebase Console

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Click **GitHub** and enable it
3. Enter your **Client ID** and **Client Secret** from GitHub

### 3.3 Expo Configuration

For GitHub OAuth in Expo, you'll use `expo-auth-session`. Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "flashprep"
  }
}
```

---

## 📱 Step 4: Set Up Phone Authentication

### 4.1 Firebase Console

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Click **Phone** and enable it

### 4.2 For Testing (Optional)

Add test phone numbers:
1. In Phone sign-in settings, scroll to **Phone numbers for testing**
2. Add test numbers like `+1 555-555-5555` with code `123456`

### 4.3 Important Note for React Native

For production phone auth in React Native, you'll need:

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

The web SDK has limitations with phone auth in React Native. For full functionality:
1. Use `@react-native-firebase/auth` 
2. This requires a development build (not Expo Go)

---

## 🔐 Step 5: Security Rules

### Firestore Rules

Add these rules to secure user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Questions - readable by all, writable by admins only
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // User profiles - users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User progress - users can only access their own progress
    match /progress/{progressId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 🧪 Step 6: Testing

### Development Testing

1. **Apple Sign In**: Requires a real iOS device or simulator with iOS 13+
2. **GitHub**: Works in Expo Go with `expo-auth-session`
3. **Phone**: Use test numbers in Firebase Console

### Creating a Development Build

For full functionality, create a development build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure your project
eas build:configure

# Create development build
eas build --profile development --platform ios
```

---

## 📁 Project Structure After Setup

```
context/
  └── AuthContext.tsx     # Auth state management
app/
  └── login.tsx           # Login screen
config/
  └── firebase.ts         # Firebase initialization
```

---

## 🚀 Quick Start Checklist

- [ ] Install packages: `expo-apple-authentication`, `expo-auth-session`
- [ ] Enable Apple Sign In in Firebase Console
- [ ] Create Apple Services ID and Key
- [ ] Create GitHub OAuth App
- [ ] Enable GitHub in Firebase Console
- [ ] Enable Phone Auth in Firebase Console
- [ ] Update `app.json` with iOS bundle ID and scheme
- [ ] Test with development build

---

## 🔗 Useful Links

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Firebase](https://rnfirebase.io/)

---

## 💡 Tips

1. **Start with GitHub** - Easiest to set up and test
2. **Use test phone numbers** - Avoid SMS costs during development
3. **Apple requires paid developer account** - $99/year
4. **Always test on real devices** - Some auth features don't work in simulators

---

## ❓ Troubleshooting

### "Invalid client_id" error (GitHub)
- Check that your Client ID matches exactly in Firebase and GitHub

### Apple Sign In not appearing
- Ensure `usesAppleSignIn: true` in app.json
- Check iOS version is 13+

### Phone verification not sending
- Check if number is in correct format with country code
- Verify Phone auth is enabled in Firebase

