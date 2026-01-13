import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { seedQuestionsToFirebase, fetchAllQuestions } from '@/services/questionsService';
import { getUserProfile } from '@/services/userService';
import { useSettings, QuestionStatusFilter } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import {
  getCenteredContainerStyle,
  getResponsiveHorizontalPadding,
  MAX_CONTENT_WIDTH_LARGE,
} from '@/utils/responsive';
import { Topic, Difficulty, Company, QuestionCategory } from '@/data/questions';
import { useTopics } from '@/hooks/useTopics';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
// Lazy load heavy components for code splitting
import { useLazyComponent, LazyLoadingOverlay } from '@/utils/lazyLoad';
import { notificationService, NotificationSettings } from '@/services/notificationService';
import { NOTIFICATION_MESSAGES } from '@/constants/notifications';
import { SUPPORT_CONFIG } from '@/constants/support';
import { useRevenueCat } from '@/context/RevenueCatContext';
import { useNetwork } from '@/context/NetworkContext';
import { debug, debugError, debugWarn } from '@/utils/debug';
import * as Linking from 'expo-linking';
import { clearAllCache, getCacheStats } from '@/services/cacheService';
import { clearOfflineQuestions, getOfflineStorageInfo, getOfflineQuestionsCount, getOfflineModeEnabled, setOfflineModeEnabled } from '@/services/offlineStorageService';
import { prefetchQuestionsForOffline } from '@/services/questionsService';
import Constants from 'expo-constants';

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
  const { user, isAuthenticated, signOut, deleteAccount } = useAuth();
  
  // Use RevenueCat context for subscription status
  const { isPro: revenueCatIsPro, purchasePlan, isLoading: revenueCatLoading, restore, subscriptionStatus } = useRevenueCat();
  
  // Use network context to check connectivity
  const { isConnected, isInternetReachable } = useNetwork();
  
  // Developer tools state
  const [devCacheStats, setDevCacheStats] = useState<any>(null);
  const [devOfflineInfo, setDevOfflineInfo] = useState<any>(null);
  
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);
  const [offlineInfo, setOfflineInfo] = useState<{
    questionCount: number;
    storageSize: number;
    lastUpdated: number | null;
    isExpired: boolean;
  } | null>(null);
  
  // Lazy-loaded components for code splitting
  const { Component: PaywallComponent, isLoading: isLoadingPaywall } = useLazyComponent(
    () => import('@/components/Paywall'),
    showPaywall
  );
  
  const { Component: SubscriptionManagerComponent, isLoading: isLoadingSubscriptionManager } = useLazyComponent(
    () => import('@/components/SubscriptionManager'),
    showSubscriptionManager
  );
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    dailyReminder: true,
    dailyReminderTime: '09:00',
    practiceStreakReminder: true,
    motivationalNotifications: true,
  });

  // Use RevenueCat for pro status instead of Firestore
  useEffect(() => {
    setIsPro(revenueCatIsPro);
    setIsLoadingProfile(revenueCatLoading);
  }, [revenueCatIsPro, revenueCatLoading]);

  // Reset premium category if user loses pro status
  useEffect(() => {
    if (!isPro && selectedCategory !== 'all' && selectedCategory !== 'general') {
      // User lost pro status or doesn't have pro, reset to 'all'
      setSelectedCategory('all');
    }
  }, [isPro, selectedCategory]);

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

  // Load notification settings and sync with iOS permission status
  // Toggle state is driven by iOS permission status (read-only from iOS Settings)
  useEffect(() => {
    const loadNotificationSettings = async () => {
      // Check iOS permission status (this is the source of truth for toggle state)
      const permissionStatus = await notificationService.getPermissionStatus();
      
      // Load settings from Firestore/AsyncStorage
      const settings = await notificationService.getSettings(user?.uid);
      
      // Toggle state is always synced with iOS permission status
      const syncedSettings = {
        ...settings,
        enabled: permissionStatus.granted, // Toggle reflects iOS permission status
      };
      setNotificationSettings(syncedSettings);
      
      // If permissions are granted, ensure notification types are enabled
      if (permissionStatus.granted && !settings.enabled) {
        await notificationService.saveSettings({
          ...syncedSettings,
          dailyReminder: true,
          practiceStreakReminder: true,
          motivationalNotifications: true,
        }, user?.uid);
      }
    };
    loadNotificationSettings();
  }, [user?.uid]);

  // Listen for permission changes when app comes to foreground
  // User might have changed permissions in iOS Settings
  useEffect(() => {
    const checkPermissions = async () => {
      const permissionStatus = await notificationService.getPermissionStatus();
      
      // Update toggle state to match current iOS permission status
      setNotificationSettings(prev => ({
        ...prev,
        enabled: permissionStatus.granted,
      }));
      
      // If permissions were revoked in iOS Settings, disable notifications
      if (!permissionStatus.granted) {
        await notificationService.disableNotifications(user?.uid);
      }
    };
    
    // Check permissions when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [user?.uid]);

  // Load offline storage info - refresh when screen comes into focus
  const loadOfflineInfo = useCallback(async () => {
    const info = await getOfflineStorageInfo();
    const wasEnabled = await getOfflineModeEnabled();
    setOfflineInfo(info);
    
    // Always restore the offline mode state first (keep it enabled if it was enabled)
    if (wasEnabled) {
      setOfflineModeEnabled(true);
    } else {
      setOfflineModeEnabled(info.questionCount > 0 && !info.isExpired);
    }
    
  }, []);

  // Refresh offline info when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadOfflineInfo();
    }, [loadOfflineInfo])
  );

  // Also refresh when app comes to foreground (in case offline questions were updated elsewhere)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadOfflineInfo();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadOfflineInfo]);

  // Handle notification toggle
  // Toggle state is driven by iOS permission status
  // - If user tries to turn ON: Request iOS permissions
  // - If user tries to turn OFF: Direct them to iOS Settings (can't revoke programmatically)
  const handleNotificationToggle = async (value: boolean) => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (value) {
      // User wants to enable - request iOS permissions
      const hasPermission = await notificationService.requestPermissions();
      
      if (!hasPermission) {
        // Permission denied - keep toggle OFF (reflects iOS permission status)
        setNotificationSettings(prev => ({
          ...prev,
          enabled: false,
        }));
        
        Alert.alert(
          'Permission Required',
          Platform.OS === 'ios'
            ? 'Please enable notifications in Settings > flashbits > Notifications to receive practice reminders.'
            : 'Please enable notifications in your device settings to receive practice reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            Platform.OS === 'ios'
              ? {
                  text: 'Open Settings',
                  onPress: async () => {
                    try {
                      await Linking.openURL('app-settings:');
                    } catch (error) {
                      debugError('settings', 'Error opening settings:', error);
                      Alert.alert(
                        'Open Settings',
                        'Please go to Settings > flashbits > Notifications to enable notifications.',
                        [{ text: 'OK' }]
                      );
                    }
                  },
                  style: 'default',
                }
              : { text: 'OK' },
          ]
        );
        return;
      }
      
      // Permissions granted - enable notifications
      const newSettings = { 
        ...notificationSettings, 
        enabled: true,
        dailyReminder: true,
        practiceStreakReminder: true,
        motivationalNotifications: true,
      };
      setNotificationSettings(newSettings);
      await notificationService.saveSettings(newSettings, user?.uid);
      
    } else {
      // User wants to turn OFF - can't revoke iOS permissions programmatically
      // Show alert directing them to iOS Settings
      Alert.alert(
        'Disable Notifications',
        'To disable notifications, please go to Settings > flashbits > Notifications and turn off Allow Notifications.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            // Keep toggle ON (reflects iOS permission status)
            setNotificationSettings(prev => ({
              ...prev,
              enabled: true,
            }));
          }},
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await Linking.openURL('app-settings:');
              } catch (error) {
                debugError('settings', 'Error opening settings:', error);
              }
            },
            style: 'default',
          },
        ]
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
      debugError('settings', 'Error opening contact page:', error);
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
              debugError('auth', 'Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.\n\nThis will permanently delete:\n• Your profile and settings\n• Your progress and statistics\n• All your data\n\nYou will be signed out immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            // Double confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Are you absolutely sure you want to delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setIsDeletingAccount(true);
                      if (hapticFeedback) {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      }
                      
                      const result = await deleteAccount();
                      
                      if (result.success) {
                        if (hapticFeedback) {
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been permanently deleted. You will be signed out now.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                router.replace('/');
                              },
                            },
                          ]
                        );
                      } else {
                        if (hapticFeedback) {
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        }
                        Alert.alert('Error', result.error || 'Failed to delete account. Please try again.');
                      }
                    } catch (error: any) {
                      debugError('auth', 'Delete account error:', error);
                      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ]
            );
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

    // Allow purchases without authentication (App Store Guideline 5.1.1)
    setShowPaywall(true);
  };

  const handleSelectPlan = async (plan: 'monthly' | 'yearly') => {
    try {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const result = await purchasePlan(plan);
      
      if (result.success) {
        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setShowPaywall(false);
        Alert.alert(
          'Success!',
          'Your subscription is now active. Enjoy Pro features!',
          [{ text: 'OK' }]
        );
      } else {
        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (error: any) {
      debugError('revenueCat', 'Purchase error:', error);
      Alert.alert('Error', error.message || 'Purchase failed. Please try again.');
    }
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const result = await restore();
      
      if (result.success) {
        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          'Success',
          'Your purchases have been restored.',
          [{ text: 'OK' }]
        );
      } else {
        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Restore Failed', result.error || 'No purchases found to restore.');
      }
    } catch (error: any) {
      debugError('revenueCat', 'Restore error:', error);
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };


  const handleOfflineModeToggle = async (value: boolean) => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
      setShowPaywall(true);
      return;
    }

    if (value) {
      // Turning on offline mode - check if expired and download questions
      if (!isConnected || isInternetReachable === false) {
        Alert.alert(
          'No Internet Connection',
          'Please connect to the internet to download questions for offline use.',
          [{ text: 'OK' }]
        );
        setOfflineModeEnabled(false);
        return;
      }

      // Check if questions are expired or missing
      const currentInfo = await getOfflineStorageInfo();
      const needsDownload = currentInfo.questionCount === 0 || currentInfo.isExpired;

      if (needsDownload) {
        // Clear expired questions if any
        if (currentInfo.isExpired && currentInfo.questionCount > 0) {
          await clearOfflineQuestions();
        }

        setIsSavingOffline(true);
        try {
          if (hapticFeedback) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          // Download 2000 questions for offline use (replace existing if expired)
          const result = await prefetchQuestionsForOffline(2000, currentInfo.isExpired);
          
          // Refresh offline info after saving
          const info = await getOfflineStorageInfo();
          setOfflineInfo(info);
          
          if (result.success) {
            setOfflineModeEnabled(true);
            await setOfflineModeEnabled(true); // Persist state
            if (hapticFeedback) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (currentInfo.isExpired) {
              Alert.alert(
                'Questions Updated',
                `Your offline questions have been refreshed. ${result.count} questions are now available offline.`,
                [{ text: 'OK' }]
              );
            }
          } else {
            setOfflineModeEnabled(false);
            if (hapticFeedback) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            Alert.alert(
              'Failed to Download Questions',
              result.error || 'An unexpected error occurred. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (error: any) {
          debugError('settings', 'Error downloading offline questions:', error);
          setOfflineModeEnabled(false);
          Alert.alert(
            'Error',
            error?.message || 'An unexpected error occurred while downloading questions.',
            [{ text: 'OK' }]
          );
        } finally {
          setIsSavingOffline(false);
        }
      } else {
        // Questions are already available and not expired, just enable the mode
        setOfflineModeEnabled(true);
        if (hapticFeedback) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } else {
      // Turning off offline mode - delete questions from storage
      try {
        if (hapticFeedback) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        await clearOfflineQuestions();
        setOfflineModeEnabled(false);
        await setOfflineModeEnabled(false); // Persist state
        
        // Refresh offline info to clear the count
        const info = await getOfflineStorageInfo();
        setOfflineInfo(info);
      } catch (error: any) {
        debugError('settings', 'Error clearing offline questions:', error);
        setOfflineModeEnabled(false);
        // Still refresh info even if clear failed
        const info = await getOfflineStorageInfo();
        setOfflineInfo(info);
      }
    }
  };

  // Handle opening store subscription management
  const handleOpenStoreSubscriptionManagement = async () => {
    try {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      if (Platform.OS === 'ios') {
        const url = 'https://apps.apple.com/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Manage Subscription',
            'To cancel your subscription:\n\n1. Open Settings on your iPhone\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find "Flashbits" and tap it\n5. Tap "Cancel Subscription"',
            [{ text: 'OK' }]
          );
        }
      } else if (Platform.OS === 'android') {
        const url = 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Manage Subscription',
            'To cancel your subscription:\n\n1. Open Google Play Store\n2. Tap Menu (☰)\n3. Tap "Subscriptions"\n4. Find "Flashbits" and tap it\n5. Tap "Cancel Subscription"',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      debugError('revenueCat', 'Error opening store subscription management:', error);
      Alert.alert(
        'Open Settings',
        Platform.OS === 'ios'
          ? 'Please go to Settings → [Your Name] → Subscriptions to manage your subscription.'
          : 'Please go to Google Play Store → Menu → Subscriptions to manage your subscription.'
      );
    }
  };


  // Check Firebase question count
  const handleCheckCount = async () => {
    try {
      const result = await fetchAllQuestions(50); // Use paginated version with page size
      const questionCount = 'questions' in result ? result.questions.length : 0;
      setQuestionCount(questionCount);
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      debugError('questions', 'Error checking count:', error);
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    contextToggleTopic(topicId);
  };

  const handleCategorySelect = async (categoryId: QuestionCategory | 'all') => {
    // 'all' and 'general' are free, others require pro
    const isFreeCategory = categoryId === 'all' || categoryId === 'general';
    
    // Check if user is pro for premium categories
    if (!isFreeCategory && !isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
      setShowPaywall(true);
      return;
    }
    
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(categoryId);
  };

  const toggleDifficulty = async (difficultyId: Difficulty) => {
    // Check if user is pro
    if (!isPro) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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
      
      // Allow purchases without authentication (App Store Guideline 5.1.1)
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

  const scrollContentStyle = {
    ...styles.scrollContent,
    padding: getResponsiveHorizontalPadding(spacing.lg),
    paddingBottom: 120,
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
        contentContainerStyle={[
          scrollContentStyle,
          getCenteredContainerStyle(MAX_CONTENT_WIDTH_LARGE),
        ]}
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
              // Pro Member Card - Enhanced
              <Pressable 
                style={styles.proMemberCard}
                onPress={() => setShowSubscriptionManager(true)}
              >
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
                    {subscriptionStatus?.willRenew 
                      ? `Renews ${subscriptionStatus.expirationDate ? new Date(subscriptionStatus.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon'}`
                      : subscriptionStatus?.expirationDate 
                        ? `Expires ${new Date(subscriptionStatus.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Full access to all features'
                    }
                  </Text>
                </View>
                <View style={styles.manageSubscriptionButton}>
                  <Text style={styles.manageSubscriptionText}>Manage</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
                </View>
              </Pressable>
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
                    <View style={styles.trialBadgeSettings}>
                      <Ionicons name="gift" size={12} color={colors.primary} />
                      <Text style={styles.trialTextSettings}>7-Day Free Trial</Text>
                    </View>
                  </View>
                  <Text style={styles.proDescription}>
                    Try Pro free for 7 days, then £9.99/month
                  </Text>
                  <View style={styles.proFeatures}>
                    <View style={styles.proFeatureItem}>
                      <Ionicons name="checkmark" size={12} color={colors.primary} />
                      <Text style={styles.proFeatureText}>Unlimited questions & analytics</Text>
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
              const isComingSoon = cat.comingSoon;
              const isFreeCategory = cat.id === 'all' || cat.id === 'general';
              const isLocked = !isFreeCategory && !isPro && !isComingSoon;
              const isDisabled = isComingSoon || isLocked;
              
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                    isDisabled && styles.categoryCardDisabled,
                  ]}
                  onPress={() => !isDisabled && handleCategorySelect(cat.id)}
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
                        {isLocked && (
                          <View style={styles.proBadge}>
                            <Ionicons name="lock-closed" size={10} color={colors.primary} />
                            <Text style={styles.proBadgeText}>Pro</Text>
                          </View>
                        )}
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
                      {isLocked && !isSelected && (
                        <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
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

        {/* Offline Mode Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(425)}
          style={styles.section}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Offline Mode</Text>
              {!isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="lock-closed" size={14} color={colors.primary} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>Download questions to practice without internet</Text>

          <View style={styles.preferencesList}>
            <Pressable
              onPress={() => !isPro && handleOfflineModeToggle(true)}
              disabled={isSavingOffline}
            >
              <View style={[
                styles.preferenceItem,
                !isPro && styles.lockedChip,
              ]}>
                <View style={styles.preferenceInfo}>
                  <View style={styles.preferenceHeaderRow}>
                    <Text style={styles.preferenceName}>Offline Mode</Text>
                    {isPro && offlineModeEnabled && offlineInfo && offlineInfo.questionCount > 0 && !offlineInfo.isExpired && (
                      <View style={styles.offlineBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.preferenceDescription}>
                    {!isPro
                      ? 'Download questions for offline practice (Pro feature)'
                      : isSavingOffline 
                        ? 'Downloading questions...'
                        : offlineModeEnabled && offlineInfo && offlineInfo.questionCount > 0
                          ? !offlineInfo.isExpired
                            ? 'Offline questions available'
                            : 'Questions expired - toggle off and on to download again'
                          : 'Download questions for offline practice'}
                  </Text>
                </View>
                {isSavingOffline ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={offlineModeEnabled}
                    onValueChange={handleOfflineModeToggle}
                    trackColor={{ false: colors.border, true: colors.primary + '50' }}
                    thumbColor={offlineModeEnabled ? colors.primary : colors.textMuted}
                    disabled={isSavingOffline || (!isConnected && !offlineModeEnabled) || !isPro}
                  />
                )}
              </View>
            </Pressable>
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

        {/* Developer Tools Section - Only in Development */}
        {__DEV__ && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(475)}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="code-slash-outline" size={18} color={colors.warning} />
              <Text style={styles.sectionTitle}>Developer Tools</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Testing & debugging utilities
            </Text>

            <View style={styles.devToolsContainer}>
              {/* App Info */}
              <View style={styles.devStatCard}>
                <Text style={styles.devStatLabel}>App Version</Text>
                <Text style={styles.devStatValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
                <Text style={styles.devStatLabel}>
                  {Platform.OS} • {Constants.expoConfig?.sdkVersion || 'N/A'}
                </Text>
              </View>

              {/* Network Status */}
              <View style={styles.devStatCard}>
                <Text style={styles.devStatLabel}>Network Status</Text>
                <Text style={styles.devStatValue}>
                  {isConnected ? '✓ Connected' : '✗ Offline'}
                </Text>
                <Text style={styles.devStatLabel}>
                  Internet: {isInternetReachable ? 'Reachable' : 'Unreachable'}
                </Text>
              </View>


              {/* Test Notification */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  if (hapticFeedback) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  
                  try {
                    await notificationService.sendImmediateNotification(
                      'Test Notification',
                      'This is a test notification from Developer Tools'
                    );
                    Alert.alert('Success', 'Test notification sent!');
                  } catch (error) {
                    debugError('settings', 'Error sending test notification:', error);
                    Alert.alert(
                      'Error',
                      'Failed to send notification. Make sure notifications are enabled.',
                      [{ text: 'OK' }]
                    );
                  }
                }}
              >
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Test Notification</Text>
                  <Text style={styles.devButtonSubtext}>
                    Send a test push notification
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* View Cache Stats */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  if (hapticFeedback) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  
                  try {
                    const stats = await getCacheStats();
                    setDevCacheStats(stats);
                    const totalSize = stats.entries.reduce((sum, e) => sum + e.size, 0);
                    const oldestAge = stats.entries.length > 0 
                      ? Math.max(...stats.entries.map(e => e.age))
                      : 0;
                    const newestAge = stats.entries.length > 0
                      ? Math.min(...stats.entries.map(e => e.age))
                      : 0;
                    
                    Alert.alert(
                      'Cache Statistics',
                      `Total Entries: ${stats.totalEntries}\n` +
                      `Total Size: ${(totalSize / 1024).toFixed(2)} KB\n` +
                      `Oldest Entry: ${oldestAge > 0 ? `${Math.round(oldestAge / 1000 / 60)} min ago` : 'N/A'}\n` +
                      `Newest Entry: ${newestAge > 0 ? `${Math.round(newestAge / 1000 / 60)} min ago` : 'N/A'}`,
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    debugError('settings', 'Error getting cache stats:', error);
                    Alert.alert('Error', 'Failed to get cache statistics.');
                  }
                }}
              >
                <Ionicons name="stats-chart-outline" size={24} color={colors.secondary} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>View Cache Stats</Text>
                  <Text style={styles.devButtonSubtext}>
                    View cache statistics and info
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* View Offline Storage Info */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  if (hapticFeedback) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  
                  try {
                    const info = await getOfflineStorageInfo();
                    setDevOfflineInfo(info);
                    Alert.alert(
                      'Offline Storage Info',
                      `Questions Stored: ${info.questionCount}\n` +
                      `Storage Size: ${(info.storageSize / 1024).toFixed(2)} KB\n` +
                      `Last Updated: ${info.lastUpdated ? new Date(info.lastUpdated).toLocaleString() : 'Never'}\n` +
                      `Expires: ${info.isExpired ? 'Yes (expired)' : 'No'}`,
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    debugError('settings', 'Error getting offline storage info:', error);
                    Alert.alert('Error', 'Failed to get offline storage info.');
                  }
                }}
              >
                <Ionicons name="cloud-download-outline" size={24} color={colors.secondary} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>View Offline Storage</Text>
                  <Text style={styles.devButtonSubtext}>
                    View offline questions storage info
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* Clear Cache */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  Alert.alert(
                    'Clear Cache',
                    'This will clear all cached data. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          if (hapticFeedback) {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                          
                          try {
                            await clearAllCache();
                            Alert.alert('Success', 'Cache cleared successfully.');
                          } catch (error) {
                            debugError('settings', 'Error clearing cache:', error);
                            Alert.alert('Error', 'Failed to clear cache.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={24} color={colors.warning} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Clear Cache</Text>
                  <Text style={styles.devButtonSubtext}>
                    Clear all cached data
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* Clear Offline Storage */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  Alert.alert(
                    'Clear Offline Storage',
                    'This will clear all offline questions. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          if (hapticFeedback) {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                          
                          try {
                            await clearOfflineQuestions();
                            Alert.alert('Success', 'Offline storage cleared successfully.');
                          } catch (error) {
                            debugError('settings', 'Error clearing offline storage:', error);
                            Alert.alert('Error', 'Failed to clear offline storage.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="cloud-offline-outline" size={24} color={colors.warning} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Clear Offline Storage</Text>
                  <Text style={styles.devButtonSubtext}>
                    Clear all offline questions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* Test Error Boundary */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  Alert.alert(
                    'Test Error Boundary',
                    'This will trigger an error to test the Error Boundary component.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Trigger Error',
                        onPress: () => {
                          // This will be caught by Error Boundary
                          throw new Error('Test error from Developer Tools');
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="bug-outline" size={24} color={colors.warning} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Test Error Boundary</Text>
                  <Text style={styles.devButtonSubtext}>
                    Trigger a test error to test Error Boundary
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* Test Haptic Feedback */}
              <Pressable
                style={styles.devButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimeout(async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }, 200);
                  setTimeout(async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  }, 400);
                  setTimeout(async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }, 600);
                  setTimeout(async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }, 800);
                  setTimeout(async () => {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  }, 1000);
                  Alert.alert('Haptic Test', 'Playing all haptic feedback types...');
                }}
              >
                <Ionicons name="phone-portrait-outline" size={24} color={colors.secondary} />
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Test Haptic Feedback</Text>
                  <Text style={styles.devButtonSubtext}>
                    Test all haptic feedback types
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>

              {/* Save Offline Questions */}
              <Pressable
                style={[
                  styles.devButton,
                  (!isConnected || isInternetReachable === false) && styles.devButtonDisabled
                ]}
                onPress={() => handleOfflineModeToggle(true)}
                disabled={isSavingOffline || !isConnected || isInternetReachable === false}
              >
                {isSavingOffline ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="cloud-download-outline" size={24} color={colors.secondary} />
                )}
                <View style={styles.devButtonContent}>
                  <Text style={styles.devButtonText}>Save Offline Questions</Text>
                  <Text style={styles.devButtonSubtext}>
                    Download questions for offline use
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        )}

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

        {/* Legal Information Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(550)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Legal Information</Text>
          <View style={styles.legalLinksList}>
            <Pressable
              style={styles.legalLinkItem}
              onPress={async () => {
                if (hapticFeedback) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                Linking.openURL('https://flashbits.co/privacy');
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.legalLinkItem}
              onPress={async () => {
                if (hapticFeedback) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                // Apple's standard EULA - required for apps using Apple's standard Terms of Use
                Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.legalLinkText}>Terms of Use (EULA)</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Delete Account - Professional */}
        {isAuthenticated && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(580)}
            style={styles.deleteAccountContainer}
          >
            <Pressable
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <ActivityIndicator size="small" color={colors.incorrect} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={colors.incorrect} />
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        )}

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

        {/* Restore Purchases - Minimalist */}
        {isAuthenticated && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(700)}
            style={styles.restorePurchasesContainer}
          >
            <Pressable
              style={styles.restorePurchasesButton}
              onPress={handleRestorePurchases}
              disabled={isRestoring || revenueCatLoading}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Text style={styles.restorePurchasesText}>Restore Purchases</Text>
              )}
            </Pressable>
          </Animated.View>
        )}

      </ScrollView>

      {/* Paywall Modal - Lazy Loaded */}
      <LazyLoadingOverlay visible={showPaywall && isLoadingPaywall} />
      {showPaywall && PaywallComponent && (
        <PaywallComponent
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSelectPlan={handleSelectPlan}
        />
      )}

      {/* Subscription Manager Modal - Lazy Loaded */}
      <LazyLoadingOverlay visible={showSubscriptionManager && isLoadingSubscriptionManager} />
      {showSubscriptionManager && SubscriptionManagerComponent && (
        <SubscriptionManagerComponent
          visible={showSubscriptionManager}
          onClose={() => setShowSubscriptionManager(false)}
        />
      )}
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
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
    backgroundColor: 'rgba(255, 77, 106, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 106, 0.2)',
  },
  logoutText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.incorrect,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  signInText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteAccountContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 106, 0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  deleteAccountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.incorrect,
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
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    letterSpacing: 0.5,
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
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryCardSelected: {
    borderColor: 'rgba(0, 255, 148, 0.4)',
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusFilterCardSelected: {
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
    borderColor: 'rgba(0, 255, 148, 0.4)',
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
  preferenceItemDisabled: {
    opacity: 0.5,
  },
  preferenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Offline Mode
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  offlineBadgeText: {
    fontSize: typography.fontSize.xs,
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  supportButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
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
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textInverse,
  },
  startButtonSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: 2,
  },
  proCard: {
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  proMemberCard: {
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  proIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
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
  trialBadgeSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  trialTextSettings: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  restorePurchasesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingBottom: spacing.xs,
  },
  restorePurchasesButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restorePurchasesText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '400',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  restorePurchasesButtonDisabled: {
    opacity: 0.5,
  },
  legalLinksList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  legalLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  legalLinkText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});


