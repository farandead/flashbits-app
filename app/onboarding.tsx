import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  LayoutAnimation,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { saveUserProfile, ValidationError } from '@/services/userService';
import { notificationService } from '@/services/notificationService';
import { initializeUserStats } from '@/services/statsService';
import { debug, debugError } from '@/utils/debug';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Onboarding step types
type OnboardingStep = 'welcome' | 'occupation' | 'level' | 'goals' | 'preview' | 'notifications' | 'complete';

// Options data
const OCCUPATIONS = [
  { id: 'student', label: 'Student', icon: 'school-outline' as const },
  { id: 'new_grad', label: 'New Graduate', icon: 'ribbon-outline' as const },
  { id: 'junior', label: 'Junior Developer', icon: 'code-slash-outline' as const },
  { id: 'mid', label: 'Mid-level Developer', icon: 'laptop-outline' as const },
  { id: 'senior', label: 'Senior Developer', icon: 'rocket-outline' as const },
  { id: 'career_change', label: 'Career Changer', icon: 'swap-horizontal-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

const CODING_LEVELS = [
  { 
    id: 'beginner', 
    label: 'Beginner', 
    description: 'Just starting out with coding',
    icon: 'leaf-outline' as const 
  },
  { 
    id: 'intermediate', 
    label: 'Intermediate', 
    description: 'Comfortable with basics, learning DSA',
    icon: 'trending-up-outline' as const 
  },
  { 
    id: 'advanced', 
    label: 'Advanced', 
    description: 'Strong DSA skills, practicing for interviews',
    icon: 'flash-outline' as const 
  },
  { 
    id: 'expert', 
    label: 'Expert', 
    description: 'Very comfortable, fine-tuning skills',
    icon: 'diamond-outline' as const 
  },
];

const GOALS = [
  { id: 'faang', label: 'Get into FAANG/Big Tech', icon: 'business-outline' as const },
  { id: 'first_job', label: 'Land my first tech job', icon: 'briefcase-outline' as const },
  { id: 'promotion', label: 'Get promoted at work', icon: 'arrow-up-outline' as const },
  { id: 'skills', label: 'Improve coding skills', icon: 'trending-up-outline' as const },
  { id: 'competitive', label: 'Competitive programming', icon: 'trophy-outline' as const },
  { id: 'learn', label: 'Just learning for fun', icon: 'heart-outline' as const },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [codingLevel, setCodingLevel] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const steps: OnboardingStep[] = ['welcome', 'occupation', 'level', 'goals', 'preview', 'notifications', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Animated progress bar
  const animatedProgress = useSharedValue(progress);
  
  useEffect(() => {
    animatedProgress.value = withSpring(progress, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
  }, [progress]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Save user profile to Firestore
      if (user) {
        await saveUserProfile(user.uid, {
          name,
          occupation,
          codingLevel,
          goals: selectedGoals,
          isPro: false, // Default to free tier
          onboardingCompleted: true,
          createdAt: new Date().toISOString(),
        });

        // Initialize user stats
        try {
          await initializeUserStats(user.uid);
          if (__DEV__) {
            debug('firebase', 'User stats initialized');
          }
        } catch (error) {
          if (__DEV__) {
            debugError('firebase', 'Failed to initialize user stats:', error);
          }
          // Don't block onboarding if stats initialization fails
        }
      }
      
      // Navigate to home
      router.replace('/home');
    } catch (error) {
      debugError('firebase', 'Error saving profile:', error);
      
      // Show user-friendly error message for validation errors
      if (error instanceof ValidationError) {
        // Map validation error field to onboarding step
        const fieldToStep: Record<string, OnboardingStep> = {
          'name': 'welcome',
          'occupation': 'occupation',
          'codingLevel': 'level',
          'goals': 'goals',
        };
        
        // Navigate back to the step with the error
        const errorStep = fieldToStep[error.field || ''] || 'welcome';
        
        // Stop loading first
        setIsLoading(false);
        
        // Navigate to the step with the error
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStep(errorStep);
        
        // Show alert after a brief delay to allow step transition
        setTimeout(() => {
          Alert.alert(
            'Validation Error',
            error.message || 'Please check your input and try again.',
            [{ 
              text: 'OK',
              onPress: () => {
                // User can now see the step with the error and fix it
                // Back button is available to navigate further back if needed
              }
            }]
          );
        }, 300);
        
        // Don't navigate away - user stays on the step with the error
        return;
      }
      
      // For other errors, still navigate (graceful degradation)
      Alert.alert(
        'Error',
        'Failed to save profile. You can update it later in settings.',
        [{ text: 'OK', onPress: () => router.replace('/home') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return name.trim().length >= 2;
      case 'occupation':
        return occupation !== '';
      case 'level':
        return codingLevel !== '';
      case 'goals':
        return selectedGoals.length > 0;
      case 'preview':
        return true;
      case 'notifications':
        return true; // Optional step, always can proceed
      default:
        return true;
    }
  };

  // Smooth step transition config
  const enteringTransition = FadeInRight.duration(450).springify().damping(18).stiffness(100);
  const exitingTransition = FadeOutLeft.duration(300);

  // Render Welcome Step
  const renderWelcome = () => (
    <Animated.View 
      entering={enteringTransition}
      exiting={exitingTransition}
      style={styles.stepContainer}
    >
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>
          Welcome to <Text style={styles.welcomeTitleAccent}>flashbits</Text>
        </Text>
        <Text style={styles.welcomeDescription}>
          Master coding interviews with 2000+ questions.{'\n'}
          Earn XP, build streaks, and track your progress.
        </Text>
      </View>

      <View style={styles.nameInputSection}>
        <Text style={styles.nameLabel}>What should we call you?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
        />
      </View>

      <View style={styles.privacySection}>
        <Text style={styles.privacyText}>
          By continuing, you agree to our{' '}
        </Text>
        <View style={styles.privacyLinksContainer}>
          <Pressable
            onPress={async () => {
              try {
                const url = 'https://flashbits.co/privacy';
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Error', 'Unable to open the link. Please visit https://flashbits.co/privacy');
                }
              } catch (error) {
                Alert.alert('Error', 'Unable to open the link. Please visit https://flashbits.co/privacy');
              }
            }}
          >
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.privacyText}>{' '}and{' '}</Text>
          <Pressable
            onPress={async () => {
              try {
                const url = 'https://flashbits.co/terms';
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Error', 'Unable to open the link. Please visit https://flashbits.co/terms');
                }
              } catch (error) {
                Alert.alert('Error', 'Unable to open the link. Please visit https://flashbits.co/terms');
              }
            }}
          >
            <Text style={styles.privacyLink}>Terms of Service</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  // Render Occupation Step
  const renderOccupation = () => (
    <Animated.View 
      entering={enteringTransition}
      exiting={exitingTransition}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>What's your current role?</Text>
      <Text style={styles.stepSubtitle}>
        This helps us tailor questions to your experience level
      </Text>

      <ScrollView 
        style={styles.optionsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsGrid}>
          {OCCUPATIONS.map((occ) => (
            <Pressable
              key={occ.id}
              style={[
                styles.optionCard,
                occupation === occ.id && styles.optionCardSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setOccupation(occ.id);
              }}
            >
              <Ionicons 
                name={occ.icon} 
                size={20} 
                color={occupation === occ.id ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.optionLabel,
                occupation === occ.id && styles.optionLabelSelected,
              ]}>
                {occ.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Render Level Step
  const renderLevel = () => (
    <Animated.View 
      entering={enteringTransition}
      exiting={exitingTransition}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>How would you rate your coding skills?</Text>
      <Text style={styles.stepSubtitle}>
        Be honest - we'll adjust difficulty based on this
      </Text>

      <View style={styles.levelOptions}>
        {CODING_LEVELS.map((level) => (
          <Pressable
            key={level.id}
            style={[
              styles.levelCard,
              codingLevel === level.id && styles.levelCardSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCodingLevel(level.id);
            }}
          >
            <View style={styles.levelIconContainer}>
              <Ionicons 
                name={level.icon} 
                size={18} 
                color={codingLevel === level.id ? colors.primary : colors.textSecondary} 
              />
            </View>
            <View style={styles.levelInfo}>
              <Text style={[
                styles.levelLabel,
                codingLevel === level.id && styles.levelLabelSelected,
              ]}>
                {level.label}
              </Text>
              <Text style={styles.levelDescription}>{level.description}</Text>
            </View>
            {codingLevel === level.id && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  // Render Goals Step
  const renderGoals = () => (
    <Animated.View 
      entering={enteringTransition}
      exiting={exitingTransition}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>What are your goals?</Text>
      <Text style={styles.stepSubtitle}>
        Select all that apply - we'll help you get there
      </Text>

      <ScrollView 
        style={styles.optionsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.goalsGrid}>
          {GOALS.map((goal) => (
            <Pressable
              key={goal.id}
              style={[
                styles.goalCard,
                selectedGoals.includes(goal.id) && styles.goalCardSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleGoal(goal.id);
              }}
            >
              <Ionicons 
                name={goal.icon} 
                size={18} 
                color={selectedGoals.includes(goal.id) ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.goalLabel,
                selectedGoals.includes(goal.id) && styles.goalLabelSelected,
              ]}>
                {goal.label}
              </Text>
              {selectedGoals.includes(goal.id) && (
                <View style={styles.goalCheck}>
                  <Ionicons name="checkmark" size={12} color={colors.background} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Render Preview Step
  const renderPreview = () => (
    <Animated.View 
      entering={enteringTransition}
      exiting={exitingTransition}
      style={styles.stepContainer}
    >
      <Text style={styles.previewTitle}>Here's what you'll get</Text>
      <Text style={styles.previewSubtitle}>
        Everything you need to master coding interviews
      </Text>

      <View style={styles.mockupContainer}>
        <Animated.View style={styles.mockupWrapper}>
          <Image
            source={require('@/assets/icons/streak-screenshot-portrait.png')}
            style={styles.mockupImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="flash" size={16} color={colors.primary} />
          </View>
          <Text style={styles.featureText}>Earn XP and unlock ranks</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="flame" size={16} color="#FF6B00" />
          </View>
          <Text style={styles.featureText}>Build streaks for bonus rewards</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
          </View>
          <Text style={styles.featureText}>Track progress across topics</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="star" size={16} color={colors.secondary} />
          </View>
          <Text style={styles.featureText}>2000+ interview questions</Text>
        </View>
      </View>
    </Animated.View>
  );

  // Render Notifications Step
  const renderNotifications = () => {
    const handleEnableNotifications = async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const hasPermission = await notificationService.requestPermissions();
        
        if (hasPermission) {
          // Enable notifications with default settings
          await notificationService.saveSettings({
            enabled: true,
            dailyReminder: true,
            dailyReminderTime: '09:00',
            practiceStreakReminder: true,
            motivationalNotifications: true,
          });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive practice reminders.',
            [{ text: 'OK' }]
          );
        }
        
        // Proceed to next step regardless
        handleNext();
      } catch (error) {
        debugError('api', 'Error requesting notifications:', error);
        // Proceed anyway
        handleNext();
      }
    };

    const handleSkipNotifications = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleNext();
    };

    return (
      <Animated.View 
        entering={enteringTransition}
        exiting={exitingTransition}
        style={styles.stepContainer}
      >
        <View style={styles.notificationsContent}>
          <View style={styles.notificationIconContainer}>
            <Ionicons name="notifications-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.notificationTitle}>Enable Notifications</Text>
          <Text style={styles.notificationDescription}>
            Receive daily practice reminders and stay on track with your learning goals
          </Text>

          <View style={styles.notificationButtons}>
            <Pressable
              style={styles.notificationEnableButton}
              onPress={handleEnableNotifications}
            >
              <Ionicons name="notifications" size={16} color={colors.textInverse} />
              <Text style={styles.notificationEnableButtonText}>Enable</Text>
            </Pressable>

            <Pressable
              style={styles.notificationSkipButton}
              onPress={handleSkipNotifications}
            >
              <Text style={styles.notificationSkipButtonText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render Complete Step
  const renderComplete = () => (
    <Animated.View 
      entering={FadeIn.duration(600).springify().damping(15)}
      style={styles.completeContainer}
    >
      <View style={styles.completeIconContainer}>
        <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
      </View>
      
      <Text style={styles.completeTitle}>You're all set, {name}!</Text>
      <Text style={styles.completeSubtitle}>
        We've personalized your experience. You'll start with questions matched to your level.
      </Text>
      <Text style={styles.completeInstructions}>
        Swipe right for correct, left for wrong, and up to skip.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryLabel}>Role:</Text>
          <Text style={styles.summaryValue}>
            {OCCUPATIONS.find(o => o.id === occupation)?.label}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="speedometer-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryLabel}>Level:</Text>
          <Text style={styles.summaryValue}>
            {CODING_LEVELS.find(l => l.id === codingLevel)?.label}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
          <Text style={styles.summaryLabel}>Goals:</Text>
          <Text style={styles.summaryValue}>
            {selectedGoals.length} selected
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'occupation':
        return renderOccupation();
      case 'level':
        return renderLevel();
      case 'goals':
        return renderGoals();
      case 'preview':
        return renderPreview();
      case 'notifications':
        return renderNotifications();
      case 'complete':
        return renderComplete();
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

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[styles.progressFill, animatedProgressStyle]}
          />
        </View>
        <Animated.Text 
          style={styles.progressText}
          layout={Layout.springify().damping(15).stiffness(100)}
        >
          {currentStepIndex + 1} of {steps.length}
        </Animated.Text>
      </View>

      {/* Back Button - Show on all steps except first, including complete step */}
      {currentStepIndex > 0 && (
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </Pressable>
      )}

      {/* Content */}
      <View style={styles.content}>
        {renderCurrentStep()}
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        {currentStep === 'complete' ? (
          <Pressable
            style={[styles.continueButton, isLoading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Saving...' : 'Start Practicing'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.continueButton,
              !canProceed() && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  progressContainer: {
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  backButton: {
    position: 'absolute',
    top: 92,
    left: spacing.lg,
    padding: spacing.xs,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
  },
  stepContainer: {
    flex: 1,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing['2xl'],
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  welcomeTitleAccent: {
    color: colors.primary,
    fontWeight: '600',
  },
  welcomeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
    paddingHorizontal: spacing.xl,
    fontWeight: '400',
  },
  stepTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  previewTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.4,
  },
  nameInputSection: {
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
  },
  nameLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  privacySection: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.5,
  },
  privacyLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  privacyLink: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: typography.fontSize.xs,
  },
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  mockupWrapper: {
    transform: [
      { rotateZ: '-8deg' },
    ],
  },
  mockupImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5 * 1.8,
    maxHeight: 480,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  featureList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '400',
    flex: 1,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  inputContainer: {
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  optionCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  levelOptions: {
    gap: spacing.sm,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  levelCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  levelIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  levelLabelSelected: {
    color: colors.textPrimary,
  },
  levelDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  goalsGrid: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  goalLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  goalLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  goalCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  completeIconContainer: {
    marginBottom: spacing.lg,
  },
  completeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  completeInstructions: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.4,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  notificationsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  notificationIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  notificationTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  notificationDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.5,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  notificationButtons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notificationEnableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  notificationEnableButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  notificationSkipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  notificationSkipButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '400',
  },
  summaryCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    width: '100%',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    width: 45,
  },
  summaryValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  continueButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

