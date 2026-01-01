import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/userService';
import { getUserStats } from '@/services/statsService';
import { hasCompletedOnboarding } from '@/services/userService';
import { syncAllData } from '@/services/syncService';
import { debug, debugError, debugSuccess } from '@/utils/debug';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Professional loading messages that match actual loading steps
const LOADING_MESSAGES = [
  'Connecting to server...',
  'Loading your profile...',
  'Fetching your stats...',
  'Preparing questions...',
  'Setting up your dashboard...',
  'Almost ready...',
];

export default function LoadingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Prevent double navigation
  const hasNavigatedRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  // Simple loading indicator animation
  const dot1Opacity = useSharedValue(0.4);
  const dot2Opacity = useSharedValue(0.4);
  const dot3Opacity = useSharedValue(0.4);
  
  // Progress bar animation
  const progressWidth = useSharedValue(0);
  
  // Text fade animation
  const textOpacity = useSharedValue(1);

  // Animate loading dots (subtle pulse)
  useEffect(() => {
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    
    dot2Opacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    
    dot3Opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, []);

  // Messages are now controlled by the loading process, not a timer

  // Load user data and navigate
  useEffect(() => {
    // Prevent double execution
    if (isLoadingRef.current || hasNavigatedRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    
    const loadDataAndNavigate = async () => {
      if (!user?.uid) {
        debugError('navigation', 'No user found, redirecting to login');
        router.replace('/');
        return;
      }
      
      // Check if already navigated
      if (hasNavigatedRef.current) {
        return;
      }

      const startTime = Date.now();
      const stepDuration = 400; // Each step lasts 400ms (2.5s total for 6 steps)
      const minDisplayTime = 2500; // Minimum 2.5 seconds total

      // Helper function to update message with smooth fade
      const updateMessage = async (index: number) => {
        // Fade out current message
        textOpacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Update message
        setCurrentMessageIndex(index);
        
        // Fade in new message
        textOpacity.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) });
      };

      try {
        debug('ui', 'Starting to load user data...');
        
        // Initial connection phase
        await updateMessage(0); // "Connecting to server..."
        setProgress(10);
        progressWidth.value = withTiming(10, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Load profile
        debug('ui', 'Loading profile...');
        await updateMessage(1); // "Loading your profile..."
        setProgress(30);
        progressWidth.value = withTiming(30, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        await getUserProfile(user.uid);
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Load stats
        debug('ui', 'Loading stats...');
        await updateMessage(2); // "Fetching your stats..."
        setProgress(55);
        progressWidth.value = withTiming(55, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        await getUserStats(user.uid).catch((error) => {
          debugError('ui', 'Error loading stats:', error);
        });
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Preparing questions
        await updateMessage(3); // "Preparing questions..."
        setProgress(75);
        progressWidth.value = withTiming(75, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Setting up dashboard
        await updateMessage(4); // "Setting up your dashboard..."
        setProgress(90);
        progressWidth.value = withTiming(90, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Sync data in background (don't block navigation)
        debug('ui', 'Syncing data...');
        syncAllData()
          .then((result) => {
            if (result.success) {
              debugSuccess('sync', 'Data synced successfully on app load');
            } else {
              debugError('sync', 'Data sync completed with errors:', result.errors);
            }
          })
          .catch((error) => {
            debugError('sync', 'Data sync failed on app load:', error);
          });

        // Check onboarding status
        debug('ui', 'Checking onboarding status...');
        await updateMessage(5); // "Almost ready..."
        const hasOnboarded = await hasCompletedOnboarding(user.uid);
        setProgress(100);
        progressWidth.value = withTiming(100, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        });
        debugSuccess('ui', 'All data loaded successfully');
        await new Promise(resolve => setTimeout(resolve, stepDuration));

        // Ensure minimum display time
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        await new Promise(resolve => setTimeout(resolve, remainingTime));

        // Navigate based on onboarding status (only once)
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          if (hasOnboarded) {
            debug('navigation', 'Navigating to home...');
            router.replace('/home');
          } else {
            debug('navigation', 'Navigating to onboarding...');
            router.replace('/onboarding');
          }
        }
      } catch (error) {
        debugError('ui', 'Error loading user data:', error);
        // Still navigate even on error
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Try to check onboarding and navigate (only once)
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          try {
            const hasOnboarded = await hasCompletedOnboarding(user.uid);
            if (hasOnboarded) {
              router.replace('/home');
            } else {
              router.replace('/onboarding');
            }
          } catch {
            router.replace('/home'); // Fallback to home
          }
        }
      }
    };

    loadDataAndNavigate();
  }, [user?.uid, router]);

  // Animated styles
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
      <View style={styles.content}>
        {/* App Name - matching index page style */}
        <Text style={styles.appName}>
          <Text style={styles.appNameAccent}>flash</Text>bits
        </Text>

        {/* Tagline - matching index page style */}
        <Text style={styles.tagline}>
          Master coding interviews, one swipe at a time
        </Text>

        {/* Loading Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>

        {/* Current Message with smooth fade */}
        <Animated.View style={[styles.messageContainer, textStyle]}>
          <Text style={styles.message}>{LOADING_MESSAGES[currentMessageIndex]}</Text>
        </Animated.View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.8,
  },
  appName: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  appNameAccent: {
    color: colors.primary,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.4,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    height: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  messageContainer: {
    minHeight: 24,
    marginBottom: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: typography.fontSize.xs,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 2,
    backgroundColor: colors.cardSubtle,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
    // Add subtle glow effect
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
});
