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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { hasCompletedOnboarding } from '@/services/userService';
import SignInLoadingScreen from '@/components/SignInLoadingScreen';
import { debug, debugSuccess } from '@/utils/debug';

// Required for web browser auth to work properly
WebBrowser.maybeCompleteAuthSession();

// GitHub OAuth Config
const GITHUB_CLIENT_ID = 'Ov23lilGvTP0FLJSbpkD';

// Manual GitHub OAuth discovery (GitHub doesn't support auto-discovery)
const githubDiscovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  revocationEndpoint: `https://github.com/settings/connections/applications/${GITHUB_CLIENT_ID}`,
};

// Google OAuth Config
const GOOGLE_CLIENT_ID = '258968844420-4n2s0fqg8a0dpmdn13cfq9vpq6f1p1c5.apps.googleusercontent.com'; // You'll need to set this

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthStep = 'choose' | 'email-input' | 'verify-email';

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
  const { user, isAuthenticated, isLoading: authLoading, signUpWithEmail, signInWithEmail, signInWithGitHubCredential } = useAuth();

  // State declarations
  const [authStep, setAuthStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignInLoading, setShowSignInLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // Prevent double redirects
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState(''); // Store email for verification screen

  // Get the redirect URI - log it to help with GitHub setup
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'flashprep',
    path: 'auth',
  });

  // GitHub OAuth request with manual discovery
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['read:user', 'user:email'],
      redirectUri,
      usePKCE: false, // Disable PKCE since we're using a secure backend
    },
    githubDiscovery
  );

  // Redirect to home if user is already authenticated (on app launch only)
  // This effect should ONLY redirect when the app launches with a persisted user
  // It should NOT redirect during an active login flow (when isLoading or showSignInLoading is true)
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      debug('navigation', 'Checking auth state...', { 
        isAuthenticated, 
        authLoading, 
        user: user?.email, 
        isRedirecting,
        isLoading,
        showSignInLoading 
      });
      
      if (authLoading) {
        // Still loading auth state, wait
        return;
      }

      // If a login is in progress, don't redirect from here
      // Let the login handler do its own redirect
      if (isLoading || showSignInLoading || isRedirecting) {
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
        
        if (completedOnboarding) {
          debugSuccess('navigation', 'Onboarding complete, redirecting to home...');
          router.replace('/home');
        } else {
          debug('navigation', 'Needs onboarding, redirecting...');
          router.replace('/onboarding');
        }
      } else {
        debug('navigation', 'No authenticated user, showing login screen');
        setCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
  }, [isAuthenticated, authLoading, user, router, isRedirecting, isLoading, showSignInLoading]);
  
  // Log redirect URI for debugging (check your console!)
  useEffect(() => {
    console.log('🔗 GitHub OAuth Redirect URI:', redirectUri);
    console.log('👆 Copy this EXACTLY to your GitHub OAuth App callback URL');
  }, [redirectUri]);

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
      // Replace with your actual Cloud Function URL after deployment
      const CLOUD_FUNCTION_URL = 'https://us-central1-flashprep-11c85.cloudfunctions.net/exchangeGitHubCode';
      
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json() as {
        customToken?: string;
        user?: { uid: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      if (!data.customToken || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Sign in to Firebase with the custom token
      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      
      await signInWithCustomToken(auth, data.customToken);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Prevent useEffect from also redirecting
      setIsRedirecting(true);
      
      // Show the fun loading screen
      setIsLoading(false);
      setShowSignInLoading(true);
      
      // Check if new user needs onboarding
      const hasOnboarded = await hasCompletedOnboarding(data.user.uid);
      
      // Small delay to show the loading screen
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate based on onboarding status
      const targetRoute = hasOnboarded ? '/home' : '/onboarding';
      debug('navigation', 'Navigating to:', targetRoute);
      router.replace(targetRoute);
      
    } catch (error: any) {
      console.error('GitHub auth error:', error);
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

      // Show the fun loading screen
      setIsLoading(false);
      setShowSignInLoading(true);

      // Check if new user needs onboarding
      const user = auth.currentUser;
      if (user) {
        const hasOnboarded = await hasCompletedOnboarding(user.uid);
        
        // Small delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (hasOnboarded) {
          router.replace('/home');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (error: any) {
      console.error('Apple auth error:', error);
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
      console.error('GitHub sign in error:', error);
      Alert.alert('Error', 'GitHub sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');

      // Use Expo's auth proxy for a stable HTTPS redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        native: 'flashprep://auth',
        useProxy: true,
      } as any);

      console.log('🔗 Google OAuth Redirect URI:', redirectUri);
      console.log('👆 This should be: https://auth.expo.io/@deadshotz/flashprep');

      const discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );

      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
      });

      const result = await authRequest.promptAsync(discovery);

      if (result.type === 'success') {
        const { id_token } = result.params;
        
        const credential = GoogleAuthProvider.credential(id_token);
        await signInWithCredential(auth, credential);

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Prevent useEffect from also redirecting
        setIsRedirecting(true);

        // Show the fun loading screen
        setIsLoading(false);
        setShowSignInLoading(true);

        // Check if new user needs onboarding
        const user = auth.currentUser;
        if (user) {
          const hasOnboarded = await hasCompletedOnboarding(user.uid);
          
          // Small delay to show the loading screen
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          if (hasOnboarded) {
            router.replace('/home');
          } else {
            router.replace('/onboarding');
          }
        }
      } else {
        setIsLoading(false);
        if (result.type !== 'cancel') {
          Alert.alert('Error', 'Google sign in was cancelled or failed.');
        }
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Google sign in failed. Please try again.');
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
            console.error('Failed to send verification email:', error);
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
        
        // Show the fun loading screen
        setIsLoading(false);
        setShowSignInLoading(true);
        
        // Small delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if user needs onboarding
        const { auth } = await import('@/config/firebase');
        const currentUser = auth.currentUser;
        if (currentUser) {
          const hasOnboarded = await hasCompletedOnboarding(currentUser.uid);
          if (hasOnboarded) {
            router.replace('/home');
          } else {
            router.replace('/onboarding');
          }
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
          setShowSignInLoading(true);
          
          // Small delay to show the loading screen
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Proceed to onboarding
          router.replace('/onboarding');
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
      console.error('Error checking verification:', error);
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
      console.error('Error resending verification:', error);
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
      console.error('Error signing out:', error);
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
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </Text>
      <Text style={styles.phoneSubtitle}>
        {isSignUp ? 'Enter your email and create a password' : 'Sign in to continue'}
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
            source={require('@/assets/icons/icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>flashbits</Text>
        <Text style={styles.tagline}>
          Master coding interviews{'\n'}one swipe at a time
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

        {/* Google Sign In */}
        <Pressable
          style={styles.authButton}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
          <Text style={styles.authButtonText}>Continue with Google</Text>
        </Pressable>

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
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );

  // Show loading screen during sign-in
  if (showSignInLoading) {
    return <SignInLoadingScreen message="Signing in" />;
  }

  // Render current step based on authStep
  const renderCurrentStep = () => {
    switch (authStep) {
      case 'choose':
        return renderAuthOptions();
      case 'email-input':
        return renderEmailInput();
      case 'verify-email':
        return renderVerifyEmail();
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
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  authButtonsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: spacing.sm,
  },
  authButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
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
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  termsText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  termsLink: {
    color: colors.primary,
  },
  
  // Email Input Styles
  emailInputContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  phoneSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.lg,
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
});

