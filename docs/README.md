# ⚡ FlashPrep

**Gamified Programming Quiz Platform**

> "Swipe to get smarter, not dumber" — A TikTok-style coding interview preparation app with gamification elements.

---

## 🚀 Tech Stack

- **Framework:** React Native + Expo (SDK 53)
- **Navigation:** Expo Router
- **Backend:** Firebase (Firestore + Authentication)
- **Animations:** React Native Reanimated
- **Icons:** @expo/vector-icons (Ionicons)

---

## 📱 Core Concept

FlashPrep reimagines interview prep as an addictive, swipe-based experience:

- **Vertical swipe feed** — One question per screen, swipe up for next
- **Instant feedback** — Know immediately if you're right
- **Gamification** — Earn XP, climb hacker ranks, track progress
- **Smart review** — Skipped and wrong questions come back

---

## 📁 Project Structure

```
flashcard_interiview_pre/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Login/Auth screen (initial route)
│   ├── onboarding.tsx            # User onboarding flow (5 steps)
│   ├── home.tsx                  # Landing page after auth
│   ├── feed.tsx                  # Main question feed (swipe-based)
│   ├── progress.tsx              # Hacker Profile & stats
│   └── settings.tsx              # Settings & preferences
├── components/
│   └── QuestionCard.tsx          # Individual flashcard component
├── config/
│   ├── firebase.ts               # Firebase initialization
│   └── firebase.example.ts       # Firebase config template
├── constants/
│   └── theme.ts                  # Colors, typography, spacing
├── context/
│   ├── AuthContext.tsx           # Authentication state management
│   └── SettingsContext.tsx       # Global settings state
├── data/
│   └── questions.ts              # Mock questions & TypeScript types
├── hooks/
│   └── useQuestions.ts           # Firebase question fetching hooks
├── services/
│   ├── questionsService.ts       # Firestore CRUD for questions
│   ├── userService.ts            # User profile management
│   └── statsService.ts           # User stats tracking
├── scripts/
│   ├── seed_questions.py         # Python script to seed database
│   ├── requirements.txt          # Python dependencies
│   ├── example_questions.json    # Question format template
│   └── AI_QUESTION_GENERATOR_PROMPT.md
└── docs/
    └── FIREBASE_AUTH_SETUP.md    # Auth setup instructions
```

---

## 🔐 Authentication

### Implemented Methods:
| Method | Status |
|--------|--------|
| Email/Password | ✅ Fully functional |
| Phone Number | 🟡 UI complete (needs Firebase config) |
| Apple Sign-In | ⏸️ Commented out for later |
| GitHub OAuth | ⏸️ Commented out for later |
| Guest Mode | ✅ Skip login option |

### Auth Flow:
```
Login Screen → Sign Up → Onboarding (5 steps) → Home
Login Screen → Sign In → Home
Login Screen → Guest Mode → Home
```

---

## 👤 User Onboarding

5-step personalized onboarding:

1. **Welcome** — Enter your name
2. **Occupation** — Student, Junior Dev, Senior Dev, Career Changer, etc.
3. **Coding Level** — Beginner, Intermediate, Advanced, Expert
4. **Goals** — Multi-select: FAANG, first job, promotion, skills, etc.
5. **Complete** — Summary and start practicing

---

## 🎮 Gamification System

### Hacker Ranks
| Rank | Min XP | Description |
|------|--------|-------------|
| n00b | 0 | Just getting started |
| Script Kiddie | 5 | Learning the basics |
| Code Monkey | 15 | Writing code daily |
| Hacktivist | 30 | Fighting with code |
| White Hat | 50 | Ethical hacker |
| Black Hat | 100 | Elite programmer |
| Ghost | 200 | Legendary status |

### XP System
- **+1 XP** per correct answer
- **0 XP** for wrong/skipped
- Progress saved to Firebase

---

## 📊 Data Models

### Question
```typescript
interface Question {
  id: string;
  topic: 'Arrays' | 'Hashmaps' | 'Strings' | 'Trees' | 'Graphs' | 'DP' | 'LinkedList' | 'Recursion';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
```

### User Profile
```typescript
interface UserProfile {
  name: string;
  occupation: string;
  codingLevel: string;
  goals: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

### User Stats
```typescript
interface UserStats {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  xp: number;
  topicsProgress: Record<string, { total: number; correct: number }>;
  difficultyProgress: Record<string, { total: number; correct: number }>;
  lastActiveAt: string;
  createdAt: string;
}
```

---

## 🔥 Firebase Structure

```
Firestore Database
├── /questions/{questionId}
│   └── id, topic, difficulty, question, options, correctAnswer, explanation
├── /users/{userId}
│   └── name, occupation, codingLevel, goals[], onboardingCompleted, timestamps
└── /userStats/{userId}
    └── totalQuestions, correctAnswers, wrongAnswers, skippedQuestions, xp,
        topicsProgress, difficultyProgress, timestamps
