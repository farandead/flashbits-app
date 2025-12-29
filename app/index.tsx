import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  LayoutAnimation,
  UIManager,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';

// Conditionally import Google Sign-In (only available in development/production builds, not Expo Go)
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  if (__DEV__) {
    debugWarn('auth', 'Google Sign-In not available (requires development build, not Expo Go)');
  }
}
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { hasCompletedOnboarding } from '@/services/userService';
// SignInLoadingScreen removed - using InteractiveLoadingOverlay on destination screens instead
import { debug, debugSuccess, debugError, debugWarn } from '@/utils/debug';

// Required for web browser auth to work properly
WebBrowser.maybeCompleteAuthSession();

// GitHub OAuth Config
// Uses environment variable
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;

if (!GITHUB_CLIENT_ID) {
  if (__DEV__) {
    debugWarn('auth', 'EXPO_PUBLIC_GITHUB_CLIENT_ID not set. GitHub sign-in will not work.');
  }
}

// Manual GitHub OAuth discovery (GitHub doesn't support auto-discovery)
const githubDiscovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  revocationEndpoint: `https://github.com/settings/connections/applications/${GITHUB_CLIENT_ID}`,
};

// Google OAuth Config
// IMPORTANT: For Firebase Auth, we need the WEB client ID (not iOS/Android client IDs)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthStep = 'choose' | 'email-input' | 'verify-email' | 'forgot-password' | 'forgot-password-confirmation';

// Password strength calculation
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordCheck {
  label: string;
  met: boolean;
}

const getPasswordStrength = (password: string): { strength: PasswordStrength; checks: PasswordCheck[] } => {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /[0-9]/.test(password) },
  ];

  const metCount = checks.filter(c => c.met).length;

  let strength: PasswordStrength = 'weak';
  if (metCount === 4) strength = 'strong';
  else if (metCount === 3) strength = 'good';
  else if (metCount === 2) strength = 'fair';

  return { strength, checks };
};

const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong': return colors.correct;
    case 'good': return '#3B82F6';
    case 'fair': return colors.warning;
    default: return colors.incorrect;
  }
};

