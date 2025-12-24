import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { debug, debugSuccess, debugWarn } from '@/utils/debug';

// Import getReactNativePersistence - available at runtime in React Native
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCC8QQdswUwhn9Cc_9AZjTOI-rYisjYL3M",
  authDomain: "flashprep-11c85.firebaseapp.com",
  projectId: "flashprep-11c85",
  storageBucket: "flashprep-11c85.firebasestorage.app",
  messagingSenderId: "258968844420",
  appId: "1:258968844420:web:3ce107a1de69ffa8d5aad1",
  measurementId: "G-Q1XG9SFFTB"
};

// Initialize Firebase (prevent re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth with React Native persistence
// This ensures user stays logged in even after app restart
let auth: ReturnType<typeof getAuth>;
try {
  debug('firebase', 'Initializing auth with AsyncStorage persistence...');
  // Try to initialize auth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  debugSuccess('firebase', 'Auth initialized with persistence successfully');
} catch (error: any) {
  debugWarn('firebase', 'Auth init error:', error.code, error.message);
  // If auth was already initialized (e.g., during hot reload), get the existing instance
  if (error.code === 'auth/already-initialized') {
    debug('firebase', 'Auth already initialized, getting existing instance');
    auth = getAuth(app);
  } else {
    // Re-throw unexpected errors
    throw error;
  }
}

// Debug: Check if persistence is set up
debug('firebase', 'Auth instance ready, checking current user...');
if (auth.currentUser) {
  debugSuccess('firebase', 'Found persisted user:', auth.currentUser.email || auth.currentUser.uid);
} else {
  debug('firebase', 'No persisted user found on init');
}

export { auth };

// Export app for other services
export { app };
export default app;

