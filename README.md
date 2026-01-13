# flashbits - Developer Documentation

> **Gamified Coding Interview Preparation App**  
> A TikTok-style swipe-based flashcard app for mastering coding interviews with gamification, XP progression, and comprehensive analytics.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Development Setup](#development-setup)
- [Build & Deployment](#build--deployment)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## 🎯 Overview

**flashbits** is a React Native mobile application built with Expo that gamifies coding interview preparation. Users swipe through coding questions, earn XP, unlock ranks, and track their progress across different topics and difficulty levels.

### Tech Stack

- **Framework**: React Native 0.81.5 + Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Subscriptions**: RevenueCat
- **State Management**: React Context API
- **Animations**: React Native Reanimated 4
- **Language**: TypeScript 5.9
- **Build System**: EAS Build

### Key Capabilities

- ✅ Swipe-based question feed (TikTok-style)
- ✅ Gamification (XP, ranks, streaks)
- ✅ Pro subscription with RevenueCat
- ✅ Offline mode (Pro feature)
- ✅ Push notifications
- ✅ Topic/difficulty filtering
- ✅ Progress tracking & analytics
- ✅ Multiple authentication methods

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22.13.1+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS: Xcode 15+ (for iOS development)
- Android: Android Studio (for Android development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flashcard_interiview_pre

# Install dependencies
npm install

# Start development server
npm start
```

### First-Time Setup

1. **Configure Firebase**
   - Copy `config/firebase.example.ts` to `config/firebase.ts`
   - Add your Firebase configuration
   - See [Firebase Setup Guide](./docs/FIREBASE_AUTH_SETUP.md)

2. **Configure Environment Variables**
   - Update `eas.json` with your API keys
   - See [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md)

3. **Set Up Apple Developer Account** (iOS)
   - See [Apple Developer Setup](./docs/APPLE_DEVELOPER_SETUP.md)

4. **Configure RevenueCat** (for subscriptions)
   - See [RevenueCat Production Setup](./docs/REVENUECAT_PRODUCTION_SETUP.md)

---

## 📁 Project Structure

```
flashcard_interiview_pre/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Login/Auth screen
│   ├── onboarding.tsx           # User onboarding flow
│   ├── home.tsx                 # Landing page
│   ├── feed.tsx                 # Main question feed (swipe-based)
│   ├── progress.tsx             # User stats & progress
│   └── settings.tsx             # Settings & preferences
│
├── components/                   # Reusable React components
│   ├── QuestionCard.tsx         # Individual flashcard component
│   ├── Paywall.tsx              # Subscription paywall
│   ├── AuthGuard.tsx            # Authentication guard
│   └── ...
│
├── context/                      # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── SettingsContext.tsx      # Global settings
│   ├── RevenueCatContext.tsx    # Subscription state
│   └── NetworkContext.tsx       # Network connectivity
│
├── services/                     # Business logic & API services
│   ├── revenueCatService.ts      # RevenueCat integration
│   ├── notificationService.ts   # Push notifications
│   ├── statsService.ts          # User statistics
│   ├── questionsService.ts       # Question management
│   └── ...
│
├── hooks/                        # Custom React hooks
│   ├── useQuestions.ts          # Question fetching
│   ├── useStreak.ts             # Streak tracking
│   └── useTopics.ts             # Topic management
│
├── utils/                        # Utility functions
│   ├── debug.ts                 # Debug logging
│   ├── sanitize.ts              # Input sanitization
│   └── ...
│
├── constants/                    # App constants
│   ├── theme.ts                 # Colors, typography, spacing
│   └── support.ts               # Support information
│
├── config/                       # Configuration files
│   └── firebase.ts              # Firebase initialization
│
├── data/                         # Static data
│   └── questions.ts             # Question types & interfaces
│
├── docs/                         # Documentation
│   ├── REVENUECAT_PRODUCTION_SETUP.md
│   ├── EAS_BUILD_CHECKLIST.md
│   └── ...
│
├── assets/                       # Static assets
│   ├── icons/                   # App icons
│   └── sounds/                  # Sound effects
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── package.json                  # Dependencies & scripts
└── tsconfig.json                 # TypeScript configuration
```

---

## 🏗️ Architecture

### Application Flow

```
┌─────────────────────────────────────────────────────────┐
│                    APP LAUNCH                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Root Layout (_layout.tsx)                   │
│  - Providers: Auth, Settings, RevenueCat, Network       │
│  - Error Boundary                                        │
│  - Navigation Stack                                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Authentication Check                        │
│  - AuthGuard checks user authentication                 │
│  - Redirects to login if not authenticated              │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Onboarding (if new user)                   │
│  - Welcome screen                                        │
│  - Topic selection                                       │
│  - Difficulty selection                                  │
│  - Notification setup                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Home Screen                                 │
│  - Welcome message                                       │
│  - Quick stats                                           │
│  - Start practice button                                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Question Feed                               │
│  - Swipe-based question cards                            │
│  - Real-time stats updates                               │
│  - XP & streak tracking                                  │
└─────────────────────────────────────────────────────────┘
```

### State Management

The app uses **React Context API** for global state:

- **AuthContext**: User authentication, profile data
- **SettingsContext**: User preferences, filters, settings
- **RevenueCatContext**: Subscription status, Pro features
- **NetworkContext**: Network connectivity status

### Data Flow

1. **Questions**: Firestore → `questionsService` → `useQuestions` hook → Components
2. **User Stats**: Firestore → `statsService` → Context → Components
3. **Subscriptions**: RevenueCat → `revenueCatService` → Context → Components
4. **Notifications**: Expo Notifications → `notificationService` → Firestore

---

## ✨ Key Features

### 1. Swipe-Based Question Feed

**Location**: `app/feed.tsx`

- Vertical snap-scrolling question cards
- Swipe gestures: Up (next), Left (wrong), Right (correct)
- Real-time answer tracking
- Instant feedback with animations

**Key Components**:
- `QuestionCard`: Individual question card with options
- Gesture handlers for swipe detection
- Stats bar showing correct/wrong/skipped counts

### 2. Gamification System

**Location**: `services/statsService.ts`, `app/progress.tsx`

- **XP System**: Earn XP for correct answers
- **Ranks**: Progress from "n00b" to "Legend"
- **Streaks**: Daily practice streaks with rewards
- **Milestones**: XP milestones with bonus rewards

**Ranks**:
- n00b → Beginner → Intermediate → Advanced → Expert → Master → Legend

### 3. Pro Subscription

**Location**: `services/revenueCatService.ts`, `components/Paywall.tsx`

- RevenueCat integration for subscriptions
- Monthly and yearly plans
- 7-day free trial
- Pro features:
  - Unlimited topics/difficulties
  - Offline mode
  - Advanced analytics
  - Priority support

### 4. Offline Mode (Pro Feature)

**Location**: `services/offlineStorageService.ts`

- Download questions for offline use
- Local storage with AsyncStorage
- Automatic expiration handling
- Storage size tracking

### 5. Push Notifications

**Location**: `services/notificationService.ts`

- Daily practice reminders
- Streak alerts
- Motivational notifications
- iOS/Android support
- User-specific settings (Firestore)

### 6. Progress Tracking

**Location**: `app/progress.tsx`, `services/statsService.ts`

- Per-topic mastery tracking
- Difficulty breakdown
- Company-specific stats
- Historical progress charts
- XP and rank visualization

---

## 💻 Development Setup

### Local Development

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Development Client

For development builds with custom native code:

```bash
# Build development client
eas build --platform ios --profile development

# Install on device and connect
npx expo start --dev-client
```

### Environment Variables

Environment variables are configured in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "...",
        "EXPO_PUBLIC_REVENUECAT_API_KEY": "..."
      }
    }
  }
}
```

For local development, create a `.env` file (not committed to git):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_REVENUECAT_API_KEY=your_key_here
```

### Code Splitting

The app uses lazy loading for heavy components:

- Paywall component
- Subscription Manager
- Customer Center

See [Code Splitting Guide](./docs/CODE_SPLITTING.md)

---

## 🏗️ Build & Deployment

### EAS Build

The app uses Expo Application Services (EAS) for builds.

**Build Profiles** (in `eas.json`):
- `development`: Development client builds
- `preview`: TestFlight/Internal testing builds
- `production`: App Store/Play Store builds

**Build Commands**:

```bash
# iOS Development Build
eas build --platform ios --profile development

# iOS Preview Build (TestFlight)
eas build --platform ios --profile preview

# iOS Production Build
eas build --platform ios --profile production

# Android builds (same profiles)
eas build --platform android --profile production
```

**See**: [EAS Build Checklist](./docs/EAS_BUILD_CHECKLIST.md)

### App Submission

```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Play Store
eas submit --platform android --latest
```

### Web Deployment

```bash
# Build web version
npm run build:web

# Deploy to Firebase Hosting
npm run deploy:web
```

**See**: [Build & Deploy Guide](./docs/BUILD_AND_DEPLOY.md)

---

## ⚙️ Configuration

### Firebase Configuration

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email, Google, Apple, GitHub)
3. Create Firestore database
4. Copy config to `config/firebase.ts`
5. Update Firestore rules (see `firestore.rules`)

**See**: [Firebase Setup Guide](./docs/FIREBASE_AUTH_SETUP.md)

### RevenueCat Configuration

1. Create RevenueCat account
2. Get API key from RevenueCat dashboard
3. Update `EXPO_PUBLIC_REVENUECAT_API_KEY` in `eas.json`
4. Configure products and entitlements in RevenueCat dashboard

**See**: [RevenueCat Production Setup](./docs/REVENUECAT_PRODUCTION_SETUP.md)

### Apple Developer Setup

1. Create Apple Developer account ($99/year)
2. Register bundle ID: `com.flashbits.app`
3. Enable capabilities:
   - Sign In with Apple
   - Push Notifications
   - Background Modes
4. Configure EAS credentials: `eas credentials`

**See**: [Apple Developer Setup](./docs/APPLE_DEVELOPER_SETUP.md)

---

## 🧪 Testing

### Unit Tests

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### E2E Tests (Detox)

```bash
# Build for testing
npm run test:e2e:ios:build

# Run tests
npm run test:e2e:ios
```

**See**: [Testing Guide](./docs/TESTING.md)

---

## 🐛 Troubleshooting

### Common Issues

#### Build Fails

**Issue**: EAS build fails with credential errors

**Solution**:
```bash
eas credentials
# Let EAS manage credentials automatically
```

#### No Questions Load

**Issue**: Question feed is empty

**Solution**:
1. Check Firestore rules allow read access
2. Verify questions exist in Firestore
3. Check network connectivity
4. Review `questionsService.ts` for errors

#### Subscription Not Working

**Issue**: Pro features not unlocking after purchase

**Solution**:
1. Verify RevenueCat API key is correct
2. Check entitlement ID matches (`pro`)
3. Verify products are linked to entitlement
4. Check RevenueCat dashboard for purchase events

#### Notifications Not Working

**Issue**: Push notifications not received

**Solution**:
1. Check iOS permissions are granted
2. Verify APNs certificate is configured
3. Check Firebase Cloud Messaging setup
4. Review `notificationService.ts` logs

### Debug Tools

The app includes debug logging:

```typescript
import { debug, debugError, debugSuccess } from '@/utils/debug';

debug('category', 'Debug message');
debugError('category', 'Error message');
debugSuccess('category', 'Success message');
```

Enable categories in `utils/debug.ts`:

```typescript
const DEBUG_CATEGORIES = {
  auth: true,
  firebase: true,
  revenueCat: true,
  // ...
};
```

---

## 📚 Additional Resources

### Documentation Files

- [Firebase Setup](./docs/FIREBASE_AUTH_SETUP.md)
- [RevenueCat Production Setup](./docs/REVENUECAT_PRODUCTION_SETUP.md)
- [EAS Build Checklist](./docs/EAS_BUILD_CHECKLIST.md)
- [Apple Developer Setup](./docs/APPLE_DEVELOPER_SETUP.md)
- [Build & Deploy](./docs/BUILD_AND_DEPLOY.md)
- [Testing Guide](./docs/TESTING.md)
- [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md)

### External Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

### Project-Specific Guides

- [Code Splitting](./docs/CODE_SPLITTING.md)
- [Input Sanitization](./docs/INPUT_SANITIZATION.md)
- [Rate Limiting](./docs/RATE_LIMITING.md)
- [Firestore Sync Explained](./docs/FIRESTORE_SYNC_EXPLAINED.md)

---

## 📝 Scripts Reference

### Development

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web browser
```

### Building

```bash
npm run build:ios              # Production iOS build
npm run build:android          # Production Android build
npm run build:ios:preview      # Preview iOS build
npm run build:android:preview  # Preview Android build
```

### Deployment

```bash
npm run submit:ios      # Submit iOS to App Store
npm run submit:android  # Submit Android to Play Store
npm run deploy:web      # Deploy web to Firebase
```

### Testing

```bash
npm test               # Run unit tests
npm run lint           # Run ESLint
```

---

## 🤝 Contributing

### Code Style

- TypeScript for all new code
- ESLint for linting
- Follow existing code patterns
- Add comments for complex logic

### Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test thoroughly
4. Submit pull request

### Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests

---

## 📄 License

[Add your license information here]

---

## 👥 Team

[Add team information here]

---

## 📞 Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review documentation in `docs/` folder
- Open an issue in the repository

---

**Last Updated**: 2024  
**Version**: 1.0.0
