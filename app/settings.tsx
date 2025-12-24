import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { seedQuestionsToFirebase, fetchAllQuestions } from '@/services/questionsService';
import { getUserProfile } from '@/services/userService';
import { useSettings, QuestionStatusFilter } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Topic, Difficulty, Company, QuestionCategory } from '@/data/questions';
import { useTopics } from '@/hooks/useTopics';
import Paywall from '@/components/Paywall';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { notificationService, NotificationSettings } from '@/services/notificationService';
import { NOTIFICATION_MESSAGES } from '@/constants/notifications';
import { SUPPORT_CONFIG } from '@/constants/support';
import * as Linking from 'expo-linking';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// Topics are now fetched from Firestore via useTopics hook

// Difficulty configuration
const DIFFICULTIES: { id: Difficulty; name: string; color: string; description: string }[] = [
  { id: 'easy', name: 'Easy', color: '#00FF94', description: 'Fundamentals & basics' },
  { id: 'medium', name: 'Medium', color: '#FFB800', description: 'Interview-level questions' },
  { id: 'hard', name: 'Hard', color: '#FF4D6A', description: 'Advanced challenges' },
  { id: 'cracked', name: 'Cracked', color: '#9D4EDD', description: 'Elite-level mastery' },
];

// Company configuration
const COMPANIES: { id: Company; name: string; color: string }[] = [
  { id: 'Google', name: 'Google', color: '#4285F4' },
  { id: 'Meta', name: 'Meta', color: '#1877F2' },
  { id: 'Amazon', name: 'Amazon', color: '#FF9900' },
  { id: 'Apple', name: 'Apple', color: '#A2AAAD' },
  { id: 'Microsoft', name: 'Microsoft', color: '#00A4EF' },
  { id: 'Netflix', name: 'Netflix', color: '#E50914' },
  { id: 'Tesla', name: 'Tesla', color: '#E82127' },
  { id: 'Uber', name: 'Uber', color: '#000000' },
  { id: 'Airbnb', name: 'Airbnb', color: '#FF5A5F' },
  { id: 'LinkedIn', name: 'LinkedIn', color: '#0A66C2' },
  { id: 'Twitter', name: 'Twitter', color: '#1DA1F2' },
  { id: 'Spotify', name: 'Spotify', color: '#1DB954' },
  { id: 'Adobe', name: 'Adobe', color: '#FF0000' },
  { id: 'Salesforce', name: 'Salesforce', color: '#00A1E0' },
  { id: 'Bloomberg', name: 'Bloomberg', color: '#F56300' },
  { id: 'Oracle', name: 'Oracle', color: '#F80000' },
  { id: 'Nvidia', name: 'Nvidia', color: '#76B900' },
  { id: 'Intel', name: 'Intel', color: '#0071C5' },
];

// Category configuration
const CATEGORIES: { id: QuestionCategory | 'all'; name: string; icon: IoniconsName; description: string; comingSoon?: boolean }[] = [
  { id: 'all', name: 'All', icon: 'apps-outline', description: 'All question types' },
  { id: 'general', name: 'General DSA', icon: 'book-outline', description: 'Concept-based MCQs' },
  { id: 'blind75', name: 'Blind 75', icon: 'flash-outline', description: 'Famous LeetCode problems' },
  { id: 'neetcode150', name: 'NeetCode 150', icon: 'code-slash-outline', description: 'NeetCode roadmap', comingSoon: true },
  { id: 'leetcode75', name: 'LeetCode 75', icon: 'logo-python', description: 'LeetCode study plan', comingSoon: true },
];

// Question modes - expandable (COMMENTED OUT FOR LATER)
// const MODES = [
//   { id: 'practice', name: 'Practice Mode', icon: '📖', description: 'No time pressure, learn at your pace' },
//   { id: 'timed', name: 'Timed Mode', icon: '⏱️', description: 'Race against the clock' },
//   { id: 'endless', name: 'Endless Mode', icon: '♾️', description: 'Keep going until you stop' },
// ];

