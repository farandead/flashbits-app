# flashbits - Complete Developer Guide

Comprehensive guide for developers working on the flashbits app.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Core Features Implementation](#core-features-implementation)
4. [Services & APIs](#services--apis)
5. [State Management](#state-management)
6. [Navigation](#navigation)
7. [Styling & Theming](#styling--theming)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Security](#security)

---

## 🚀 Getting Started

### Prerequisites Checklist

- [ ] Node.js 22.13.1+ installed
- [ ] npm or yarn package manager
- [ ] Expo CLI installed globally
- [ ] EAS CLI installed globally
- [ ] Git configured
- [ ] Firebase account created
- [ ] RevenueCat account created (for subscriptions)
- [ ] Apple Developer account (for iOS)
- [ ] Google Play Console account (for Android)

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd flashcard_interiview_pre

# 2. Install dependencies
npm install

# 3. Configure Firebase
cp config/firebase.example.ts config/firebase.ts
# Edit config/firebase.ts with your Firebase config

# 4. Configure environment variables
# Edit eas.json with your API keys

# 5. Start development server
npm start
```

### Development Tools

**Recommended VS Code Extensions**:
- ESLint
- Prettier
- React Native Tools
- TypeScript and JavaScript Language Features

**Useful Commands**:
```bash
# Clear Metro bundler cache
npx expo start --clear

# Reset iOS simulator
xcrun simctl erase all

# Reset Android emulator
adb emu kill
```

---

## 🏗️ Architecture Deep Dive

### Application Structure

```
┌─────────────────────────────────────────────────────┐
│                  Expo Router                        │
│            (File-based Routing)                     │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Screens    │ │  Components  │ │   Services   │
│  (app/*.tsx) │ │ (components/)│ │ (services/)  │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Context    │ │    Hooks     │ │    Utils     │
│  (context/)  │ │   (hooks/)   │ │   (utils/)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Data Flow

**Question Loading Flow**:
```
Firestore → questionsService.getQuestions() 
         → useQuestions hook 
         → Feed component 
         → QuestionCard component
```

**User Stats Flow**:
```
User Action → statsService.recordCorrectAnswer()
          → Firestore update
          → statsService.getUserStats()
          → Context update
          → UI re-render
```

**Subscription Flow**:
```
User Purchase → RevenueCat SDK
            → revenueCatService.purchasePlan()
            → RevenueCat API
            → revenueCatService.syncSubscriptionToFirestore()
            → Firestore update
            → RevenueCatContext update
            → UI update (Pro features unlock)
```

---

## 🎯 Core Features Implementation

### 1. Question Feed (`app/feed.tsx`)

**Key Components**:
- `FlatList` with `snapToInterval` for snap scrolling
- Gesture handlers for swipe detection
- Question state management
- Real-time stats updates

**Swipe Detection**:
```typescript
// Swipe up = next question
// Swipe left = mark as wrong
// Swipe right = mark as correct
```

**State Management**:
- `previouslyAnswered`: Set of question IDs already answered
- `previouslyCorrect`: Set of correctly answered question IDs
- `previouslyWrong`: Set of incorrectly answered question IDs
- `previouslySkipped`: Set of skipped question IDs

### 2. Gamification System

**XP Calculation** (`services/statsService.ts`):
```typescript
// Base XP per question
const BASE_XP = 10;

// Difficulty multipliers
const DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
  cracked: 3.0
};

// Streak multiplier
const STREAK_MULTIPLIER = 1 + (streak * 0.1); // 10% per streak

// Final XP = BASE_XP * DIFFICULTY_MULTIPLIER * STREAK_MULTIPLIER
```

**Rank System**:
- Ranks defined in `constants/theme.ts` or `services/statsService.ts`
- XP thresholds for each rank
- Visual rank display in `app/progress.tsx`

### 3. Pro Subscription

**RevenueCat Integration** (`services/revenueCatService.ts`):

```typescript
// Check Pro status
const isPro = await hasActiveEntitlement('pro');

// Purchase subscription
const result = await purchasePlan('monthly' | 'yearly');

// Restore purchases
const result = await restorePurchases();
```

**Pro Features**:
- Topic filtering (unlimited)
- Difficulty filtering (unlimited)
- Company filtering
- Offline mode
- Advanced analytics

**Feature Gating**:
```typescript
if (!isPro) {
  // Show paywall
  setShowPaywall(true);
  return;
}
// Pro feature code
```

### 4. Offline Mode

**Storage** (`services/offlineStorageService.ts`):
- Uses AsyncStorage for local persistence
- Stores questions as JSON
- Tracks storage size and expiration

**Download Process**:
```typescript
// 1. Check Pro status
const isPro = await hasActiveEntitlement();
if (!isPro) return;

// 2. Fetch questions from Firestore
const questions = await fetchQuestions(maxQuestions);

// 3. Save to AsyncStorage
await AsyncStorage.setItem('offline_questions', JSON.stringify(questions));

// 4. Save metadata (count, timestamp, expiration)
await saveOfflineMetadata(questions.length);
```

### 5. Push Notifications

**Setup** (`services/notificationService.ts`):
- Request iOS permissions
- Schedule local notifications
- Handle notification events
- Sync settings to Firestore

**Notification Types**:
- Daily reminders
- Streak alerts
- Motivational messages
- Test notifications (dev only)

---

## 🔌 Services & APIs

### Firebase Services

**Authentication** (`context/AuthContext.tsx`):
- Email/password
- Google Sign-In
- Apple Sign-In
- GitHub OAuth
- Guest mode

**Firestore** (`services/*Service.ts`):
- User profiles: `/users/{userId}`
- Questions: `/questions/{questionId}`
- User stats: `/users/{userId}/stats`
- Notification settings: `/users/{userId}/notificationSettings`

**Cloud Functions** (`functions/main.py`):
- GitHub OAuth token exchange
- Admin operations
- Background jobs

### RevenueCat Service

**Key Methods** (`services/revenueCatService.ts`):
- `initializeRevenueCat()`: Initialize SDK
- `hasActiveEntitlement()`: Check Pro status
- `purchasePlan()`: Purchase subscription
- `restorePurchases()`: Restore previous purchases
- `syncSubscriptionToFirestore()`: Sync to Firestore

### Question Service

**Key Methods** (`services/questionsService.ts`):
- `getQuestions()`: Fetch questions from Firestore
- `prefetchQuestionsForOffline()`: Download for offline
- `filterQuestions()`: Apply topic/difficulty filters

### Stats Service

**Key Methods** (`services/statsService.ts`):
- `recordCorrectAnswer()`: Record correct answer, award XP
- `recordWrongAnswer()`: Record wrong answer
- `recordSkippedQuestion()`: Record skipped question
- `getUserStats()`: Get user statistics
- `awardMilestoneXP()`: Award milestone bonuses

---

## 🗂️ State Management

### Context Providers

**AuthContext** (`context/AuthContext.tsx`):
```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**SettingsContext** (`context/SettingsContext.tsx`):
```typescript
interface SettingsContextType {
  selectedTopics: Set<string>;
  selectedDifficulties: Set<string>;
  selectedCompanies: Set<string>;
  showExplanations: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  // ... methods
}
```

**RevenueCatContext** (`context/RevenueCatContext.tsx`):
```typescript
interface RevenueCatContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  purchasePlan: (plan: 'monthly' | 'yearly') => Promise<PurchaseResult>;
  restore: () => Promise<RestoreResult>;
}
```

### State Updates

**Best Practices**:
- Use Context for global state
- Use local state for component-specific state
- Update Firestore first, then update local state
- Handle loading and error states

---

## 🧭 Navigation

### Expo Router

**File-based routing**:
- `app/index.tsx` → `/` (login screen)
- `app/home.tsx` → `/home`
- `app/feed.tsx` → `/feed`
- `app/progress.tsx` → `/progress`
- `app/settings.tsx` → `/settings`

**Navigation Methods**:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate
router.push('/feed');
router.replace('/home');
router.back();
```

**Protected Routes**:
- `components/AuthGuard.tsx` wraps protected screens
- Redirects to login if not authenticated

---

## 🎨 Styling & Theming

### Theme System (`constants/theme.ts`)

**Colors**:
```typescript
export const colors = {
  primary: '#00FF94',        // Cyber green
  background: '#050506',    // Dark background
  card: '#161618',          // Card background
  textPrimary: '#FFFFFF',   // Main text
  textSecondary: '#9CA3AF', // Secondary text
  correct: '#00FF94',       // Correct answer
  incorrect: '#FF4D6A',     // Wrong answer
  // ...
};
```

**Typography**:
```typescript
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

**Spacing**:
```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  base: 16,
  md: 24,
  lg: 32,
  xl: 48,
};
```

### Styling Patterns

**Component Styles**:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.base,
  },
  // ...
});
```

**Dynamic Styles**:
```typescript
<View style={[
  styles.card,
  isSelected && styles.cardSelected,
  { backgroundColor: topicColor }
]}>
```

---

## 🧪 Testing

### Unit Tests

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

**Running Tests**:
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
```

### E2E Tests (Detox)

**Setup**:
```bash
npm run test:e2e:ios:build  # Build for testing
npm run test:e2e:ios        # Run tests
```

**Test Example**:
```typescript
describe('Question Feed', () => {
  it('should display questions', async () => {
    await element(by.id('question-card')).toBeVisible();
  });
});
```

---

## ⚡ Performance Optimization

### Code Splitting

**Lazy Loading** (`utils/lazyLoad.tsx`):
- Paywall component
- Subscription Manager
- Customer Center

**Implementation**:
```typescript
const { Component: PaywallComponent, isLoading } = useLazyComponent(
  () => import('@/components/Paywall'),
  showPaywall
);
```

### Image Optimization

- Use optimized image formats (WebP)
- Lazy load images
- Cache images appropriately

### List Optimization

**FlatList Best Practices**:
```typescript
<FlatList
  data={questions}
  renderItem={renderQuestion}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={5}
/>
```

### Memoization

```typescript
// Memoize expensive computations
const filteredQuestions = useMemo(() => {
  return questions.filter(/* ... */);
}, [questions, filters]);

// Memoize callbacks
const handleAnswer = useCallback((isCorrect: boolean) => {
  // ...
}, [dependencies]);
```

---

## 🔒 Security

### Input Sanitization

**All user inputs are sanitized** (`utils/sanitize.ts`):
- Question reports
- User descriptions
- Any text input

**Implementation**:
```typescript
import { sanitizeString } from '@/utils/sanitize';

const sanitized = sanitizeString(userInput, maxLength);
```

### Authentication

- Firebase Authentication for user auth
- Token validation on each request
- Secure session management

### Firestore Rules

**Security Rules** (`firestore.rules`):
- Users can only read/write their own data
- Questions are read-only for users
- Admin operations require authentication

### API Keys

- Never commit API keys to git
- Use environment variables
- Use EAS Secrets for production

---

## 📝 Code Style Guidelines

### TypeScript

- Always use TypeScript (no `any` types)
- Define interfaces for all data structures
- Use type guards for runtime type checking

### Component Structure

```typescript
// 1. Imports
import React from 'react';
import { View, Text } from 'react-native';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export const MyComponent: React.FC<Props> = ({ ... }) => {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 6. Handlers
  const handlePress = () => {
    // ...
  };
  
  // 7. Render
  return (
    <View>
      {/* ... */}
    </View>
  );
};

// 8. Styles
const styles = StyleSheet.create({
  // ...
});
```

### Naming Conventions

- **Components**: PascalCase (`QuestionCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useQuestions.ts`)
- **Services**: camelCase (`statsService.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_QUESTIONS`)
- **Files**: Match export name

---

## 🐛 Debugging

### Debug Logging

```typescript
import { debug, debugError, debugSuccess } from '@/utils/debug';

// Enable categories in utils/debug.ts
debug('auth', 'User signed in');
debugError('firebase', 'Error fetching data', error);
debugSuccess('revenueCat', 'Purchase successful');
```

### React Native Debugger

- Install React Native Debugger
- Enable remote debugging
- Use Redux DevTools for state inspection

### Network Debugging

```typescript
// Check network status
const { isConnected, isInternetReachable } = useNetwork();

// Log network requests
debug('network', `Request: ${url}`);
```

---

## 📚 Additional Resources

### Internal Documentation

- [Firebase Setup](./FIREBASE_AUTH_SETUP.md)
- [RevenueCat Setup](./REVENUECAT_PRODUCTION_SETUP.md)
- [Build Checklist](./EAS_BUILD_CHECKLIST.md)
- [Testing Guide](./TESTING.md)

### External Resources

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated**: 2024  
**Maintained by**: Development Team

