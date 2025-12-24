import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { debug, debugSuccess, debugWarn } from '@/utils/debug';

// Import getReactNativePersistence - available at runtime in React Native
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth');

// Helper function to clean environment variable values
// Removes quotes, whitespace, and ensures proper string format
const cleanEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  // Remove surrounding quotes (single or double) and trim whitespace
  let cleaned = value.trim();
  // Remove quotes from both ends if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned || undefined;
};

// Your web app's Firebase configuration
// Uses environment variables for deployment
const firebaseConfig = {
  apiKey: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  measurementId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID)
};

// Debug: Log environment variable status with raw values
const rawApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
debug('firebase', 'Environment variables check:');
debug('firebase', `  EXPO_PUBLIC_FIREBASE_API_KEY (raw): ${rawApiKey ? `"${rawApiKey.substring(0, 15)}..."` : '✗ Missing'}`);
debug('firebase', `  EXPO_PUBLIC_FIREBASE_API_KEY (cleaned): ${firebaseConfig.apiKey ? `"${firebaseConfig.apiKey.substring(0, 15)}..."` : '✗ Missing'}`);
debug('firebase', `  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: ${firebaseConfig.authDomain ? '✓ Set' : '✗ Missing'}`);
debug('firebase', `  EXPO_PUBLIC_FIREBASE_PROJECT_ID: ${firebaseConfig.projectId ? '✓ Set' : '✗ Missing'}`);

// Validate that all required environment variables are set
const requiredEnvVars = [
  { key: 'EXPO_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
  { key: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
  { key: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
  { key: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
  { key: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: firebaseConfig.messagingSenderId },
  { key: 'EXPO_PUBLIC_FIREBASE_APP_ID', value: firebaseConfig.appId },
];

const missingVars = requiredEnvVars.filter(({ value }) => !value || (typeof value === 'string' && value.trim() === ''));

if (missingVars.length > 0) {
  const missingKeys = missingVars.map(({ key }) => key);
  const errorMessage = `\n❌ Missing required Firebase environment variables: ${missingKeys.join(', ')}\n ${missingKeys.join(', ')}\n Environment variables only load when Expo starts!\n\n`;
    `Environment variables only load when Expo starts!\n\n` +
    `Current status:\n` +
    requiredEnvVars.map(({ key, value }) => {
      const status = value && (typeof value !== 'string' || value.trim() !== '') ? '✓ Set' : '✗ Missing';
      const preview = value && typeof value === 'string' ? ` (${value.substring(0, 20)}...)` : '';
      return `  ${key}: ${status}${preview}`;
    }).join('\n')  
  console.error('❌ Firebase Configuration Error:');
  console.error(errorMessage);
  throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}\n Environment variables only load when Expo starts!\n\n`);
}

// Log successful configuration with key info
debugSuccess('firebase', 'Firebase config loaded successfully');
debug('firebase', `Using API key: ${firebaseConfig.apiKey?.substring(0,5)}... (length: ${firebaseConfig.apiKey?.length})`);

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