export default function SettingsScreen() {
  const router = useRouter();
  
  // Use auth context
  const { user, isAuthenticated, signOut } = useAuth();
  
  // Fetch topics from Firestore
  const { topics: fetchedTopics, isLoading: topicsLoading, refetch: refetchTopics } = useTopics();

  // Use global settings context
  const {
    selectedTopics,
    selectedDifficulties,
    selectedCompanies,
    selectedCategory,
    questionStatusFilter,
    showExplanations,
    hapticFeedback,
    soundEffects,
    toggleTopic: contextToggleTopic,
    toggleDifficulty: contextToggleDifficulty,
    toggleCompany: contextToggleCompany,
    selectAllTopics: contextSelectAllTopics,
    selectAllCompanies: contextSelectAllCompanies,
    setSelectedTopics,
    setSelectedDifficulties,
    setSelectedCompanies,
    setSelectedCategory,
    setQuestionStatusFilter,
    setShowExplanations,
    setHapticFeedback,
    setSoundEffects,
    allTopics,
    allDifficulties,
    allCategories,
  } = useSettings();

  // Local state for dev tools
  const [isSeeding, setIsSeeding] = useState(false);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    dailyReminder: true,
    dailyReminderTime: '09:00',
    practiceStreakReminder: true,
    motivationalNotifications: true,
  });

  // Check user's pro status
  useEffect(() => {
    const checkProStatus = async () => {
      if (user?.uid && isAuthenticated) {
        try {
          const profile = await getUserProfile(user.uid);
          setIsPro(profile?.isPro || false);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setIsPro(false);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsPro(false);
        setIsLoadingProfile(false);
      }
    };
    checkProStatus();
  }, [user?.uid, isAuthenticated]);

  // Check email verification status
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (user) {
        // Reload user to get latest emailVerified status
        await user.reload();
        const isVerified = user.emailVerified;
        setShowVerificationBanner(!isVerified && user.providerData[0]?.providerId === 'password');
      }
    };
    checkEmailVerification();
  }, [user]);

  // Handle sending verification email
  const handleSendVerification = async () => {
    if (user) {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(user);
    }
  };

  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      const settings = await notificationService.getSettings();
      setNotificationSettings(settings);
    };
    loadNotificationSettings();
  }, []);

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permissions first
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive practice reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    const newSettings = { 
      ...notificationSettings, 
      enabled: value,
      // Enable all notification types when master toggle is on
      dailyReminder: value,
      practiceStreakReminder: value,
      motivationalNotifications: value,
    };
    setNotificationSettings(newSettings);
    await notificationService.saveSettings(newSettings);
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (value) {
      Alert.alert(
        '🎉 Notifications Enabled!',
        'You\'ll receive daily practice reminders, streak alerts, and motivational messages.',
        [{ text: 'Great!' }]
      );
    }
  };


  // Handle contact support - redirect to web contact page
  const handleContactSupport = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const contactUrl = SUPPORT_CONFIG.contactUrl;

    try {
      const canOpen = await Linking.canOpenURL(contactUrl);
      if (canOpen) {
        await Linking.openURL(contactUrl);
      } else {
        // Fallback: show email address
        Alert.alert(
          'Contact Support',
          `Please visit:\n${contactUrl}\n\nOr email us at:\n${SUPPORT_CONFIG.email}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening contact page:', error);
      Alert.alert(
        'Contact Support',
        `Please visit: ${contactUrl}\n\nOr email us at: ${SUPPORT_CONFIG.email}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              if (hapticFeedback) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              await signOut();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Handle paywall actions
  const handleUpgradeToPro = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to upgrade to Pro and unlock premium features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push('/'),
            style: 'default'
          }
        ]
      );
      return;
    }

    setShowPaywall(true);
  };

  const handleSelectPlan = async (plan: 'monthly') => {
    if (hapticFeedback) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // TODO: Implement payment processing with your payment provider
    Alert.alert(
      'Upgrade',
      'Payment integration coming soon!',
      [{ text: 'OK' }]
    );
    setShowPaywall(false);
  };


  // Check Firebase question count
  const handleCheckCount = async () => {
    try {
      const questions = await fetchAllQuestions();
      setQuestionCount(questions.length);
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error checking count:', error);
    }
  };

  const handleClose = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const toggleTopic = async (topicId: Topic) => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize topics and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    contextToggleTopic(topicId);
  };

  const toggleDifficulty = async (difficultyId: Difficulty) => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize difficulty and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    contextToggleDifficulty(difficultyId);
  };

  const toggleCompany = async (companyId: Company) => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to filter by company and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    contextToggleCompany(companyId);
  };

  const selectAllTopics = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize topics and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    contextSelectAllTopics();
  };

  const clearAllTopics = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize topics and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Keep at least one topic selected
    if (selectedTopics.size > 1) {
      setSelectedTopics(new Set([Array.from(selectedTopics)[0]]));
    }
  };

  const selectAllDifficulties = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize difficulty and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedDifficulties(new Set(allDifficulties));
  };

  const clearAllDifficulties = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to customize difficulty and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Keep at least one difficulty selected
    if (selectedDifficulties.size > 1) {
      setSelectedDifficulties(new Set([Array.from(selectedDifficulties)[0]]));
    }
  };

  const selectAllCompanies = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to filter by company and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    contextSelectAllCompanies();
  };

  const clearAllCompanies = async () => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Check if user is authenticated
      if (!isAuthenticated) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to filter by company and unlock Pro features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign In', 
              onPress: () => router.push('/'),
              style: 'default'
            }
          ]
        );
        return;
      }
      
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Keep at least one company selected
    if (selectedCompanies.size > 1) {
      setSelectedCompanies(new Set([Array.from(selectedCompanies)[0]]));
    }
  };

  const handleStartPractice = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.replace('/feed');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionSubtitle}>Manage your account and settings</Text>
          
          <View style={styles.accountCard}>
            <View style={styles.accountAvatar}>
              <Ionicons 
                name={isAuthenticated ? "person" : "person-outline"} 
                size={28} 
                color={isAuthenticated ? colors.primary : colors.textMuted} 
              />
            </View>
            <View style={styles.accountInfo}>
              {isAuthenticated ? (
                <>
                  <Text 
                    style={styles.accountEmail}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {user?.displayName ? user?.displayName : user?.email}
                  </Text>
                  <Text style={styles.accountStatus}>Signed in</Text>
                </>
              ) : (
                <>
                  <Text style={styles.accountEmail}>Guest</Text>
                  <Text style={styles.accountStatus}>Not signed in</Text>
                </>
              )}
            </View>
            {isAuthenticated ? (
              <Pressable 
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color={colors.incorrect} />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={18} color={colors.incorrect} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable 
                style={styles.signInButton}
                onPress={() => router.replace('/')}
              >
                <Ionicons name="log-in-outline" size={18} color={colors.primary} />
                <Text style={styles.signInText}>Sign In</Text>
              </Pressable>
            )}
          </View>

          {/* Email Verification Banner - placed under account card */}
          {isAuthenticated && showVerificationBanner && (
            <View style={styles.verificationBannerContainer}>
              <EmailVerificationBanner
                onVerify={handleSendVerification}
              />
            </View>
          )}
        </Animated.View>

        {/* Subscription Section - Pro Member or Upgrade */}
        {!isLoadingProfile && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(75)}
            style={styles.section}
          >
            {isPro ? (
              // Pro Member Card
              <View style={styles.proMemberCard}>
                <View style={styles.proIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
                <View style={styles.proContent}>
                  <View style={styles.proHeader}>
                    <Text style={styles.proTitle}>Pro Member</Text>
                    <View style={[styles.earlyBirdBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
                      <Text style={[styles.earlyBirdText, { color: colors.primary }]}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.proDescription}>
                    Full access to all features
                  </Text>
                </View>
                <Pressable
                  style={styles.manageSubscriptionButton}
                  onPress={() => {
                    Alert.alert(
                      'Manage Subscription',
                      'To manage your subscription, open Settings on your device, tap your name at the top, then tap Subscriptions. From there, select Flashbits to manage or cancel your plan.',
                      [{ text: 'Got it' }]
                    );
                  }}
                >
                  <Text style={styles.manageSubscriptionText}>Manage</Text>
                </Pressable>
              </View>
            ) : (
              // Upgrade to Pro Card
              <Pressable
                style={styles.proCard}
                onPress={handleUpgradeToPro}
              >
                <View style={styles.proIconContainer}>
                  <Ionicons name="rocket" size={20} color={colors.primary} />
                </View>
                <View style={styles.proContent}>
                  <View style={styles.proHeader}>
                    <Text style={styles.proTitle}>Unlock Pro</Text>
                    <View style={styles.earlyBirdBadge}>
                      <Ionicons name="star" size={10} color="#FFD700" />
                      <Text style={styles.earlyBirdText}>Early Bird</Text>
                    </View>
                  </View>
                  <Text style={styles.proDescription}>
                    Unlimited questions & analytics
                  </Text>
                  <View style={styles.proFeatures}>
                    <View style={styles.proFeatureItem}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                      <Text style={styles.proFeatureText}>£9.99/mo</Text>
                    </View>
                    <View style={styles.proFeatureItem}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                      <Text style={styles.proFeatureText}>Cancel anytime</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Topics Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.section}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Topics</Text>
              {!isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="lock-closed" size={14} color={colors.primary} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            {isPro && (
              <View style={styles.filterControlsCompact}>
                <Pressable 
                  style={styles.filterLinkButton}
                  onPress={selectAllTopics}
                >
                  <Text style={[
                    styles.filterLinkText,
                    selectedTopics.size === allTopics.length && styles.filterLinkTextActive
                  ]}>
                    All
                  </Text>
                </Pressable>
                <Text style={styles.filterSeparator}>•</Text>
                <Pressable 
                  style={styles.filterLinkButton}
                  onPress={clearAllTopics}
                  disabled={selectedTopics.size === 1}
                >
                  <Text style={[
                    styles.filterLinkText,
                    selectedTopics.size === 1 && styles.filterLinkTextDisabled
                  ]}>
                    Clear
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            {isPro 
              ? `Choose which topics to practice (${selectedTopics.size}/${allTopics.length} selected)`
              : 'Upgrade to Pro to customize your topics'
            }
          </Text>

          <View style={styles.topicsGrid}>
            {topicsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading topics...</Text>
              </View>
            ) : fetchedTopics.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No topics available</Text>
              </View>
            ) : (
              fetchedTopics.map((topic, index) => {
                const isSelected = selectedTopics.has(topic.id);
                return (
                  <Animated.View
                    key={topic.id}
                    entering={FadeIn.duration(300).delay(150 + index * 30)}
                  >
                    <Pressable
                      style={[
                        styles.topicChip,
                        isSelected && { 
                          backgroundColor: topic.color + '20',
                          borderColor: topic.color,
                        },
                        !isPro && styles.lockedChip,
                      ]}
                      onPress={() => toggleTopic(topic.id)}
                    >
                      <Ionicons name={topic.icon as IoniconsName} size={18} color={isSelected ? topic.color : colors.textSecondary} />
                      <Text
                        style={[
                          styles.topicName,
                          isSelected && { color: topic.color },
                        ]}
                      >
                        {topic.name}
                      </Text>
                      {!isPro && (
                        <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                      )}
                      {isPro && isSelected && (
                        <View style={[styles.checkmark, { backgroundColor: topic.color }]}>
                          <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Difficulty Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.section}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Difficulty</Text>
              {!isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="lock-closed" size={14} color={colors.primary} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            {isPro && (
              <View style={styles.filterControlsCompact}>
                <Pressable 
                  style={styles.filterLinkButton}
                  onPress={selectAllDifficulties}
                >
                  <Text style={[
                    styles.filterLinkText,
                    selectedDifficulties.size === allDifficulties.length && styles.filterLinkTextActive
                  ]}>
                    All
                  </Text>
                </Pressable>
                <Text style={styles.filterSeparator}>•</Text>
                <Pressable 
                  style={styles.filterLinkButton}
                  onPress={clearAllDifficulties}
                  disabled={selectedDifficulties.size === 1}
                >
                  <Text style={[
                    styles.filterLinkText,
                    selectedDifficulties.size === 1 && styles.filterLinkTextDisabled
                  ]}>
                    Clear
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            {isPro 
              ? `Filter by challenge level (${selectedDifficulties.size}/${allDifficulties.length} selected)`
              : 'Upgrade to Pro to customize difficulty'
            }
          </Text>

          <View style={styles.difficultiesContainer}>
            {DIFFICULTIES.map((difficulty) => {
              const isSelected = selectedDifficulties.has(difficulty.id);
              return (
                <Pressable
                  key={difficulty.id}
                  style={[
                    styles.difficultyCard,
                    isSelected && {
                      backgroundColor: difficulty.color + '15',
                      borderColor: difficulty.color,
                    },
                    !isPro && styles.lockedChip,
                  ]}
                  onPress={() => toggleDifficulty(difficulty.id)}
                >
                  <View style={styles.difficultyHeader}>
                    <Text
                      style={[
                        styles.difficultyName,
                        isSelected && { color: difficulty.color },
                      ]}
                    >
                      {difficulty.name}
                    </Text>
                    <View style={styles.difficultyIndicatorContainer}>
                      {!isPro && (
                        <Ionicons name="lock-closed" size={16} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
                      )}
                      <View
                        style={[
                          styles.difficultyIndicator,
                          { backgroundColor: isSelected ? difficulty.color : colors.border },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.difficultyDescription}>
                    {difficulty.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Company Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(225)}
          style={styles.section}
        >
          <View style={styles.comingSoonWrapper}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Companies</Text>
                {!isPro && (
                  <View style={styles.proBadge}>
                    <Ionicons name="lock-closed" size={14} color={colors.primary} />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              {isPro && (
                <View style={styles.filterControlsCompact}>
                  <Pressable 
                    style={styles.filterLinkButton}
                    onPress={selectAllCompanies}
                  >
                    <Text style={[
                      styles.filterLinkText,
                      selectedCompanies.size === COMPANIES.length && styles.filterLinkTextActive
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  <Text style={styles.filterSeparator}>•</Text>
                  <Pressable 
                    style={styles.filterLinkButton}
                    onPress={clearAllCompanies}
                    disabled={selectedCompanies.size === 1}
                  >
                    <Text style={[
                      styles.filterLinkText,
                      selectedCompanies.size === 1 && styles.filterLinkTextDisabled
                    ]}>
                      Clear
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              {isPro 
                ? `Filter by companies that ask these questions (${selectedCompanies.size}/${COMPANIES.length} selected)`
                : 'Upgrade to Pro to filter by company'
              }
            </Text>
            
            <View
              style={[
                styles.topicsGrid,
                !isPro && { opacity: 0.5 },
              ]}
              pointerEvents={!isPro ? 'none' : 'auto'}
            >
              {COMPANIES.map((company) => {
                const isSelected = selectedCompanies.has(company.id);
                return (
                  <Pressable
                    key={company.id}
                    style={[
                      styles.topicChip,
                      isSelected && {
                        backgroundColor: company.color + '20',
                        borderColor: company.color,
                      },
                      !isPro && styles.lockedChip,
                    ]}
                    onPress={() => toggleCompany(company.id)}
                  >
                    <Text
                      style={[
                        styles.topicName,
                        isSelected && { color: company.color, fontWeight: '700' },
                      ]}
                    >
                      {company.name}
                    </Text>
                    {!isPro && (
                      <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Coming Soon Overlay */}
            <View style={styles.comingSoonOverlay} pointerEvents="none">
              <View style={styles.comingSoonContent}>
                <Ionicons name="time-outline" size={32} color={colors.primary} />
                <Text style={styles.comingSoonTitle}>Coming Soon</Text>
                <Text style={styles.comingSoonSubtitle}>
                  Company filters will be available in the next update
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Category Filter Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(260)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Question Category</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a problem set to practice
          </Text>

          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const isDisabled = cat.comingSoon;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                    isDisabled && styles.categoryCardDisabled,
                  ]}
                  onPress={() => !isDisabled && setSelectedCategory(cat.id)}
                  disabled={isDisabled}
                >
                  <View style={styles.categoryHeader}>
                    <View style={[
                      styles.categoryIconContainer,
                      isDisabled && { opacity: 0.5 }
                    ]}>
                      <Ionicons 
                        name={cat.icon} 
                        size={16} 
                        color={isSelected ? colors.primary : isDisabled ? colors.textMuted : colors.textSecondary} 
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryNameRow}>
                        <Text style={[
                          styles.categoryName,
                          isSelected && { color: colors.primary },
                          isDisabled && { color: colors.textMuted }
                        ]}>
                          {cat.name}
                        </Text>
                        {cat.comingSoon && (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Soon</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.categoryDescription,
                        isDisabled && { color: colors.textMuted }
                      ]}>
                        {cat.description}
                      </Text>
                    </View>
                    <View style={[
                      styles.categoryRadio,
                      isSelected && styles.categoryRadioSelected,
                      isDisabled && { borderColor: colors.textMuted, opacity: 0.5 }
                    ]}>
                      {isSelected && (
                        <View style={styles.categoryRadioDot} />
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Question Status Filter Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(275)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Question Status</Text>
          <Text style={styles.sectionSubtitle}>
            Filter based on your attempt history
          </Text>

          <View style={styles.statusFilterContainer}>
            {[
              { id: 'all', label: 'All Questions', icon: 'grid', description: 'Show all available questions' },
              { id: 'new', label: 'New Only', icon: 'sparkles', description: 'Questions you haven\'t seen before' },
              { id: 'attempted', label: 'Attempted', icon: 'eye', description: 'Questions you\'ve tried' },
              { id: 'unattempted', label: 'Not Attempted', icon: 'help-circle', description: 'Questions you\'ve skipped or not tried' },
            ].map((status) => {
              const isSelected = questionStatusFilter === status.id;
              return (
                <Pressable
                  key={status.id}
                  style={[
                    styles.statusFilterCard,
                    isSelected && styles.statusFilterCardSelected,
                  ]}
                  onPress={() => setQuestionStatusFilter(status.id as QuestionStatusFilter)}
                >
                  <View style={styles.statusFilterHeader}>
                    <Ionicons 
                      name={status.icon as any} 
                      size={24} 
                      color={isSelected ? colors.primary : colors.textSecondary} 
                    />
                    <Text
                      style={[
                        styles.statusFilterLabel,
                        isSelected && styles.statusFilterLabelSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.statusFilterDescription}>
                    {status.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Mode Section - COMMENTED OUT FOR LATER */}
        {/* 
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Practice Mode</Text>
          <Text style={styles.sectionSubtitle}>
            How do you want to practice?
          </Text>

          <View style={styles.modesContainer}>
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  style={[
                    styles.modeCard,
                    isSelected && styles.modeCardSelected,
                  ]}
                  onPress={() => selectMode(mode.id)}
                >
                  <Text style={styles.modeIcon}>{mode.icon}</Text>
                  <View style={styles.modeInfo}>
                    <Text
                      style={[
                        styles.modeName,
                        isSelected && styles.modeNameSelected,
                      ]}
                    >
                      {mode.name}
                    </Text>
                    <Text style={styles.modeDescription}>{mode.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
        */}

        {/* Preferences Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Text style={styles.sectionSubtitle}>Customize your practice</Text>

          <View style={styles.preferencesList}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Show Explanations</Text>
                <Text style={styles.preferenceDescription}>
                  Display detailed explanations after each answer
                </Text>
              </View>
              <Switch
                value={showExplanations}
                onValueChange={setShowExplanations}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={showExplanations ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Haptic Feedback</Text>
                <Text style={styles.preferenceDescription}>
                  Vibration on interactions
                </Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={hapticFeedback ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Sound Effects</Text>
                <Text style={styles.preferenceDescription}>
                  Audio feedback for answers
                </Text>
              </View>
              <Switch
                value={soundEffects}
                onValueChange={setSoundEffects}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={soundEffects ? colors.primary : colors.textMuted}
              />
            </View>
          </View>
        </Animated.View>

        {/* Notifications Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(450)}
          style={styles.section}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Stay motivated with practice reminders</Text>

          <View style={styles.preferencesList}>
            {/* Master Toggle */}
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Enable Notifications</Text>
                <Text style={styles.preferenceDescription}>
                  Daily reminders, streak alerts, and motivational messages
                </Text>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={notificationSettings.enabled ? colors.primary : colors.textMuted}
              />
            </View>

          </View>
        </Animated.View>

        {/* Help & Support Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.section}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons name="help-circle-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Need help? Get in touch with our team
          </Text>

          <View style={styles.supportContainer}>
            {/* Contact Support Button */}
            <Pressable
              style={styles.supportButton}
              onPress={handleContactSupport}
            >
              <View style={styles.supportButtonIcon}>
                <Ionicons name="mail-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.supportButtonContent}>
                <Text style={styles.supportButtonTitle}>Contact Support</Text>
                <Text style={styles.supportButtonDescription}>
                  Report issues, ask questions, or share feedback
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            {/* Support Info */}
            <View style={styles.supportInfoCard}>
              <View style={styles.supportInfoRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.supportInfoText}>
                  {SUPPORT_CONFIG.responseTime}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

       

        {/* Start Button */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(600)}
          style={styles.startButtonContainer}
        >
          <Pressable style={styles.startButton} onPress={handleStartPractice}>
            <Text style={styles.startButtonText}>Start Practice</Text>
            <Text style={styles.startButtonSubtext}>
              {selectedTopics.size} topics • {selectedDifficulties.size} levels • {selectedCompanies.size} companies • {
                questionStatusFilter === 'all' ? 'All' :
                questionStatusFilter === 'new' ? 'New only' :
                questionStatusFilter === 'attempted' ? 'Attempted' :
                'Unattempted'
              }
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Paywall Modal */}
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSelectPlan={handleSelectPlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Account Section
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0, // Allows flex children to shrink below their content size
  },
  accountEmail: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  accountStatus: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.incorrect + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  logoutText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.incorrect,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  signInText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  verificationBannerContainer: {
    marginTop: spacing.base,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerLeft: {},
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  proBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  selectAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterLinkButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  filterLinkText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterLinkTextActive: {
    color: colors.primary,
  },
  filterLinkTextDisabled: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  filterSeparator: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },

  // Coming Soon Overlay
  comingSoonWrapper: {
    position: 'relative',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background + 'F5', // Almost fully opaque
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  comingSoonTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  comingSoonSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Topics
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  lockedChip: {
    opacity: 0.5,
  },
  topicName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  checkmark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Difficulties
  difficultiesContainer: {
    gap: spacing.sm,
  },
  difficultyCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  difficultyName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  difficultyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  // Category Filter
  categoryContainer: {
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  categoryRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRadioSelected: {
    borderColor: colors.primary,
  },
  categoryRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  categoryCardDisabled: {
    opacity: 0.6,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comingSoonBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Question Status Filter
  statusFilterContainer: {
    gap: spacing.sm,
  },
  statusFilterCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusFilterCardSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  statusFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusFilterLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  statusFilterLabelSelected: {
    color: colors.primary,
  },
  statusFilterDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing['2xl'] + spacing.sm,
  },

  // Modes
  modesContainer: {
    gap: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modeCardSelected: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '40',
  },
  modeIcon: {
    fontSize: 24,
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  modeNameSelected: {
    color: colors.primary,
  },
  modeDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  // Preferences
  preferencesList: {
    gap: spacing.sm,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  preferenceDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  testNotificationText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },

  // Support Section
  supportContainer: {
    gap: spacing.sm,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  supportButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportButtonContent: {
    flex: 1,
  },
  supportButtonTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  supportButtonDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  supportInfoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  supportInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  supportInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },

  // Developer Tools
  devToolsContainer: {
    gap: spacing.md,
  },
  devStatCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  devStatLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  devStatValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  devRefreshButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  devRefreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  devRefreshText: {
    fontSize: typography.fontSize.sm,
    color: colors.secondary,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    gap: spacing.md,
  },
  devButtonDisabled: {
    opacity: 0.6,
  },
  devButtonContent: {
    flex: 1,
  },
  devButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  devButtonSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Start Button
  startButtonContainer: {
    marginTop: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.textInverse,
  },
  startButtonSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: 2,
  },
  proCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  proMemberCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  proIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  proContent: {
    flex: 1,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: spacing.xs,
  },
  proTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  earlyBirdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  earlyBirdText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFD700',
  },
  proDescription: {
    fontSize: typography.fontSize.xs,
    fontWeight: '400',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  proFeatures: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  proFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  proFeatureText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 20,
  },
  manageSubscriptionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  manageSubscriptionText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});


