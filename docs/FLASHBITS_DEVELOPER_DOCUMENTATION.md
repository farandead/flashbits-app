# flashbits - Complete Developer Documentation

**Version:** 1.0.0  
**Last Updated:** January 2024  
**Document Version:** 1.0  
**Platform:** iOS & Android  
**Framework:** React Native + Expo SDK 54

---

## Document Information

| Field | Value |
|-------|-------|
| **App Name** | flashbits |
| **Version** | 1.0.0 |
| **Bundle ID (iOS)** | com.flashbits.app |
| **Package Name (Android)** | com.flashbits.app |
| **Framework** | React Native 0.81.5 + Expo SDK 54 |
| **Language** | TypeScript 5.9 |
| **Node Version** | 22.13.1 |
| **Build System** | EAS Build |
| **Backend** | Firebase (Firestore, Authentication, Cloud Functions) |
| **Subscriptions** | RevenueCat |
| **Documentation Version** | 1.0 |
| **Last Updated** | January 2024 |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Setup & Installation](#setup--installation)
7. [Configuration](#configuration)
8. [Core Features](#core-features)
9. [Development Workflow](#development-workflow)
10. [Build & Deployment](#build--deployment)
11. [Testing](#testing)
12. [API Documentation](#api-documentation)
13. [Security](#security)
14. [Troubleshooting](#troubleshooting)
15. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Purpose

flashbits is a gamified coding interview preparation mobile application that transforms traditional interview prep into an engaging, swipe-based learning experience. The app allows users to practice coding questions, earn XP, unlock ranks, and track their progress across different topics and difficulty levels.

### 1.2 Key Features

- **Swipe-Based Question Feed**: TikTok-style vertical scrolling interface
- **Gamification**: XP system, ranks, streaks, and milestones
- **Pro Subscription**: Premium features via RevenueCat integration
- **Offline Mode**: Download questions for offline practice (Pro feature)
- **Push Notifications**: Daily reminders and streak alerts
- **Progress Tracking**: Comprehensive analytics and statistics
- **Multiple Authentication**: Email, Google, Apple, GitHub OAuth

### 1.3 Target Platforms

- iOS 13.0+
- Android 6.0+ (API level 23+)
- Web (limited functionality)

---

## 2. Project Overview

### 2.1 Application Description

flashbits is a React Native application built with Expo that provides a gamified approach to coding interview preparation. Users swipe through coding questions, receive instant feedback, earn XP for correct answers, and progress through hacker ranks from "n00b" to "Legend".

### 2.2 Business Model

- **Free Tier**: Limited access to questions and features
- **Pro Subscription**: 
  - Monthly: £9.99/month
  - Yearly: £99.99/year
  - 7-day free trial
  - Unlimited topics, difficulties, and companies
  - Offline mode
  - Advanced analytics

### 2.3 User Flow

```
App Launch
    ↓
Authentication (Login/Sign Up/Guest)
    ↓
Onboarding (New Users Only)
    ↓
Home Screen
    ↓
Question Feed (Main Practice)
    ↓
Progress Tracking
    ↓
Settings & Preferences
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   iOS App    │  │ Android App   │  │   Web App    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Firebase   │ │ RevenueCat  │ │  Cloud       │
│              │ │             │ │  Functions   │
│ - Firestore  │ │ - Subscriptions│ - OAuth     │
│ - Auth       │ │ - Entitlements│ - Admin Ops  │
│ - Storage    │ │ - Analytics │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 3.2 Component Architecture

**Presentation Layer**:
- React Native Components (TypeScript)
- Expo Router for navigation
- React Context for state management

**Business Logic Layer**:
- Service modules (`services/`)
- Custom hooks (`hooks/`)
- Utility functions (`utils/`)

**Data Layer**:
- Firebase Firestore (NoSQL database)
- AsyncStorage (local storage)
- RevenueCat (subscription management)

### 3.3 Data Flow

**Question Loading**:
```
Firestore → questionsService.getQuestions() 
         → useQuestions hook 
         → Feed component 
         → QuestionCard component
```

**User Stats**:
```
User Action → statsService.recordCorrectAnswer()
          → Firestore update
          → statsService.getUserStats()
          → Context update
          → UI re-render
```

**Subscriptions**:
```
User Purchase → RevenueCat SDK
            → revenueCatService.purchasePlan()
            → RevenueCat API
            → Firestore sync
            → Context update
            → Pro features unlock
```

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile framework |
| Expo SDK | 54.0.30 | Development platform |
| TypeScript | 5.9.2 | Type safety |
| React | 19.1.0 | UI library |
| Expo Router | 6.0.21 | Navigation |
| React Native Reanimated | 4.1.1 | Animations |
| React Native Gesture Handler | 2.28.0 | Gesture recognition |

### 4.2 Backend Services

| Service | Purpose |
|---------|---------|
| Firebase Firestore | Database |
| Firebase Authentication | User auth |
| Firebase Cloud Functions | Serverless functions |
| RevenueCat | Subscription management |
| Expo Notifications | Push notifications |

### 4.3 Development Tools

| Tool | Purpose |
|------|---------|
| EAS Build | Cloud builds |
| EAS Submit | App store submission |
| ESLint | Code linting |
| Jest | Unit testing |
| Detox | E2E testing |

### 4.4 Dependencies

**Core Dependencies**:
- `expo`: 54.0.30
- `react-native`: 0.81.5
- `firebase`: 11.1.0
- `react-native-purchases`: 9.6.12
- `expo-notifications`: 0.32.15
- `expo-router`: 6.0.21

**See `package.json` for complete list**

---

## 5. Project Structure

### 5.1 Directory Structure

```
flashcard_interiview_pre/
│
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Login/Auth screen
│   ├── onboarding.tsx           # User onboarding flow
│   ├── home.tsx                 # Landing page
│   ├── feed.tsx                 # Main question feed
│   ├── progress.tsx             # User stats & progress
│   └── settings.tsx             # Settings & preferences
│
├── components/                   # Reusable React components
│   ├── QuestionCard.tsx         # Individual flashcard
│   ├── Paywall.tsx              # Subscription paywall
│   ├── AuthGuard.tsx            # Authentication guard
│   ├── SignInRequired.tsx       # Sign-in prompt
│   └── ...
│
├── context/                      # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── SettingsContext.tsx      # Global settings
│   ├── RevenueCatContext.tsx    # Subscription state
│   └── NetworkContext.tsx       # Network connectivity
│
├── services/                     # Business logic & API services
│   ├── revenueCatService.ts     # RevenueCat integration
│   ├── notificationService.ts   # Push notifications
│   ├── statsService.ts          # User statistics
│   ├── questionsService.ts      # Question management
│   ├── offlineStorageService.ts # Offline mode
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
│   ├── DEVELOPER_GUIDE.md
│   ├── REVENUECAT_PRODUCTION_SETUP.md
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

### 5.2 Key Files

| File | Purpose |
|------|---------|
| `app.json` | Expo app configuration |
| `eas.json` | EAS Build profiles and environment variables |
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `firestore.rules` | Firestore security rules |
| `GoogleService-Info.plist` | iOS Firebase configuration |
| `google-services.json` | Android Firebase configuration |

---

## 6. Setup & Installation

### 6.1 Prerequisites

**Required Software**:
- Node.js 22.13.1 or higher
- npm or yarn package manager
- Git
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

**For iOS Development**:
- macOS (required)
- Xcode 15.0 or higher
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer account ($99/year)

**For Android Development**:
- Android Studio
- Android SDK
- Java Development Kit (JDK)

**Accounts Required**:
- Firebase account (free tier available)
- RevenueCat account (free tier available)
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

### 6.2 Installation Steps

**Step 1: Clone Repository**
```bash
git clone <repository-url>
cd flashcard_interiview_pre
```

**Step 2: Install Dependencies**
```bash
npm install
```

**Step 3: Configure Firebase**
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email, Google, Apple, GitHub)
3. Create Firestore database
4. Copy `config/firebase.example.ts` to `config/firebase.ts`
5. Add your Firebase configuration

**Step 4: Configure Environment Variables**
1. Update `eas.json` with your API keys:
   - Firebase API keys
   - RevenueCat API key
   - OAuth client IDs

**Step 5: Configure Apple Developer** (iOS only)
1. Register bundle ID: `com.flashbits.app`
2. Enable capabilities:
   - Sign In with Apple
   - Push Notifications
   - Background Modes
3. Run `eas credentials` to set up certificates

**Step 6: Start Development Server**
```bash
npm start
```

### 6.3 First-Time Build Setup

**iOS**:
```bash
# Configure credentials (first time only)
eas credentials

# Build development client
eas build --platform ios --profile development
```

**Android**:
```bash
# Build development client
eas build --platform android --profile development
```

---

## 7. Configuration

### 7.1 Firebase Configuration

**Location**: `config/firebase.ts`

**Required Configuration**:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

**Firestore Rules**: See `firestore.rules`

**Authentication Methods**:
- Email/Password
- Google Sign-In
- Apple Sign-In
- GitHub OAuth

### 7.2 RevenueCat Configuration

**Location**: `eas.json` → `EXPO_PUBLIC_REVENUECAT_API_KEY`

**Setup Steps**:
1. Create RevenueCat account
2. Get API key from RevenueCat dashboard
3. Update `eas.json` with API key
4. Configure products in RevenueCat dashboard:
   - Monthly subscription
   - Yearly subscription
5. Create entitlement: `pro`
6. Link products to entitlement
7. Create offering and set as current

**See**: `docs/REVENUECAT_PRODUCTION_SETUP.md`

### 7.3 Environment Variables

**Location**: `eas.json`

**Required Variables**:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `EXPO_PUBLIC_GITHUB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_CLOUD_FUNCTION_URL`
- `EXPO_PUBLIC_REVENUECAT_API_KEY`

### 7.4 App Configuration

**iOS** (`app.json`):
```json
{
  "ios": {
    "bundleIdentifier": "com.flashbits.app",
    "appleTeamId": "P4U95U8X93",
    "buildNumber": "1",
    "usesAppleSignIn": true,
    "googleServicesFile": "./GoogleService-Info.plist"
  }
}
```

**Android** (`app.json`):
```json
{
  "android": {
    "package": "com.flashbits.app",
    "googleServicesFile": "./google-services.json"
  }
}
```

---

## 8. Core Features

### 8.1 Swipe-Based Question Feed

**Location**: `app/feed.tsx`

**Functionality**:
- Vertical snap-scrolling question cards
- Swipe gestures: Up (next), Left (wrong), Right (correct)
- Real-time answer tracking
- Instant feedback with animations
- Stats bar showing correct/wrong/skipped counts

**Key Components**:
- `QuestionCard`: Individual question card with options
- Gesture handlers for swipe detection
- State management for question tracking

### 8.2 Gamification System

**Location**: `services/statsService.ts`, `app/progress.tsx`

**XP System**:
- Base XP: 10 points per correct answer
- Difficulty multipliers:
  - Easy: 1.0x
  - Medium: 1.5x
  - Hard: 2.0x
  - Cracked: 3.0x
- Streak multiplier: 1 + (streak × 0.1)
- Final XP = Base × Difficulty × Streak

**Rank System**:
1. n00b (0 XP)
2. Beginner (100 XP)
3. Intermediate (500 XP)
4. Advanced (1,500 XP)
5. Expert (5,000 XP)
6. Master (15,000 XP)
7. Legend (50,000 XP)

**Streaks**:
- Daily practice streaks
- Streak multipliers for XP
- Streak fire animation
- Streak milestone rewards

### 8.3 Pro Subscription

**Location**: `services/revenueCatService.ts`, `components/Paywall.tsx`

**Features**:
- Monthly subscription: £9.99/month
- Yearly subscription: £99.99/year
- 7-day free trial
- RevenueCat integration
- Automatic renewal
- Cancel anytime

**Pro Benefits**:
- Unlimited topic selection
- Unlimited difficulty selection
- Company filtering
- Offline mode
- Advanced analytics
- Priority support

### 8.4 Offline Mode (Pro Feature)

**Location**: `services/offlineStorageService.ts`

**Functionality**:
- Download up to 2,000 questions for offline use
- Local storage with AsyncStorage
- Automatic expiration handling (30 days)
- Storage size tracking
- Pro-only feature

**Implementation**:
```typescript
// Check Pro status
const isPro = await hasActiveEntitlement();
if (!isPro) return;

// Download questions
await prefetchQuestionsForOffline(2000);

// Load offline questions
const questions = await loadOfflineQuestions();
```

### 8.5 Push Notifications

**Location**: `services/notificationService.ts`

**Features**:
- Daily practice reminders
- Streak alerts
- Motivational notifications
- iOS/Android support
- User-specific settings (stored in Firestore)
- Permission management

**Notification Types**:
- Daily reminder (configurable time)
- Practice streak reminder
- Motivational messages
- Test notifications (dev only)

### 8.6 Progress Tracking

**Location**: `app/progress.tsx`, `services/statsService.ts`

**Metrics Tracked**:
- Total questions answered
- Correct/incorrect/skipped counts
- Per-topic mastery
- Difficulty breakdown
- Company-specific stats
- XP and rank progression
- Streak information

**Visualizations**:
- Rank progress bar
- Topic mastery bars
- Statistics cards
- Historical progress charts

---

## 9. Development Workflow

### 9.1 Local Development

**Start Development Server**:
```bash
npm start
```

**Run on Simulator/Emulator**:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

**Development Client**:
```bash
# Build development client
eas build --platform ios --profile development

# Install on device and connect
npx expo start --dev-client
```

### 9.2 Code Style

**TypeScript**:
- Always use TypeScript (no `any` types)
- Define interfaces for all data structures
- Use type guards for runtime type checking

**Component Structure**:
1. Imports
2. Types/Interfaces
3. Component definition
4. Hooks
5. Effects
6. Handlers
7. Render
8. Styles

**Naming Conventions**:
- Components: PascalCase (`QuestionCard.tsx`)
- Hooks: camelCase with `use` prefix (`useQuestions.ts`)
- Services: camelCase (`statsService.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_QUESTIONS`)

### 9.3 Git Workflow

**Branch Strategy**:
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

**Commit Messages**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### 9.4 Debugging

**Debug Logging**:
```typescript
import { debug, debugError, debugSuccess } from '@/utils/debug';

debug('category', 'Debug message');
debugError('category', 'Error message', error);
debugSuccess('category', 'Success message');
```

**Enable Categories** (`utils/debug.ts`):
```typescript
const DEBUG_CATEGORIES = {
  auth: true,
  firebase: true,
  revenueCat: true,
  notifications: true,
  // ...
};
```

---

## 10. Build & Deployment

### 10.1 Build Profiles

**Development** (`eas.json`):
- Development client build
- Includes dev tools
- Internal distribution
- Node: 22.13.1

**Preview** (`eas.json`):
- TestFlight/Internal testing
- Release configuration
- Internal distribution
- Node: 22.13.1

**Production** (`eas.json`):
- App Store/Play Store build
- Release configuration
- Store distribution
- Node: 22.13.1

### 10.2 Build Commands

**iOS**:
```bash
# Development
eas build --platform ios --profile development

# Preview (TestFlight)
eas build --platform ios --profile preview

# Production
eas build --platform ios --profile production
```

**Android**:
```bash
# Development
eas build --platform android --profile development

# Preview
eas build --platform android --profile preview

# Production
eas build --platform android --profile production
```

### 10.3 App Submission

**iOS (App Store)**:
```bash
eas submit --platform ios --latest
```

**Android (Play Store)**:
```bash
eas submit --platform android --latest
```

**Prerequisites**:
- App Store Connect app created
- Google Play Console app created
- Build completed successfully
- App Store Connect credentials configured
- Google Play service account configured

### 10.4 Web Deployment

**Build Web Version**:
```bash
npm run build:web
```

**Deploy to Firebase Hosting**:
```bash
npm run deploy:web
```

**See**: `docs/BUILD_AND_DEPLOY.md`

---

## 11. Testing

### 11.1 Unit Tests

**Framework**: Jest

**Run Tests**:
```bash
npm test
npm test -- --watch
npm test -- --coverage
```

**Test Structure**:
```
__tests__/
├── components/
│   └── QuestionCard.test.tsx
├── services/
│   └── statsService.test.ts
└── utils/
    └── sanitize.test.ts
```

### 11.2 E2E Tests

**Framework**: Detox

**Build for Testing**:
```bash
npm run test:e2e:ios:build
npm run test:e2e:android:build
```

**Run Tests**:
```bash
npm run test:e2e:ios
npm run test:e2e:android
```

**See**: `docs/TESTING.md`

### 11.3 Manual Testing Checklist

**Authentication**:
- [ ] Email sign up
- [ ] Email sign in
- [ ] Google sign in
- [ ] Apple sign in
- [ ] GitHub OAuth
- [ ] Guest mode
- [ ] Sign out

**Question Feed**:
- [ ] Questions load correctly
- [ ] Swipe gestures work
- [ ] Answer tracking works
- [ ] Stats update in real-time
- [ ] Explanations show/hide

**Pro Features**:
- [ ] Paywall displays correctly
- [ ] Subscription purchase works
- [ ] Pro features unlock after purchase
- [ ] Restore purchases works
- [ ] Offline mode works (Pro only)

**Notifications**:
- [ ] Permission request works
- [ ] Notifications schedule correctly
- [ ] Settings persist
- [ ] Test notifications work (dev)

---

## 12. API Documentation

### 12.1 Firebase Firestore

**Collections**:

**`/users/{userId}`**:
```typescript
{
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  xp: number;
  rank: string;
  streak: number;
  lastPracticeDate: Timestamp;
  notificationSettings: {
    enabled: boolean;
    dailyReminder: boolean;
    dailyReminderTime: string;
    practiceStreakReminder: boolean;
    motivationalNotifications: boolean;
  };
}
```

**`/questions/{questionId}`**:
```typescript
{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'cracked';
  company?: string;
  category?: string;
  problemName?: string;
  problemNumber?: number;
  code?: string;
}
```

**`/users/{userId}/stats`**:
```typescript
{
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  topics: {
    [topic: string]: {
      correct: number;
      wrong: number;
      skipped: number;
    };
  };
  difficulties: {
    [difficulty: string]: {
      correct: number;
      wrong: number;
      skipped: number;
    };
  };
}
```

### 12.2 RevenueCat API

**Entitlement**: `pro`

**Products**:
- `monthly`: Monthly subscription
- `yearly`: Yearly subscription

**Methods** (`services/revenueCatService.ts`):
- `hasActiveEntitlement()`: Check Pro status
- `purchasePlan(plan)`: Purchase subscription
- `restorePurchases()`: Restore previous purchases
- `syncSubscriptionToFirestore()`: Sync to Firestore

### 12.3 Cloud Functions

**Location**: `functions/main.py`

**Endpoints**:
- `/exchangeGitHubCode`: GitHub OAuth token exchange
- Admin operations (protected)

---

## 13. Security

### 13.1 Input Sanitization

**All user inputs are sanitized** (`utils/sanitize.ts`):
- Question reports
- User descriptions
- Any text input

**Implementation**:
```typescript
import { sanitizeString } from '@/utils/sanitize';

const sanitized = sanitizeString(userInput, maxLength);
```

### 13.2 Authentication

- Firebase Authentication for user auth
- Token validation on each request
- Secure session management
- Rate limiting on authentication endpoints

### 13.3 Firestore Security Rules

**Location**: `firestore.rules`

**Rules**:
- Users can only read/write their own data
- Questions are read-only for users
- Admin operations require authentication
- Notification settings are user-specific

### 13.4 API Keys

- Never commit API keys to git
- Use environment variables in `eas.json`
- Use EAS Secrets for production
- Rotate keys regularly

### 13.5 Data Privacy

- User data stored securely in Firestore
- GDPR compliance considerations
- Privacy policy required for App Store
- Data encryption in transit and at rest

---

## 14. Troubleshooting

### 14.1 Common Issues

**Build Fails - Credentials Error**:
```bash
# Solution: Configure credentials
eas credentials
# Let EAS manage credentials automatically
```

**No Questions Load**:
1. Check Firestore rules allow read access
2. Verify questions exist in Firestore
3. Check network connectivity
4. Review `questionsService.ts` for errors

**Subscription Not Working**:
1. Verify RevenueCat API key is correct
2. Check entitlement ID matches (`pro`)
3. Verify products are linked to entitlement
4. Check RevenueCat dashboard for purchase events

**Notifications Not Working**:
1. Check iOS permissions are granted
2. Verify APNs certificate is configured
3. Check Firebase Cloud Messaging setup
4. Review `notificationService.ts` logs

**Offline Mode Not Working**:
1. Verify user has Pro subscription
2. Check AsyncStorage permissions
3. Verify questions downloaded successfully
4. Check storage size limits

### 14.2 Debug Tools

**Debug Logging**:
Enable categories in `utils/debug.ts`:
```typescript
const DEBUG_CATEGORIES = {
  auth: true,
  firebase: true,
  revenueCat: true,
  notifications: true,
  // ...
};
```

**React Native Debugger**:
- Install React Native Debugger
- Enable remote debugging
- Use Redux DevTools for state inspection

**Network Debugging**:
```typescript
const { isConnected, isInternetReachable } = useNetwork();
debug('network', `Connected: ${isConnected}`);
```

---

## 15. Appendices

### 15.1 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2024 | Initial release |

### 15.2 Dependencies

**See `package.json` for complete list**

**Key Dependencies**:
- `expo`: 54.0.30
- `react-native`: 0.81.5
- `firebase`: 11.1.0
- `react-native-purchases`: 9.6.12
- `expo-notifications`: 0.32.15
- `expo-router`: 6.0.21
- `react-native-reanimated`: 4.1.1

### 15.3 Scripts Reference

**Development**:
- `npm start`: Start Expo dev server
- `npm run ios`: Run on iOS simulator
- `npm run android`: Run on Android emulator
- `npm run web`: Run on web browser

**Building**:
- `npm run build:ios`: Production iOS build
- `npm run build:android`: Production Android build
- `npm run build:ios:preview`: Preview iOS build
- `npm run build:android:preview`: Preview Android build

**Deployment**:
- `npm run submit:ios`: Submit iOS to App Store
- `npm run submit:android`: Submit Android to Play Store
- `npm run deploy:web`: Deploy web to Firebase

**Testing**:
- `npm test`: Run unit tests
- `npm run lint`: Run ESLint

### 15.4 File Locations

| File | Location |
|------|----------|
| Firebase Config | `config/firebase.ts` |
| App Config | `app.json` |
| Build Config | `eas.json` |
| Firestore Rules | `firestore.rules` |
| iOS Config | `GoogleService-Info.plist` |
| Android Config | `google-services.json` |

### 15.5 Contact & Support

**Documentation**:
- Main README: `README.md`
- Developer Guide: `docs/DEVELOPER_GUIDE.md`
- Build Checklist: `docs/EAS_BUILD_CHECKLIST.md`

**External Resources**:
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [RevenueCat Documentation](https://www.revenuecat.com/docs)

---

## Document Control

| Field | Value |
|-------|-------|
| **Document Title** | flashbits Developer Documentation |
| **Version** | 1.0 |
| **Date** | January 2024 |
| **Author** | Development Team |
| **Status** | Active |
| **Next Review** | As needed |

---

**End of Document**


