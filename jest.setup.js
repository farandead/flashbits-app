// Jest setup file for React Native testing
// Note: @testing-library/jest-native is deprecated, using built-in matchers from @testing-library/react-native v12.4+
// Let jest-expo handle React Native setup, we'll only mock what we need in individual tests

// Ensure NativeModules exists before jest-expo tries to use it
// This fixes the "Object.defineProperty called on non-object" error
if (typeof global.NativeModules === 'undefined') {
  global.NativeModules = {};
}

// Mock React Native Alert and Linking
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve(true)),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
  };
});

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [
    { clientId: 'test-client-id' },
    { type: null },
    jest.fn(),
  ]),
  makeRedirectUri: jest.fn(() => 'flashbits://auth'),
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() =>
    Promise.resolve({
      identityToken: 'mock-identity-token',
      user: 'mock-user-id',
    })
  ),
  AppleAuthenticationScope: {
    FULL_NAME: 'FULL_NAME',
    EMAIL: 'EMAIL',
  },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock expo-modules-core (required by expo-font and @expo/vector-icons)
jest.mock('expo-modules-core', () => ({
  EventEmitter: jest.fn(),
  NativeModulesProxy: {},
}));

// Mock expo-font (required by @expo/vector-icons)
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({
        data: {
          idToken: 'mock-id-token',
        },
      })
    ),
  },
}));

// Mock Firebase
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn(() => Promise.resolve()),
  signInWithCustomToken: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(() => Promise.resolve()),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve()),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  sendEmailVerification: jest.fn(() => Promise.resolve()),
  OAuthProvider: jest.fn(() => ({
    credential: jest.fn(() => ({})),
  })),
  GoogleAuthProvider: {
    credential: jest.fn(() => ({})),
  },
  GithubAuthProvider: {
    credential: jest.fn(() => ({})),
  },
}));

jest.mock('@/config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock AuthContext
const mockAuthContext = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signOut: jest.fn(() => Promise.resolve()),
  deleteAccount: jest.fn(() => Promise.resolve({ success: true })),
  signUpWithEmail: jest.fn(() => Promise.resolve({ success: true })),
  signInWithEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendPhoneVerification: jest.fn(() => Promise.resolve(null)),
  confirmPhoneCode: jest.fn(() => Promise.resolve(true)),
  signInWithGitHubCredential: jest.fn(() => Promise.resolve(true)),
  signInWithAppleCredential: jest.fn(() => Promise.resolve(true)),
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => mockAuthContext),
  AuthProvider: ({ children }) => children,
}));

// Mock userService
jest.mock('@/services/userService', () => ({
  hasCompletedOnboarding: jest.fn(() => Promise.resolve(true)),
  getUserProfile: jest.fn(() => Promise.resolve(null)),
  saveUserProfile: jest.fn(() => Promise.resolve()),
  clearCachedProfile: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock __DEV__
global.__DEV__ = true;

// Export mock auth context for use in tests
// Note: This is a workaround - in actual tests, you'll import from the mock directly
global.mockAuthContext = mockAuthContext;

