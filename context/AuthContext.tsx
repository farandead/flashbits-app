import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
  User,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  OAuthProvider,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  ConfirmationResult,
  GithubAuthProvider,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import the pre-configured auth instance with persistence
import { auth } from '@/config/firebase';
import { debug, debugSuccess, debugError } from '@/utils/debug';
import { deleteUserData, clearCachedProfile } from '@/services/userService';
import { logOutRevenueCat } from '@/services/revenueCatService';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getRemainingBlockTime,
  formatRemainingTime,
} from '@/utils/rateLimit';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Auth methods
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  
  // Email auth
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // Phone auth
  sendPhoneVerification: (phoneNumber: string) => Promise<ConfirmationResult | null>;
  confirmPhoneCode: (confirmation: ConfirmationResult, code: string) => Promise<boolean>;
  
  // For native sign-in (credentials from expo-auth-session)
  signInWithGitHubCredential: (accessToken: string) => Promise<boolean>;
  signInWithAppleCredential: (identityToken: string, nonce: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug: Log initial auth state and check AsyncStorage
  useEffect(() => {
    debug('auth', 'Setting up auth state listener...');
    debug('auth', 'Initial auth.currentUser:', auth.currentUser?.email || auth.currentUser?.uid || 'null');
    
    // Debug: Check what Firebase has stored in AsyncStorage
    const checkAsyncStorage = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const firebaseKeys = keys.filter(k => k.includes('firebase') || k.includes('auth'));
        debug('storage', 'Firebase-related AsyncStorage keys:', firebaseKeys);
        
        for (const key of firebaseKeys) {
          const value = await AsyncStorage.getItem(key);
          debug('storage', `${key}:`, value ? value.substring(0, 100) + '...' : 'null');
        }
      } catch (e) {
        debugError('storage', 'Error checking AsyncStorage:', e);
      }
    };
    checkAsyncStorage();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    debug('auth', 'Subscribing to onAuthStateChanged...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      debug('auth', 'Auth state changed!');
      if (user) {
        debugSuccess('auth', 'User logged in:', user.email || user.uid);
        
        // Validate and refresh token on auth state change
        try {
          await user.reload();
          debug('auth', 'User token validated successfully');
        } catch (error) {
          debugError('auth', 'Error validating user token:', error);
          // Token might be expired, but Firebase will handle it
        }
        
        // Initialize notifications for user (handles app reinstall scenario)
        // If user previously enabled notifications, automatically request permissions
        try {
          const { notificationService } = await import('@/services/notificationService');
          await notificationService.initializeNotificationsForUser(user.uid);
        } catch (error) {
          // Non-critical - don't block auth flow if notification init fails
          debugError('auth', 'Error initializing notifications:', error);
        }
      } else {
        debug('auth', 'No user (logged out or not persisted)');
      }
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign out
  const signOut = async () => {
    try {
      // Clear cached profile before signing out
      const currentUser = auth.currentUser;
      if (currentUser) {
        await clearCachedProfile(currentUser.uid);
      }
      await firebaseSignOut(auth);
    } catch (error) {
      debugError('auth', 'Sign out error:', error);
      throw error;
    }
  };

  // Delete account
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No user is currently signed in.' };
      }

      const userId = currentUser.uid;
      debug('auth', 'Starting account deletion for user:', userId);

      // Step 1: Delete user data from Firestore
      try {
        await deleteUserData(userId);
        debugSuccess('auth', 'User data deleted from Firestore');
      } catch (error: any) {
        debugError('auth', 'Error deleting user data:', error);
        // Continue with account deletion even if Firestore deletion fails
        // (user can contact support to clean up orphaned data)
      }

      // Step 2: Log out from RevenueCat
      try {
        await logOutRevenueCat();
        debugSuccess('auth', 'Logged out from RevenueCat');
      } catch (error: any) {
        debugError('auth', 'Error logging out from RevenueCat:', error);
        // Continue with account deletion even if RevenueCat logout fails
      }

      // Step 3: Delete Firebase Auth account
      await firebaseDeleteUser(currentUser);
      debugSuccess('auth', 'Firebase Auth account deleted');

      return { success: true };
    } catch (error: any) {
      debugError('auth', 'Error deleting account:', error);
      let errorMessage = 'Failed to delete account. Please try again.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please sign out and sign back in before deleting your account.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Email Sign Up
  const signUpWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize email for rate limiting
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check rate limit
      const rateLimitCheck = await checkRateLimit(normalizedEmail);
      if (rateLimitCheck.isBlocked) {
        const remainingTime = rateLimitCheck.retryAfter 
          ? formatRemainingTime(Math.ceil((rateLimitCheck.retryAfter - Date.now()) / 1000))
          : '30 minutes';
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${remainingTime}.`,
        };
      }

      await createUserWithEmailAndPassword(auth, email, password);
      
      // Clear rate limit on successful signup
      await clearRateLimit(normalizedEmail);
      
      return { success: true };
    } catch (error: any) {
      debugError('auth', 'Email sign up error:', error);
      
      // Record failed attempt for rate limiting
      const normalizedEmail = email.toLowerCase().trim();
      await recordFailedAttempt(normalizedEmail);
      
      // Parse Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      
      // Check if rate limited after this attempt
      const rateLimitCheck = await checkRateLimit(normalizedEmail);
      if (rateLimitCheck.isBlocked) {
        const remainingTime = rateLimitCheck.retryAfter 
          ? formatRemainingTime(Math.ceil((rateLimitCheck.retryAfter - Date.now()) / 1000))
          : '30 minutes';
        errorMessage = `Too many failed attempts. Please try again in ${remainingTime}.`;
      } else if (rateLimitCheck.remainingAttempts !== undefined && rateLimitCheck.remainingAttempts <= 2) {
        errorMessage += ` (${rateLimitCheck.remainingAttempts} attempt${rateLimitCheck.remainingAttempts !== 1 ? 's' : ''} remaining)`;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Email Sign In
  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize email for rate limiting
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check rate limit
      const rateLimitCheck = await checkRateLimit(normalizedEmail);
      if (rateLimitCheck.isBlocked) {
        const remainingTime = rateLimitCheck.retryAfter 
          ? formatRemainingTime(Math.ceil((rateLimitCheck.retryAfter - Date.now()) / 1000))
          : '30 minutes';
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${remainingTime}.`,
        };
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      // Clear rate limit on successful signin
      await clearRateLimit(normalizedEmail);
      
      return { success: true };
    } catch (error: any) {
      debugError('auth', 'Email sign in error:', error);
      
      // Record failed attempt for rate limiting
      const normalizedEmail = email.toLowerCase().trim();
      await recordFailedAttempt(normalizedEmail);
      
      // Parse Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Try signing up instead.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      // Check if rate limited after this attempt
      const rateLimitCheck = await checkRateLimit(normalizedEmail);
      if (rateLimitCheck.isBlocked) {
        const remainingTime = rateLimitCheck.retryAfter 
          ? formatRemainingTime(Math.ceil((rateLimitCheck.retryAfter - Date.now()) / 1000))
          : '30 minutes';
        errorMessage = `Too many failed attempts. Please try again in ${remainingTime}.`;
      } else if (rateLimitCheck.remainingAttempts !== undefined && rateLimitCheck.remainingAttempts <= 2) {
        errorMessage += ` (${rateLimitCheck.remainingAttempts} attempt${rateLimitCheck.remainingAttempts !== 1 ? 's' : ''} remaining)`;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Send Password Reset Email
  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Basic email validation
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      await firebaseSendPasswordResetEmail(auth, normalizedEmail);
      debugSuccess('auth', 'Password reset email sent to:', normalizedEmail);
      
      return { success: true };
    } catch (error: any) {
      debugError('auth', 'Password reset error:', error);
      
      // Parse Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        // Don't reveal if user exists - security best practice
        // Still return success to prevent email enumeration
        debug('auth', 'User not found, but returning success for security');
        return { success: true };
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Phone Authentication - Send verification code
  const sendPhoneVerification = async (phoneNumber: string): Promise<ConfirmationResult | null> => {
    try {
      // Note: For React Native, you'll need to use @react-native-firebase/auth
      // This is a placeholder for the web SDK approach
      // In production, use react-native-firebase for better phone auth support
      debug('auth', 'Phone verification would be sent to:', phoneNumber);
      return null;
    } catch (error) {
      debugError('auth', 'Phone verification error:', error);
      throw error;
    }
  };

  // Phone Authentication - Confirm code
  const confirmPhoneCode = async (
    confirmation: ConfirmationResult,
    code: string
  ): Promise<boolean> => {
    try {
      await confirmation.confirm(code);
      return true;
    } catch (error) {
      debugError('auth', 'Phone code confirmation error:', error);
      return false;
    }
  };

  // GitHub Sign In with credential (from expo-auth-session)
  const signInWithGitHubCredential = async (accessToken: string): Promise<boolean> => {
    try {
      const credential = GithubAuthProvider.credential(accessToken);
      await signInWithCredential(auth, credential);
      return true;
    } catch (error) {
      debugError('auth', 'GitHub sign in error:', error);
      return false;
    }
  };

  // Apple Sign In with credential
  const signInWithAppleCredential = async (
    identityToken: string,
    nonce: string
  ): Promise<boolean> => {
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });
      await signInWithCredential(auth, credential);
      return true;
    } catch (error) {
      debugError('auth', 'Apple sign in error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        deleteAccount,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordResetEmail,
        sendPhoneVerification,
        confirmPhoneCode,
        signInWithGitHubCredential,
        signInWithAppleCredential,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { auth };

