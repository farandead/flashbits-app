import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Auth methods
  signOut: () => Promise<void>;
  
  // Email auth
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  
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
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      debug('auth', 'Auth state changed!');
      if (user) {
        debugSuccess('auth', 'User logged in:', user.email || user.uid);
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
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Email Sign Up
  const signUpWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Email sign up error:', error);
      // Parse Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      return { success: false, error: errorMessage };
    }
  };

  // Email Sign In
  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Email sign in error:', error);
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
      return { success: false, error: errorMessage };
    }
  };

  // Phone Authentication - Send verification code
  const sendPhoneVerification = async (phoneNumber: string): Promise<ConfirmationResult | null> => {
    try {
      // Note: For React Native, you'll need to use @react-native-firebase/auth
      // This is a placeholder for the web SDK approach
      // In production, use react-native-firebase for better phone auth support
      console.log('Phone verification would be sent to:', phoneNumber);
      return null;
    } catch (error) {
      console.error('Phone verification error:', error);
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
      console.error('Phone code confirmation error:', error);
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
      console.error('GitHub sign in error:', error);
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
      console.error('Apple sign in error:', error);
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
        signUpWithEmail,
        signInWithEmail,
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