const getStrengthLabel = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong': return 'Strong';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    default: return 'Weak';
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, signUpWithEmail, signInWithEmail, sendPasswordResetEmail, signInWithGitHubCredential } = useAuth();

  // State declarations
  const [authStep, setAuthStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Removed showSignInLoading - navigation happens immediately now
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // Prevent double redirects
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState(''); // Store email for verification screen
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState(''); // Store email for forgot password

  // Configure Google Sign-In on mount
  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID || !GoogleSignin) return;

    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // optional
        offlineAccess: false,
      });
    } catch (error) {
      debugWarn('auth', 'Failed to configure Google Sign-In:', error);
    }
  }, []);

  // Get the redirect URI - force custom URL scheme (flashbits://auth)
  // IMPORTANT: Must use development build, NOT Expo Go (Expo Go uses exp:// which changes)
  // This ensures a stable redirect URI that matches GitHub OAuth App settings
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'flashbits',
    path: 'auth',
  });
  
  // Debug: Log redirect URI
  useEffect(() => {
    if (__DEV__) {
      debug('auth', 'GitHub OAuth Redirect URI:', redirectUri);
      debug('auth', 'Set this EXACTLY in your GitHub OAuth App → Authorization callback URL');
      debug('auth', 'Should be: flashbits://auth');
    }
    if (!redirectUri.startsWith('flashbits://')) {
      if (__DEV__) {
        debugWarn('auth', 'WARNING: Redirect URI is not using flashbits:// scheme!');
        debugWarn('auth', 'This will fail in GitHub OAuth. Make sure you are using a development build, not Expo Go.');
      }
    }
  }, [redirectUri]);
  

  // GitHub OAuth request with manual discovery
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID || '',
      scopes: ['read:user', 'user:email'],
      redirectUri,
      usePKCE: false, // Disable PKCE since we're using a secure backend
    },
    githubDiscovery
  );

  // Redirect to home if user is already authenticated (on app launch only)
  // This effect should ONLY redirect when the app launches with a persisted user
      // It should NOT redirect during an active login flow (when isLoading is true)
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      debug('navigation', 'Checking auth state...', { 
        isAuthenticated, 
        authLoading, 
        user: user?.email, 
        isRedirecting,
        isLoading,
      });
      
      if (authLoading) {
        // Still loading auth state, wait
        return;
      }

      // If a login is in progress, don't redirect from here
      // Let the login handler do its own redirect
      if (isLoading || isRedirecting) {
        debug('navigation', 'Login in progress, skipping useEffect redirect');
        setCheckingAuth(false);
        return;
      }

      if (isAuthenticated && user) {
        debugSuccess('auth', 'User already authenticated on app launch...');
        
        // Check if this is an email/password user who hasn't verified their email
        const isEmailUser = user.providerData[0]?.providerId === 'password';
        
        if (isEmailUser && !user.emailVerified) {
          debug('auth', 'Email user not verified, showing verification screen');
          setVerificationEmail(user.email || '');
          setAuthStep('verify-email');
          setCheckingAuth(false);
          return;
        }
        
        setIsRedirecting(true); // Prevent any other redirects
        
        // User is logged in and verified, check if they completed onboarding
        const completedOnboarding = await hasCompletedOnboarding(user.uid);
        
        // Navigate to loading screen - it will load data and navigate to home/onboarding
        debugSuccess('navigation', 'User authenticated, redirecting to loading screen...');
        router.replace('/loading');
      } else {
        debug('navigation', 'No authenticated user, showing login screen');
        setCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
  }, [isAuthenticated, authLoading, user, router, isRedirecting, isLoading]);

  // Handle GitHub OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleGitHubCodeExchange(code);
    } else if (response?.type === 'error') {
      Alert.alert('Error', 'GitHub sign in was cancelled or failed.');
    }
  }, [response]);


  // Exchange code for token via Firebase Cloud Function
  const handleGitHubCodeExchange = async (code: string) => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Call your Firebase Cloud Function
      // Uses environment variable, falls back to default for development
      const CLOUD_FUNCTION_URL = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL;
      
      if (!CLOUD_FUNCTION_URL) {
        throw new Error('EXPO_PUBLIC_CLOUD_FUNCTION_URL is not set');
      }
      
      // Add timeout to fetch request (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Check if response is OK and has JSON content
      if (!response.ok) {
        const errorText = await response.text();
        debugError('auth', 'GitHub auth server error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        debugError('auth', 'GitHub auth non-JSON response:', errorText);
        throw new Error('Server returned non-JSON response');
      }

      // Parse JSON response
      let data: {
        customToken?: string;
        user?: { uid: string };
        error?: string;
      };
      
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        debugError('auth', 'GitHub auth JSON parse error:', parseError);
        throw new Error('Failed to parse server response');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.customToken || !data.user) {
        throw new Error('Invalid response from server: missing customToken or user');
      }

      // Sign in to Firebase with the custom token
      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      
      await signInWithCustomToken(auth, data.customToken);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Prevent useEffect from also redirecting
      setIsRedirecting(true);
      
      // Navigate immediately - loading will happen on destination screen
      setIsLoading(false);
      
      // Check if new user needs onboarding (in background)
      const hasOnboarded = await hasCompletedOnboarding(data.user.uid);
      
        // Navigate to loading screen - it will load data and navigate to home/onboarding
        debug('navigation', 'Navigating to loading screen...');
        router.replace('/loading');
      
    } catch (error: any) {
      debugError('auth', 'GitHub auth error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to complete GitHub sign in.');
      setIsLoading(false);
    }
  };
  
  // Apple Sign-In availability check
  useEffect(() => {
    const checkAppleAuth = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    };
    checkAppleAuth();
  }, []);

  // Show loading while checking auth - MUST be after all hooks
  if (authLoading || checkingAuth) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in to Firebase with Apple credential
      const { OAuthProvider, signInWithCredential } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');

      const provider = new OAuthProvider('apple.com');
      const oauthCredential = provider.credential({
        idToken: credential.identityToken!,
      });

      await signInWithCredential(auth, oauthCredential);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Prevent useEffect from also redirecting
      setIsRedirecting(true);

      // Navigate immediately - loading will happen on destination screen
      setIsLoading(false);

      // Check if new user needs onboarding (in background)
      const user = auth.currentUser;
      if (user) {
        const hasOnboarded = await hasCompletedOnboarding(user.uid);
        
        // Navigate to loading screen - it will load data and navigate to home/onboarding
        router.replace('/loading');
      }
    } catch (error: any) {
      debugError('auth', 'Apple auth error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (error.code === 'ERR_CANCELED') {
        // User canceled the sign-in
        return;
      }
      
      Alert.alert('Error', error.message || 'Failed to complete Apple sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Commented out - Apple Sign In (add back later)
  // const handleAppleSignIn = async () => {
  //   try {
  //     setIsLoading(true);
  //     await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //     const credential = await AppleAuthentication.signInAsync({
  //       requestedScopes: [
  //         AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
  //         AppleAuthentication.AppleAuthenticationScope.EMAIL,
  //       ],
  //     });
  //     if (credential.identityToken) {
  //       Alert.alert('Apple Sign In', 'Apple authentication successful!',
  //         [{ text: 'Continue', onPress: () => router.replace('/home') }]);
  //     }
  //   } catch (error: any) {
  //     if (error.code !== 'ERR_REQUEST_CANCELED') {
  //       Alert.alert('Error', 'Apple sign in failed. Please try again.');
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // GitHub Sign In
  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (!request) {
        Alert.alert('Error', 'GitHub sign in is not ready. Please try again.');
        return;
      }
      
      await promptAsync();
    } catch (error) {
      debugError('auth', 'GitHub sign in error:', error);
      Alert.alert('Error', 'GitHub sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In using @react-native-google-signin/google-signin
  // This is the recommended approach by Expo and avoids redirect URI issues
  // Note: Requires development build, not available in Expo Go
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check if Google Sign-In is available (not available in Expo Go)
      if (!GoogleSignin) {
        Alert.alert(
          'Google Sign-In Not Available',
          'Google Sign-In requires a development build. Please build the app using:\n\nnpx expo run:ios\nor\nnpx expo run:android\n\nExpo Go does not support this feature.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');

      if (!GOOGLE_WEB_CLIENT_ID) {
        Alert.alert('Error', 'Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
        setIsLoading(false);
        return;
      }

      // Check if Google Play Services are available (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      // Validate response structure
      if (!userInfo) {
        throw new Error('Google Sign-In returned no user information. Please try again.');
      }
      
      if (!userInfo.data) {
        throw new Error('Google Sign-In response is missing data. Please try again.');
      }
      
      const idToken = userInfo.data.idToken;
      
      if (!idToken) {
        throw new Error('No idToken returned from Google Sign-In. Please try again.');
      }

  

      // Create Firebase credential and sign in
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Prevent useEffect from also redirecting
      setIsRedirecting(true);

      // Navigate immediately - loading will happen on destination screen
      setIsLoading(false);

      // Check if new user needs onboarding (in background)
      const user = auth.currentUser;
      if (user) {
        const hasOnboarded = await hasCompletedOnboarding(user.uid);
        
        // Navigate to loading screen first - it will load data and then navigate to home/onboarding
        router.replace('/loading');
      }
    } catch (error: any) {
      debugError('auth', 'Google sign in error:', error);
      
      // Handle user cancellation gracefully
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === '10') {
        // User cancelled, don't show error
        setIsLoading(false);
        return;
      }
      
      // Handle specific error cases
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        switch (error.code) {
          case 'SIGN_IN_REQUIRED':
            errorMessage = 'Please sign in to your Google account.';
            break;
          case 'INVALID_ACCOUNT':
            errorMessage = 'Invalid Google account. Please try a different account.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = `Google sign in failed (${error.code}). Please try again.`;
        }
      }
      
      Alert.alert('Sign In Error', errorMessage);
      setIsLoading(false);
    }
  };

  // Handle Email Sign In / Sign Up
  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Use Firebase auth
      const result = isSignUp 
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
      
      if (result.success) {
        // Send verification email for new signups
        if (isSignUp) {
          try {
            const { sendEmailVerification } = await import('firebase/auth');
            const { auth } = await import('@/config/firebase');
            
            const currentUser = auth.currentUser;
            if (currentUser && !currentUser.emailVerified) {
              await sendEmailVerification(currentUser);
              // Store email and show verification screen
              setVerificationEmail(email);
              setIsLoading(false);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAuthStep('verify-email');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return; // Don't proceed to onboarding until verified
            }
          } catch (error) {
            debugError('auth', 'Failed to send verification email:', error);
            // Show verification screen anyway - they can resend
            setVerificationEmail(email);
            setIsLoading(false);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAuthStep('verify-email');
            return;
          }
        } else {
          // Existing user signing in - check if email is verified
          const { auth } = await import('@/config/firebase');
          const currentUser = auth.currentUser;
          
          if (currentUser && !currentUser.emailVerified && currentUser.providerData[0]?.providerId === 'password') {
            // Unverified email user - show verification screen
            setVerificationEmail(currentUser.email || email);
            setIsLoading(false);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAuthStep('verify-email');
            return;
          }
        }

        // User is verified or using OAuth - proceed normally
        // Prevent useEffect from also redirecting
        setIsRedirecting(true);
        
        // Navigate immediately - loading will happen on destination screen
        setIsLoading(false);
        
        // Check if user needs onboarding (in background)
        const { auth } = await import('@/config/firebase');
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Navigate to loading screen - it will load data and navigate to home/onboarding
          router.replace('/loading');
        }
      } else {
        Alert.alert('Error', result.error || 'Authentication failed.');
        setIsLoading(false);
      }
    } catch (error: any) {
      const message = error?.message || 'Authentication failed. Please try again.';
      Alert.alert('Error', message);
      setIsLoading(false);
    }
  };


  // Skip login (for development)
  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/home');
  };


  // Check email verification status
  const handleCheckVerification = async () => {
    try {
      setIsCheckingVerification(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const { auth } = await import('@/config/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Reload user to get latest emailVerified status
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Prevent useEffect from also redirecting
          setIsRedirecting(true);
          setIsCheckingVerification(false);
          
          // Navigate to loading screen - it will load data and navigate to onboarding
          router.replace('/loading');
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Not verified yet',
            'Please check your email and click the verification link, then try again.',
            [{ text: 'OK' }]
          );
          setIsCheckingVerification(false);
        }
      }
    } catch (error) {
      debugError('auth', 'Error checking verification:', error);
      setIsCheckingVerification(false);
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const { sendEmailVerification } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        await sendEmailVerification(currentUser);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
      }
    } catch (error: any) {
      debugError('auth', 'Error resending verification:', error);
      if (error?.code === 'auth/too-many-requests') {
        Alert.alert('Too many requests', 'Please wait a few minutes before requesting another email.');
      } else {
        Alert.alert('Error', 'Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out and go back to login
  const handleBackToLogin = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      await signOut(auth);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAuthStep('choose');
      setEmail('');
      setPassword('');
      setVerificationEmail('');
    } catch (error) {
      debugError('auth', 'Error signing out:', error);
    }
  };

  // Render email verification step
  const renderVerifyEmail = () => (
    <View style={styles.phoneContainer}>
      <Pressable 
        style={styles.backButton}
        onPress={handleBackToLogin}
      >
        <View style={styles.backButtonContent}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backButtonText}>Use different email</Text>
        </View>
      </Pressable>

      <View style={styles.verifyIconContainer}>
        <Ionicons name="mail-unread-outline" size={48} color={colors.primary} />
      </View>

      <Text style={styles.phoneTitle}>Verify your email</Text>
      <Text style={styles.phoneSubtitle}>
        We've sent a verification link to
      </Text>
      <Text style={styles.verifyEmail}>{verificationEmail}</Text>

      <View style={styles.verifyInstructions}>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>Check your email inbox</Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>Click the verification link</Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>Come back and tap the button below</Text>
        </View>
      </View>

      <Pressable
        style={styles.submitButton}
        onPress={handleCheckVerification}
        disabled={isCheckingVerification}
      >
        {isCheckingVerification ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitButtonText}>I've verified my email</Text>
        )}
      </Pressable>

      <Pressable 
        style={styles.resendButton}
        onPress={handleResendVerification}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.resendButtonText}>Didn't receive it? Resend email</Text>
        )}
      </Pressable>
    </View>
  );

  // Render email input step
  const renderEmailInput = () => (
    <View style={styles.phoneContainer}>
      <Pressable 
        style={styles.backButton}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setAuthStep('choose');
          setEmail('');
          setPassword('');
        }}
      >
        <View style={styles.backButtonContent}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backButtonText}>Back</Text>
        </View>
      </Pressable>

      <Text style={styles.phoneTitle}>
        {isSignUp ? 'Create account' : 'Welcome back'}
      </Text>
      <Text style={styles.phoneSubtitle}>
        {isSignUp ? 'Enter your email and password' : 'Sign in to continue'}
      </Text>

      <View style={styles.emailInputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.emailInput}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.emailInput}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Password Strength Indicator - Only show during sign up */}
        {isSignUp && password.length > 0 && (() => {
          const { strength, checks } = getPasswordStrength(password);
          const strengthColor = getStrengthColor(strength);
          const strengthLabel = getStrengthLabel(strength);
          const progressWidth = strength === 'strong' ? 100 : strength === 'good' ? 75 : strength === 'fair' ? 50 : 25;

          return (
            <View style={styles.passwordStrengthContainer}>
              {/* Strength Bar */}
              <View style={styles.strengthBarContainer}>
                <View style={styles.strengthBarBackground}>
                  <View 
                    style={[
                      styles.strengthBarFill, 
                      { width: `${progressWidth}%`, backgroundColor: strengthColor }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                  {strengthLabel}
                </Text>
              </View>

              {/* Requirements Checklist */}
              <View style={styles.requirementsList}>
                {checks.map((check, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Ionicons 
                      name={check.met ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={14} 
                      color={check.met ? colors.correct : colors.textMuted} 
                    />
                    <Text style={[
                      styles.requirementText,
                      check.met && styles.requirementTextMet
                    ]}>
                      {check.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </View>

      {/* Forgot Password Link - Only show when signing in */}
      {!isSignUp && (
        <Pressable 
          style={styles.forgotPasswordLink}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setForgotPasswordEmail(email); // Pre-fill with current email if available
            setAuthStep('forgot-password');
          }}
        >
          <Text style={styles.forgotPasswordLinkText}>Forgot Password?</Text>
        </Pressable>
      )}

      <Pressable
        style={[
          styles.submitButton, 
          (!email.trim() || (isSignUp ? getPasswordStrength(password).strength === 'weak' : password.length < 6)) && styles.submitButtonDisabled
        ]}
        onPress={handleEmailSubmit}
        disabled={!email.trim() || (isSignUp ? getPasswordStrength(password).strength === 'weak' : password.length < 6) || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitButtonText}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        )}
      </Pressable>

      <Pressable 
        style={styles.toggleAuthMode}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsSignUp(!isSignUp);
        }}
      >
        <Text style={styles.toggleAuthModeText}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <Text style={styles.toggleAuthModeLink}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </Text>
        </Text>
      </Pressable>
    </View>
  );

  // Render phone input step

  // Render main auth options
  const renderAuthOptions = () => (
    <View>
      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/icons/in-app-icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>
          <Text style={styles.appNameAccent}>flash</Text>bits
        </Text>
        <Text style={styles.tagline}>
          Master coding interviews, one swipe at a time
        </Text>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtonsContainer}>
        {/* Email Sign In */}
        <Pressable
          style={styles.authButton}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAuthStep('email-input');
          }}
          disabled={isLoading}
        >
          <Ionicons name="mail-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.authButtonText}>Continue with Email</Text>
        </Pressable>

        {/* Google Sign In - Only show if available (requires development build) */}
        {GoogleSignin && (
          <Pressable
            style={styles.authButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
            <Text style={styles.authButtonText}>Continue with Google</Text>
          </Pressable>
        )}

        {/* GitHub Sign In */}
        <Pressable
          style={styles.authButton}
          onPress={handleGitHubSignIn}
          disabled={isLoading || !request}
        >
          <Ionicons name="logo-github" size={18} color={colors.textPrimary} />
          <Text style={styles.authButtonText}>Continue with GitHub</Text>
        </Pressable>

        {/* Apple Sign In - Only show on iOS */}
        {appleAuthAvailable && (
          <Pressable
            style={styles.authButton}
            onPress={handleAppleSignIn}
            disabled={isLoading}
          >
            <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
            <Text style={styles.authButtonText}>Continue with Apple</Text>
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Skip for now */}
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Continue as Guest</Text>
      </Pressable>

      {/* Terms */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text 
            style={styles.termsLink}
            onPress={() => Linking.openURL('https://flashbits.co/terms')}
          >
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text 
            style={styles.termsLink}
            onPress={() => Linking.openURL('https://flashbits.co/privacy')}
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </View>
  );

  // Note: Removed showSignInLoading - navigation happens immediately now
  // Loading overlay is shown on destination screens (home/onboarding)

  // Render forgot password input step
  const renderForgotPassword = () => (
    <View style={styles.phoneContainer}>
      <Pressable 
        style={styles.backButton}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setAuthStep('email-input');
          setForgotPasswordEmail('');
        }}
      >
        <View style={styles.backButtonContent}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backButtonText}>Back</Text>
        </View>
      </Pressable>

      <Text style={styles.phoneTitle}>Reset Password</Text>
      <Text style={styles.phoneSubtitle}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>

      <View style={styles.emailInputContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.emailInput}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={forgotPasswordEmail}
            onChangeText={setForgotPasswordEmail}
            autoFocus
          />
        </View>
      </View>

      <Pressable
        style={[
          styles.submitButton, 
          !forgotPasswordEmail.trim() && styles.submitButtonDisabled
        ]}
        onPress={async () => {
          if (!forgotPasswordEmail.trim()) return;
          
          setIsLoading(true);
          try {
            const result = await sendPasswordResetEmail(forgotPasswordEmail);
            setIsLoading(false);
            
            if (result.success) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAuthStep('forgot-password-confirmation');
            } else {
              Alert.alert('Error', result.error || 'Failed to send reset email. Please try again.');
            }
          } catch (error: any) {
            setIsLoading(false);
            Alert.alert('Error', 'Failed to send reset email. Please try again.');
          }
        }}
        disabled={!forgotPasswordEmail.trim() || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitButtonText}>Send Reset Link</Text>
        )}
      </Pressable>
    </View>
  );

  // Render forgot password confirmation step
  const renderForgotPasswordConfirmation = () => (
    <View style={styles.phoneContainer}>
      <View style={styles.confirmationContainer}>
        <View style={styles.confirmationIconContainer}>
          <Ionicons name="mail-outline" size={48} color={colors.primary} />
        </View>
        
        <Text style={styles.phoneTitle}>Check Your Email</Text>
        <Text style={styles.phoneSubtitle}>
          We've sent a password reset link to{'\n'}
          <Text style={styles.emailHighlight}>{forgotPasswordEmail}</Text>
        </Text>
        
        <Text style={styles.confirmationInstructions}>
          Click the link in the email to reset your password. If you don't see it, check your spam folder.
        </Text>

        <Pressable
          style={styles.submitButton}
          onPress={() => {
            const emailToPrefill = forgotPasswordEmail;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAuthStep('email-input');
            setEmail(emailToPrefill); // Pre-fill email for sign in
            setForgotPasswordEmail('');
          }}
        >
          <Text style={styles.submitButtonText}>Back to Sign In</Text>
        </Pressable>
      </View>
    </View>
  );

  // Render current step based on authStep
  const renderCurrentStep = () => {
    switch (authStep) {
      case 'choose':
        return renderAuthOptions();
      case 'email-input':
        return renderEmailInput();
      case 'verify-email':
        return renderVerifyEmail();
      case 'forgot-password':
        return renderForgotPassword();
      case 'forgot-password-confirmation':
        return renderForgotPasswordConfirmation();
      default:
        return renderAuthOptions();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background */}
      <View style={styles.backgroundBase} />
      <View style={styles.backgroundGlow} />

      {/* Content with smooth fade transition */}
      <Animated.View 
        key={authStep}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.contentContainer}
      >
        {renderCurrentStep()}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
  },
  contentContainer: {
    width: '100%',
  },
  backgroundBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  backgroundGlow: {
    // Removed - keeping it clean
    display: 'none',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    paddingTop: spacing['2xl'],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 74,
    height: 74,
  },
  appName: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  appNameAccent: {
    color: colors.primary,
  },
  tagline: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.4,
    paddingHorizontal: spacing.lg,
  },
  authButtonsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSubtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  authButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  termsContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  termsText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.4,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Email Input Styles
  emailInputContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  emailInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    letterSpacing: 0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  toggleAuthMode: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleAuthModeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  toggleAuthModeLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Password Strength Styles
  passwordStrengthContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strengthBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.sm,
  },
  requirementText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  requirementTextMet: {
    color: colors.correct,
  },
  
  // Phone Input Styles
  phoneContainer: {
    width: '100%',
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  phoneTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  phoneSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  countryCode: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  // Library phone input styles
  phoneInputLibContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  phoneInputLibTextContainer: {
    backgroundColor: 'transparent',
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    paddingVertical: 0,
  },
  phoneInputLibText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    height: 44,
  },
  phoneInputLibCode: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  phoneInputLibFlag: {
    backgroundColor: 'transparent',
  },
  phoneInputLibCountryButton: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  codeInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: typography.fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.textInverse,
  },
  resendButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resendButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Email Verification Styles
  verifyIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  verifyEmail: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  verifyInstructions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  instructionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  
  // Forgot Password Styles
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  forgotPasswordLinkText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  confirmationContainer: {
    alignItems: 'center',
    width: '100%',
  },
  confirmationIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  confirmationInstructions: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});