```

### Required Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /userStats/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🎨 Theme

Dark mode with cyber-green accents:

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#00FF94` | Buttons, highlights, correct |
| Background | `#050506` | Main background |
| Card | `#161618` | Card backgrounds |
| Incorrect | `#FF4D6A` | Wrong answers |
| Text Primary | `#FFFFFF` | Main text |
| Text Muted | `#6B7280` | Secondary text |

---

## 📱 Screens Overview

### Login (`index.tsx`)
- Email/password sign up & sign in
- Phone number input with country picker
- Guest mode option
- Animated UI with background glow

### Home (`home.tsx`)
- Personalized welcome: "Hey, {name} 👋"
- Current filter settings display
- "Start Practice" CTA with pulse animation
- Feature cards grid
- Quick actions for settings/progress

### Feed (`feed.tsx`)
- Vertical snap-scrolling question cards
- Header with rank display and XP
- Stats bar (correct/wrong/skipped counts)
- Skip detection and tracking
- Real-time stats saving to Firebase

### Progress (`progress.tsx`)
- User profile card with editable level/goals
- Current rank with progress to next
- All ranks grid (locked/unlocked)
- Statistics overview
- Per-topic mastery bars

### Settings (`settings.tsx`)
- Account section with sign out
- Topic filters (8 topics)
- Difficulty filters (3 levels)
- Preference toggles (explanations, haptics)
- Developer tools (seed database)

---

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → **Email/Password**
3. Create **Firestore Database**
4. Copy your config to `config/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Firestore Rules
Copy the rules from the Firebase Structure section above.

### 4. Run the App
```bash
npx expo start
```

### 5. Seed Questions (Optional)
Use the in-app "Seed Questions" button in Settings, or run:
```bash
cd scripts
pip install -r requirements.txt
python seed_questions.py
```

---

## ✅ Features Completed

### Must Have
- [x] Vertical swipe question feed
- [x] MCQ question cards with instant feedback
- [x] XP & Hacker rank progression system
- [x] Skip tracking with visual indicators
- [x] Topic/difficulty filtering
- [x] Firebase backend for questions
- [x] User authentication (Email)
- [x] User onboarding flow
- [x] Stats persistence to Firebase
- [x] Settings page with preferences

### Should Have
- [x] Haptic feedback on interactions
- [x] Show/hide explanations toggle
- [x] Previously wrong/skipped badges
- [x] Progress visualization with charts
- [x] Editable goals and level from profile
- [x] Personalized welcome message with animation
- [x] Sign out functionality

### Could Have (Future)
- [ ] Phone number authentication
- [ ] Apple Sign-In
- [ ] GitHub OAuth
- [ ] Timed challenge mode
- [ ] Leaderboards
- [ ] Social features / friends
- [ ] Push notifications for streaks
- [ ] Spaced repetition algorithm

---

## 🎯 App Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        APP LAUNCH                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN SCREEN                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Email Sign  │  │   Phone     │  │   Continue as       │  │
│  │    Up/In    │  │   Sign In   │  │      Guest          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────┘
          │                │                     │
          ▼                ▼                     │
┌─────────────────────────────────────┐          │
│         ONBOARDING (New Users)      │          │
│  1. Name → 2. Role → 3. Level →     │          │
│  4. Goals → 5. Complete             │          │
└─────────────────┬───────────────────┘          │
                  │                              │
                  ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         HOME                                │
│  "Hey, {name} 👋"                    [Progress] [Settings]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ⚡ FlashPrep                            │    │
│  │         Master coding interviews                    │    │
│  │           one swipe at a time                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ▶ Start Practice                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      QUESTION FEED                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Arrays]                               [Hard]      │    │
│  │                                                     │    │
│  │  What is the time complexity of...?                 │    │
│  │                                                     │    │
│  │  ○ O(1)                                             │    │
│  │  ○ O(n)                                             │    │
│  │  ○ O(log n)                                         │    │
│  │  ○ O(n²)                                            │    │
│  │                                                     │    │
│  │              ↑ Swipe up for next                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐                          │
│  │ ✓ 12   │ │ ✗ 3    │ │ ⏭ 2   │  Stats Bar               │
│  └────────┘ └────────┘ └────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Key Dependencies

```json
{
  "expo": "~53.0.0",
  "react": "19.0.0",
  "react-native": "0.79.2",
  "expo-router": "~5.0.0",
  "react-native-reanimated": "~3.17.4",
  "firebase": "^10.x",
  "expo-haptics": "~14.1.0",
  "react-native-phone-number-input": "^2.1.0",
  "@expo/vector-icons": "^14.x",
  "react-native-gesture-handler": "~2.24.0"
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - feel free to use this project for learning or building your own interview prep app!

---

**Built with ☕ and 💚 for developers preparing for their dream jobs.**

