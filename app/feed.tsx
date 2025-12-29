import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { QuestionCard } from '@/components/QuestionCard';
import { StreakFire, StreakBroken, StreakMilestone, XPEarned, PreviouslySolvedInfo } from '@/components/StreakFire';
import { useStreak } from '@/hooks/useStreak';
import { Question } from '@/data/questions';
import { useInfiniteQuestions } from '@/hooks/useQuestions';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { recordCorrectAnswer, recordWrongAnswer, recordSkippedQuestion, getUserStats, awardMilestoneXP } from '@/services/statsService';
import { getLocalStats } from '@/services/statsQueueService';
import { initializeSounds, playCorrectSound, playIncorrectSound, cleanupSounds, setSoundEnabled } from '@/services/soundService';
import { logRankUp, logQuestionsCompleted, logStartedPracticing } from '@/services/activityService';
import { getUserProfile } from '@/services/userService';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { debug, debugError } from '@/utils/debug';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Hacker Ranks - cyberpunk style progression
// Adjusted for new XP system with progressive streak multipliers and ~2K questions
const HACKER_RANKS: { name: string; minXP: number; icon: IoniconsName; color: string }[] = [
  { name: 'n00b', minXP: 0, icon: 'person-outline', color: '#6B7280' },
  { name: 'Script Kiddie', minXP: 50, icon: 'code-slash', color: '#10B981' },
  { name: 'Code Monkey', minXP: 150, icon: 'terminal', color: '#3B82F6' },
  { name: 'Hacktivist', minXP: 350, icon: 'laptop-outline', color: '#8B5CF6' },
  { name: 'White Hat', minXP: 700, icon: 'shield-checkmark', color: '#F59E0B' },
  { name: 'Black Hat', minXP: 1500, icon: 'skull', color: '#EF4444' },
  { name: 'Ghost', minXP: 3000, icon: 'eye-off', color: '#00FF94' },
  { name: 'Phantom', minXP: 6000, icon: 'sparkles', color: '#A855F7' },
  { name: 'Legend', minXP: 12000, icon: 'diamond', color: '#FFD700' },
];

const getHackerRank = (xp: number) => {
  for (let i = HACKER_RANKS.length - 1; i >= 0; i--) {
    if (xp >= HACKER_RANKS[i].minXP) {
      return {
        current: HACKER_RANKS[i],
        next: HACKER_RANKS[i + 1] || null,
        index: i,
      };
    }
  }
  return { current: HACKER_RANKS[0], next: HACKER_RANKS[1], index: 0 };
};

export default function QuestionFeed() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  
  // Get auth context
  const { user, isAuthenticated } = useAuth();

  // Get settings from context
  const { selectedTopics, selectedDifficulties, selectedCompanies, selectedCategory, questionStatusFilter, hapticFeedback, showExplanations, soundEffects } = useSettings();

  // Convert Sets to arrays for the hook
  const topicsArray = useMemo(() => Array.from(selectedTopics), [selectedTopics]);
  const difficultiesArray = useMemo(() => Array.from(selectedDifficulties), [selectedDifficulties]);
  const companiesArray = useMemo(() => Array.from(selectedCompanies), [selectedCompanies]);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [wrongQuestions, setWrongQuestions] = useState<Set<string>>(new Set());
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [correctCount, setCorrectCount] = useState(0);
  const [showSkipToast, setShowSkipToast] = useState(false);
  const [lastSkippedQuestion, setLastSkippedQuestion] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [previouslyAnswered, setPreviouslyAnswered] = useState<Set<string>>(new Set());
  const [previouslyCorrect, setPreviouslyCorrect] = useState<Set<string>>(new Set());
  const [previouslyWrong, setPreviouslyWrong] = useState<Set<string>>(new Set());
  const [previouslySkipped, setPreviouslySkipped] = useState<Set<string>>(new Set());
  const [userXP, setUserXP] = useState(0); // Track user's total XP from Firestore
  const [previousXP, setPreviousXP] = useState(0); // Track previous XP to detect changes
  const [showXPEarned, setShowXPEarned] = useState(false); // Show XP earned toast
  const [xpEarnedAmount, setXpEarnedAmount] = useState(1); // Amount of XP earned (for display)
  const [xpStreakMultiplier, setXpStreakMultiplier] = useState(0); // Streak multiplier for display
  const [showPreviouslySolvedInfo, setShowPreviouslySolvedInfo] = useState(false); // Show info about previously solved
  const xpBadgeScale = useSharedValue(1); // Animate XP badge
  const [userName, setUserName] = useState<string | null>(null); // User's display name for activity logging
  const [sessionQuestionsAnswered, setSessionQuestionsAnswered] = useState(0); // Track questions answered in this session
  const [hasLoggedSessionStart, setHasLoggedSessionStart] = useState(false); // Track if we've logged session start
  
  // Rank-up modal state
  const [showRankUpModal, setShowRankUpModal] = useState(false);
  const [newRank, setNewRank] = useState<typeof HACKER_RANKS[0] | null>(null);
  const [previousRankIndex, setPreviousRankIndex] = useState(-1); // -1 means not initialized yet

  // Streak feature
  const {
    streak,
    consecutiveCorrect,
    isActive: isStreakActive,
    bestStreak,
    showCelebration: showStreakCelebration,
    showMilestone,
    currentMilestone,
    wasJustBroken,
    brokenStreakCount,
    recordCorrectAnswer: recordStreakCorrect,
    recordIncorrectAnswer: recordStreakIncorrect,
    recordSkip: recordStreakSkip,
    dismissCelebration,
    dismissMilestone,
    dismissBrokenStreak,
    getProgress,
    getNextMilestone,
  } = useStreak();

  // Skip toast animation
  const skipToastOpacity = useSharedValue(0);
  const skipToastTranslateY = useSharedValue(-20);

  const skipToastStyle = useAnimatedStyle(() => ({
    opacity: skipToastOpacity.value,
    transform: [{ translateY: skipToastTranslateY.value }],
  }));

  // Track skip toast timeout for cleanup
  const skipToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSkipNotification = useCallback((questionTopic: string) => {
    // Clear any existing timeout
    if (skipToastTimeoutRef.current) {
      clearTimeout(skipToastTimeoutRef.current);
    }
    
    setLastSkippedQuestion(questionTopic);
    setShowSkipToast(true);
    skipToastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 300 })
    );
    skipToastTranslateY.value = withSequence(
      withTiming(0, { duration: 200 }),
      withTiming(0, { duration: 1500 }),
      withTiming(-20, { duration: 300 })
    );
    
    // Hide after animation - store timeout ID for cleanup
    skipToastTimeoutRef.current = setTimeout(() => {
      setShowSkipToast(false);
      skipToastTimeoutRef.current = null;
    }, 2000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (skipToastTimeoutRef.current) {
        clearTimeout(skipToastTimeoutRef.current);
      }
    };
  }, []);

  // Fetch questions from Firebase (with fallback to mock data)
  // Pass selected topics, difficulties, companies, and category from settings
  const { feedQuestions, isLoading, error, refetch, hasMore, loadMore, isLoadingMore } = useInfiniteQuestions({
    topics: topicsArray,
    difficulties: difficultiesArray,
    companies: companiesArray,
    category: selectedCategory,
    shuffle: true,
  });

  // Filter questions based on status filter
  // Note: We only check previouslyAnswered (from Firestore), NOT session answeredQuestions
  // This ensures questions answered in the current session stay visible until user swipes
  const filteredQuestions = useMemo(() => {
    debug('feed', 'filteredQuestions recalculating:', {
      feedQuestionsLength: feedQuestions.length,
      questionStatusFilter,
      previouslyAnsweredSize: previouslyAnswered.size,
      answeredQuestionsSize: answeredQuestions.size,
    });
    
    if (questionStatusFilter === 'all') {
      debug('feed', 'Filter: all - returning all questions');
      return feedQuestions;
    }

    const filtered = feedQuestions.filter((question) => {
      // Only check previouslyAnswered (from Firestore), not current session answers
      // This prevents questions from disappearing immediately after answering
      const isPreviouslyAnswered = previouslyAnswered.has(question.id);
      
      switch (questionStatusFilter) {
        case 'new':
          // Show only questions that haven't been answered before (from Firestore)
          // Questions answered in current session will still show until user swipes
          return !isPreviouslyAnswered;
        case 'attempted':
          // Show questions that have been answered before (from Firestore)
          return isPreviouslyAnswered;
        case 'unattempted':
          // Show questions not attempted before (same as new)
          return !isPreviouslyAnswered;
        default:
          return true;
      }
    });
    
    debug('feed', 'Filtered questions result:', {
      originalLength: feedQuestions.length,
      filteredLength: filtered.length,
      questionStatusFilter,
    });
    
    return filtered;
  }, [feedQuestions, questionStatusFilter, previouslyAnswered, answeredQuestions]);

  // Initialize and cleanup sounds
  useEffect(() => {
    initializeSounds();
    
    return () => {
      cleanupSounds();
    };
  }, []);

  // Update sound enabled status when settings change
  useEffect(() => {
    setSoundEnabled(soundEffects);
  }, [soundEffects]);

  // Load user's previously answered questions, XP, and profile
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          // Try to load from Firestore first
          let stats;
          try {
            stats = await getUserStats(user.uid);
          } catch (error) {
            // If offline, try local stats
            debug('feed', 'Failed to load from Firestore, trying local stats...');
            const localStats = await getLocalStats();
            if (localStats) {
              // Use local stats structure
              stats = {
                answeredQuestionIds: localStats.answeredQuestionIds || [],
                correctQuestionIds: localStats.correctQuestionIds || [],
                wrongQuestionIds: localStats.wrongQuestionIds || [],
                skippedQuestionIds: localStats.skippedQuestionIds || [],
                xp: localStats.xp || 0,
              } as any;
            } else {
              throw error; // Re-throw if no local stats either
            }
          }

          // Also load local stats to merge with server stats
          const localStats = await getLocalStats();
          const mergedXP = localStats ? Math.max(stats.xp || 0, localStats.xp || 0) : (stats.xp || 0);

          setPreviouslyAnswered(new Set(stats.answeredQuestionIds || []));
          setPreviouslyCorrect(new Set(stats.correctQuestionIds || []));
          setPreviouslyWrong(new Set(stats.wrongQuestionIds || []));
          setPreviouslySkipped(new Set(stats.skippedQuestionIds || []));
          setUserXP(mergedXP); // Use merged XP (server or local, whichever is higher)
          setPreviousXP(mergedXP); // Initialize previous XP to prevent showing toast on first load
          
          // Initialize previous rank index to prevent showing rank-up modal on first load
          const currentRank = getHackerRank(mergedXP);
          setPreviousRankIndex(currentRank.index);
          
          // Load user profile for name
          const profile = await getUserProfile(user.uid);
          setUserName(profile?.name || user.displayName || null);
          
          debug('feed', 'Loaded user stats:', {
            answered: stats.answeredQuestionIds?.length || 0,
            correct: stats.correctQuestionIds?.length || 0,
            wrong: stats.wrongQuestionIds?.length || 0,
            skipped: stats.skippedQuestionIds?.length || 0,
            xp: mergedXP,
            rank: currentRank.current.name,
          });
        } catch (error) {
          debugError('feed', 'Error loading user data:', error);
          // Try to load local stats as fallback
          const localStats = await getLocalStats();
          if (localStats) {
            setUserXP(localStats.xp || 0);
            setPreviousXP(localStats.xp || 0);
          }
        }
      } else {
        // Reset state if user logs out
        setUserXP(0);
        setUserName(null);
        setPreviousRankIndex(-1); // Reset to uninitialized state
        setSessionQuestionsAnswered(0);
        setHasLoggedSessionStart(false);
      }
    };
    loadUserData();
  }, [user?.uid]);

  // Reset state when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setAnsweredQuestions(new Set());
    setWrongQuestions(new Set());
    setSkippedQuestions(new Set());
    setCorrectCount(0);
    // Scroll to top when filters change
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [topicsArray.length, difficultiesArray.length]);

  // Calculate XP and rank (use userXP from Firestore, not session correctCount)
  const xp = userXP;
  const rankInfo = useMemo(() => getHackerRank(xp), [xp]);
  const progressToNext = rankInfo.next
    ? ((xp - rankInfo.current.minXP) / (rankInfo.next.minXP - rankInfo.current.minXP)) * 100
    : 100;

  // Detect XP increase and show toast
  useEffect(() => {
    if (isAuthenticated && userXP > previousXP && previousXP > 0) {
      // XP increased - calculate amount earned and show toast
      const earned = userXP - previousXP;
      setXpEarnedAmount(earned);
      // Note: streakMultiplier is set when XP is earned, not here
      setShowXPEarned(true);
      xpBadgeScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 300 })
      );
    }
    setPreviousXP(userXP);
  }, [userXP, previousXP, isAuthenticated, xpBadgeScale]);

  // Animated style for XP badge
  const xpBadgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpBadgeScale.value }],
  }));

  // Award XP when milestone is reached
  useEffect(() => {
    if (isAuthenticated && showMilestone && currentMilestone > 0 && user?.uid) {
      const awardXP = async () => {
        const xpReward = await awardMilestoneXP(user.uid, currentMilestone);
        if (xpReward > 0) {
          // Update local XP state
          setUserXP((prev) => prev + xpReward);
          // Show XP earned toast for milestone (with a slight delay after milestone toast)
          setTimeout(() => {
            setXpEarnedAmount(xpReward);
            setShowXPEarned(true);
            // Animate badge
            xpBadgeScale.value = withSequence(
              withTiming(1.2, { duration: 200 }),
              withTiming(1, { duration: 300 })
            );
          }, 500); // Delay to show after milestone celebration
        }
      };
      awardXP();
    }
  }, [showMilestone, currentMilestone, isAuthenticated, user?.uid, xpBadgeScale]);

  // Detect rank-up and show modal
  useEffect(() => {
    // Only show rank-up if user is authenticated, rank increased, and previousRankIndex is initialized (not -1)
    if (isAuthenticated && rankInfo.index > previousRankIndex && previousRankIndex !== -1) {
      setNewRank(rankInfo.current);
      setShowRankUpModal(true);
      
      // Haptic feedback for rank-up
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Log rank-up activity for social proof
      if (user?.uid) {
        logRankUp(user.uid, userName, rankInfo.current.name);
      }
      
      // Update previous rank index after showing modal
      setPreviousRankIndex(rankInfo.index);
    }
  }, [rankInfo.index, isAuthenticated, hapticFeedback, previousRankIndex, user?.uid, userName]);

  // Handle answer
  const handleAnswer = useCallback(
    async (isCorrect: boolean, questionId: string, topic?: string, difficulty?: string) => {
      debug('feed', 'handleAnswer called:', {
        questionId,
        isCorrect,
        currentIndex,
        currentQuestionId: filteredQuestions[currentIndex]?.id,
        filteredQuestionsLength: filteredQuestions.length,
      });
      
      setAnsweredQuestions((prev) => {
        const next = new Set([...prev, questionId]);
        debug('feed', 'Updated answeredQuestions:', {
          previousSize: prev.size,
          newSize: next.size,
          questionId,
        });
        return next;
      });
      
      // Track session questions and log activities
      const newSessionCount = sessionQuestionsAnswered + 1;
      setSessionQuestionsAnswered(newSessionCount);
      
      // Log session start on first question
      if (!hasLoggedSessionStart && user?.uid) {
        setHasLoggedSessionStart(true);
        logStartedPracticing(user.uid, userName);
      }
      
      // Log question milestones (10, 25, 50, 100)
      const milestones = [10, 25, 50, 100];
      if (milestones.includes(newSessionCount) && user?.uid) {
        logQuestionsCompleted(user.uid, userName, newSessionCount);
      }

      if (isCorrect) {
        // Play correct answer sound
        if (soundEffects) {
          playCorrectSound();
        }
        
        // Check if this is the first time answering correctly (to update XP and streak)
        const wasCorrectBefore = previouslyCorrect.has(questionId);
        
        // Only record streak progress for NEW questions (not previously solved)
        if (!wasCorrectBefore) {
          recordStreakCorrect();
        } else {
          // Show info toast explaining why XP/streak didn't increment
          setShowPreviouslySolvedInfo(true);
        }
        
        setCorrectCount((prev) => prev + 1);
        setWrongQuestions((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        
        // Update historical tracking - BUT don't update previouslyAnswered immediately
        // This prevents the question from being filtered out until user swipes
        // We'll update it when the user actually navigates away
        debug('feed', 'Correct answer - NOT updating previouslyAnswered yet to prevent auto-advance');
        // setPreviouslyAnswered((prev) => new Set([...prev, questionId])); // REMOVED - update on swipe instead
        setPreviouslyCorrect((prev) => new Set([...prev, questionId]));
        setPreviouslyWrong((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        setPreviouslySkipped((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        
        // Save correct answer to Firestore and get XP earned
        // XP is only awarded for NEW questions (handled in recordCorrectAnswer)
        let xpEarned = 0;
        let streakMultiplier = 0;
        if (user?.uid && topic && difficulty) {
          // Only pass streak for NEW questions (not previously solved)
          const currentStreak = (!wasCorrectBefore && isStreakActive) ? streak : 0;
          const result = await recordCorrectAnswer(user.uid, questionId, topic, difficulty, currentStreak);
          xpEarned = result.xp;
          streakMultiplier = result.streakMultiplier;
          
          // Update XP only if this is the first correct answer for this question
          if (!wasCorrectBefore && xpEarned > 0) {
            setUserXP((prev) => prev + xpEarned);
            // Store streak multiplier for display
            setXpStreakMultiplier(streakMultiplier);
          }
        }
      } else {
        // Play incorrect answer sound
        if (soundEffects) {
          playIncorrectSound();
        }
        
        // Record streak break
        recordStreakIncorrect();
        
        setWrongQuestions((prev) => new Set([...prev, questionId]));
        
        // Update historical tracking - BUT don't update previouslyAnswered immediately
        // This prevents the question from being filtered out until user swipes
        debug('feed', 'Wrong answer - NOT updating previouslyAnswered yet to prevent auto-advance');
        // setPreviouslyAnswered((prev) => new Set([...prev, questionId])); // REMOVED - update on swipe instead
        setPreviouslyWrong((prev) => new Set([...prev, questionId]));
        // Don't remove from previouslyCorrect - once solved correctly, always show as solved
        setPreviouslySkipped((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        
        // XP is never decremented - users keep their XP even if they get it wrong later
        // Question stays in "Previously Solved" status even if answered wrong on re-attempt
        
        // Save wrong answer to Firestore
        if (user?.uid && topic && difficulty) {
          recordWrongAnswer(user.uid, questionId, topic, difficulty);
        }
      }

      setSkippedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    },
    [user?.uid, previouslyCorrect, sessionQuestionsAnswered, hasLoggedSessionStart, userName]
  );

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        const isEndScreen = newIndex >= filteredQuestions.length;
        
        debug('feed', 'onViewableItemsChanged:', {
          newIndex,
          currentIndex,
          isEndScreen,
          filteredQuestionsLength: filteredQuestions.length,
          previousQuestionId: currentIndex >= 0 && currentIndex < filteredQuestions.length ? filteredQuestions[currentIndex]?.id : null,
          newQuestionId: !isEndScreen && newIndex < filteredQuestions.length ? filteredQuestions[newIndex]?.id : 'END_SCREEN',
          wasAnswered: currentIndex >= 0 && currentIndex < filteredQuestions.length ? answeredQuestions.has(filteredQuestions[currentIndex]?.id) : false,
        });

        // Don't process skip logic if we're on the end screen
        if (!isEndScreen) {
          // If user swiped to a new question, update previouslyAnswered for the question they left
          if (newIndex !== currentIndex && currentIndex >= 0 && currentIndex < filteredQuestions.length) {
            const previousQuestionId = filteredQuestions[currentIndex]?.id;
            if (previousQuestionId && answeredQuestions.has(previousQuestionId)) {
              debug('feed', 'User swiped away from answered question - updating previouslyAnswered:', previousQuestionId);
              // Now it's safe to update previouslyAnswered since user has moved away
              setPreviouslyAnswered((prev) => {
                const next = new Set([...prev, previousQuestionId]);
                debug('feed', 'Updated previouslyAnswered after swipe:', {
                  previousSize: prev.size,
                  newSize: next.size,
                  questionId: previousQuestionId,
                });
                return next;
              });
            }
          }

          // Check if user swiped past without answering (skipped)
          if (
            newIndex > currentIndex &&
            currentIndex >= 0 &&
            currentIndex < filteredQuestions.length &&
            !answeredQuestions.has(filteredQuestions[currentIndex]?.id)
          ) {
            const skippedQ = filteredQuestions[currentIndex];
            debug('feed', 'Question skipped:', skippedQ?.id);
            setSkippedQuestions((prev) =>
              new Set([...prev, skippedQ?.id])
            );
            
            // Show skip notification and save to Firestore
            if (skippedQ) {
              showSkipNotification(skippedQ.topic);
              if (hapticFeedback) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              
              // Update historical tracking
              setPreviouslySkipped((prev) => new Set([...prev, skippedQ.id]));
              
              // Record skip in Firestore
              if (user?.uid && skippedQ.id) {
                recordSkippedQuestion(user.uid, skippedQ.id);
              }
            }
          }
        }

        if (newIndex !== currentIndex) {
          debug('feed', 'Updating currentIndex:', { from: currentIndex, to: newIndex, isEndScreen });
          setCurrentIndex(newIndex);
          if (hapticFeedback && !isEndScreen) {
            Haptics.selectionAsync();
          }
        }
      }
    },
    [currentIndex, answeredQuestions, filteredQuestions, showSkipNotification, hapticFeedback, user?.uid]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Handle pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoading) return;
    
    setIsRefreshing(true);
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await refetch();
      // Reset to first question after refresh
      setCurrentIndex(0);
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: 0, animated: false });
      }
    } catch (error) {
      debugError('feed', 'Error refreshing questions:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, isLoading, refetch, hapticFeedback]);

  // Navigate back to home
  const handleBackPress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Navigate to progress screen
  const handleRankPress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Show sign-in modal if not authenticated, otherwise show progress
    if (!isAuthenticated) {
      setShowSignInModal(true);
    } else {
      router.push('/progress');
    }
  };

  // Navigate to settings screen
  const handleSettingsPress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/settings');
  };

  // Create data array with end screen
  type ListItem = Question | { id: '__END__'; type: 'end' };
  
  const listData = useMemo(() => {
    // Add a special "end" marker as the last item
    const endMarker: ListItem = { id: '__END__', type: 'end' };
    return [...filteredQuestions, endMarker];
  }, [filteredQuestions]);

  // Render question card or end screen
  const renderQuestion = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      // Render end screen if this is the last item
      if ('type' in item && item.type === 'end') {
        const isLastQuestion = index === filteredQuestions.length;
        debug('feed', 'Rendering end screen:', {
          index,
          filteredQuestionsLength: filteredQuestions.length,
          isLastQuestion,
          hasMore,
        });
        
        return (
          <View style={styles.endScreenContainer}>
            <Animated.View entering={FadeInUp.duration(400)} style={styles.endScreenContent}>
              <Ionicons name="checkmark-circle" size={40} color={colors.primary} style={styles.endScreenIcon} />
              <Text style={styles.endScreenTitle}>End of Questions</Text>
              <Text style={styles.endScreenSubtitle}>
                Swipe up to review previous questions
              </Text>
              
              <View style={styles.endScreenActions}>
                {hasMore && (
                  <Pressable
                    style={styles.endScreenButton}
                    onPress={async () => {
                      debug('feed', 'Load more button pressed');
                      if (hapticFeedback) {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      await loadMore();
                      // Scroll back to show new questions
                      if (flatListRef.current && filteredQuestions.length > 0) {
                        setTimeout(() => {
                          flatListRef.current?.scrollToIndex({
                            index: filteredQuestions.length - 1,
                            animated: true,
                          });
                        }, 300);
                      }
                    }}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={16} color={colors.primary} />
                        <Text style={styles.endScreenButtonText}>Load More</Text>
                      </>
                    )}
                  </Pressable>
                )}
                
                <Pressable
                  style={styles.endScreenButton}
                  onPress={async () => {
                    debug('feed', 'Back to top button pressed');
                    if (hapticFeedback) {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    flatListRef.current?.scrollToIndex({
                      index: 0,
                      animated: true,
                    });
                  }}
                >
                  <Ionicons name="arrow-up" size={16} color={colors.textSecondary} />
                  <Text style={styles.endScreenButtonText}>Back to First</Text>
                </Pressable>
                
                <Pressable
                  style={styles.endScreenButton}
                  onPress={async () => {
                    debug('feed', 'Adjust filters button pressed');
                    if (hapticFeedback) {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    router.push('/settings');
                  }}
                >
                  <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.endScreenButtonText}>Adjust Filters</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        );
      }
      
      // Render normal question card
      const question = item as Question;
      return (
        <QuestionCard
          question={question}
          onAnswer={handleAnswer}
          isActive={index === currentIndex}
          wasSkipped={skippedQuestions.has(question.id) || previouslySkipped.has(question.id)}
          wasWrong={wrongQuestions.has(question.id) || previouslyWrong.has(question.id)}
          showExplanations={showExplanations}
          wasAnswered={previouslyAnswered.has(question.id) || answeredQuestions.has(question.id)}
          wasAnsweredCorrectly={previouslyCorrect.has(question.id)}
          hapticFeedback={hapticFeedback}
        />
      );
    },
    [currentIndex, handleAnswer, skippedQuestions, wrongQuestions, answeredQuestions, showExplanations, previouslyAnswered, previouslyCorrect, previouslyWrong, previouslySkipped, hapticFeedback, filteredQuestions, hasMore, loadMore, isLoadingMore]
  );

  const keyExtractor = useCallback(
    (item: ListItem, index: number) => {
      if ('type' in item && item.type === 'end') {
        return '__END__';
      }
      const question = item as Question;
      return `${question.id}-${index}`;
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Header - Back + Hacker Rank Badge + Settings */}
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        
        <Pressable onPress={handleRankPress} style={styles.rankBadge}>
          <Ionicons name={rankInfo.current.icon} size={28} color={rankInfo.current.color} />
          <View style={styles.rankInfo}>
            <Text style={[styles.rankName, { color: rankInfo.current.color }]}>
              {rankInfo.current.name}
            </Text>
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpFill,
                  { 
                    width: `${progressToNext}%`,
                    backgroundColor: rankInfo.current.color,
                  },
                ]}
              />
            </View>
          </View>
          <Animated.View 
            style={[
              styles.xpBadge,
              xpBadgeAnimatedStyle,
            ]}
          >
            {isAuthenticated ? (
              <Text style={styles.xpText}>{xp} XP</Text>
            ) : (
              <Text style={styles.signInPrompt}>Sign in to earn XP</Text>
            )}
          </Animated.View>
        </Pressable>
        
        <Pressable onPress={handleSettingsPress} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Session Stats - Bottom Right */}
      <View style={styles.sessionStatsContainer}>
        {/* Streak indicator */}
        {(isStreakActive || consecutiveCorrect > 0) && (
          <View style={styles.streakContainer}>
            <Animated.View 
              entering={FadeIn.duration(400)} 
              style={styles.streakIndicator}
            >
              {isStreakActive ? (
                <>
                  <View style={[styles.streakIconActive, showStreakCelebration && styles.streakIconCelebrating]}>
                    <Ionicons name="flame" size={16} color="#FF6B00" />
                  </View>
                  <Text style={styles.streakCountActive}>{streak}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="flame-outline" size={14} color={colors.textMuted} />
                  <View style={styles.streakDotsMinimal}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.streakDotMinimal,
                          i < consecutiveCorrect && styles.streakDotFilled,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        )}
      </View>

      {/* Streak Broken Toast */}
      {wasJustBroken && (
        <StreakBroken
          previousStreak={brokenStreakCount}
          onComplete={dismissBrokenStreak}
        />
      )}

      {/* Streak Milestone Toast */}
      {showMilestone && (
        <StreakMilestone
          streak={currentMilestone}
          nextMilestone={getNextMilestone()}
          onComplete={dismissMilestone}
        />
      )}

      {/* XP Earned Toast */}
      {showXPEarned && (
        <XPEarned
          amount={xpEarnedAmount}
          streakMultiplier={xpStreakMultiplier}
          onComplete={() => {
            setShowXPEarned(false);
            setXpStreakMultiplier(0); // Reset after toast dismisses
          }}
        />
      )}

      {/* Previously Solved Info Toast */}
      {showPreviouslySolvedInfo && (
        <PreviouslySolvedInfo
          onComplete={() => setShowPreviouslySolvedInfo(false)}
        />
      )}

      {/* Skip Toast Notification */}
      {showSkipToast && (
        <Animated.View style={[styles.skipToast, skipToastStyle]}>
          <Ionicons name="play-skip-forward" size={24} color={colors.warning} />
          <View style={styles.skipToastContent}>
            <Text style={styles.skipToastTitle}>Question Skipped</Text>
            <Text style={styles.skipToastSubtitle}>
              {lastSkippedQuestion} • Will appear again later
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Sign In Modal */}
      <Modal
        visible={showSignInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignInModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSignInModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowSignInModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.signInContainer}>
              <Ionicons name="lock-closed-outline" size={60} color={colors.textMuted} />
              <Text style={styles.signInTitle}>Sign in to earn XP!</Text>
              <Text style={styles.signInMessage}>
                Create an account to save your progress, track your stats, and climb the hacker ranks.
              </Text>
              <Pressable
                style={styles.signInButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowSignInModal(false);
                  router.push('/');
                }}
              >
                <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
              </Pressable>
              <Pressable
                style={styles.continueBrowsingButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSignInModal(false);
                }}
              >
                <Text style={styles.continueBrowsingText}>Continue as Guest</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rank-Up Modal */}
      <Modal
        visible={showRankUpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRankUpModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowRankUpModal(false)}
        >
          <Animated.View
            entering={FadeInUp.duration(600).springify()}
            style={styles.rankUpModal}
            onStartShouldSetResponder={() => true}
          >
            {/* New Rank Display */}
            {newRank && (
              <>
                {/* Rank Icon */}
                <View style={[styles.rankUpIconContainer, { backgroundColor: newRank.color + '15', borderColor: newRank.color + '30' }]}>
                  <Ionicons name={newRank.icon} size={40} color={newRank.color} />
                </View>
                
                {/* Rank Up Badge */}
                <View style={[styles.rankUpBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={styles.rankUpBadgeText}>RANK ADVANCEMENT</Text>
                </View>
                
                {/* New Rank Name */}
                <Text style={[styles.rankUpName, { color: newRank.color }]}>
                  {newRank.name}
                </Text>
                
                {/* XP Badge */}
                <View style={styles.rankUpXPBadge}>
                  <Ionicons name="flash" size={14} color="#FFD700" />
                  <Text style={styles.rankUpXPText}>{xp} XP</Text>
                </View>

                {/* Divider */}
                <View style={styles.rankUpDivider} />

                {/* Next Rank Info */}
                {rankInfo.next && (
                  <View style={styles.rankUpNextContainer}>
                    <Text style={styles.rankUpNextLabel}>Next Milestone</Text>
                    <Text style={styles.rankUpNextGoal}>
                      {rankInfo.next.name} • {rankInfo.next.minXP} XP
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Close Button */}
            <Pressable
              style={styles.rankUpCloseButton}
              onPress={() => setShowRankUpModal(false)}
            >
              <Text style={styles.rankUpCloseText}>Continue</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={colors.warning} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State - No questions available at all for selected filters */}
      {!isLoading && !error && feedQuestions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Questions Available</Text>
          <Text style={styles.emptyText}>
            There are no questions available for your current topic and difficulty selection. Try adjusting your filters to see more questions.
          </Text>
          <Pressable 
            style={styles.adjustFiltersButton} 
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State - Questions exist but filtered out by status filter */}
      {!isLoading && !error && filteredQuestions.length === 0 && feedQuestions.length > 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="filter-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Matching Questions</Text>
          <Text style={styles.emptyText}>
            {questionStatusFilter === 'new' || questionStatusFilter === 'unattempted'
              ? "You've already attempted all questions in these categories! Try changing your filters or come back later for new questions."
              : "No questions match your current filters. Try adjusting your topic, difficulty, or status filters in settings."}
          </Text>
          <Pressable 
            style={styles.adjustFiltersButton} 
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={styles.adjustFiltersButtonText}>Adjust Filters</Text>
          </Pressable>
        </View>
      )}

      {/* Question Feed */}
      {!isLoading && filteredQuestions.length > 0 && (
        <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderQuestion}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        maintainVisibleContentPosition={
          listData.length > 0
            ? {
                minIndexForVisible: 0,
              }
            : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressViewOffset={0}
          />
        }
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failures gracefully
          debug('feed', 'Scroll to index failed:', info);
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          });
        }}
      />
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsBarTitle}>Session Stats</Text>
        <View style={styles.statsBarContent}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{correctCount + wrongQuestions.size}</Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{correctCount}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{wrongQuestions.size}</Text>
            <Text style={[styles.statLabel, styles.wrongLabel]}>Wrong</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {(correctCount + wrongQuestions.size) > 0
                ? Math.round((correctCount / (correctCount + wrongQuestions.size)) * 100)
                : 0}
              %
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: colors.background,
    opacity: 0.8,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 100,
  },
  rankBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  xpBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpBadge: {
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  xpText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  signInPrompt: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsBar: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.cardSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statsBarTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statsBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  wrongLabel: {
    color: colors.incorrect,
  },
  skipNumber: {
    color: colors.warning,
  },
  skipLabel: {
    color: colors.warning,
  },
  skipToast: {
    position: 'absolute',
    top: 115,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    zIndex: 200,
  },
  skipToastContent: {
    flex: 1,
  },
  skipToastTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.warning,
  },
  skipToastSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  adjustFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
    gap: spacing.xs,
  },
  adjustFiltersButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    zIndex: 10,
  },
  signInContainer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  signInTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  signInMessage: {
    fontSize: typography.fontSize.base,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  signInButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  continueBrowsingButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  continueBrowsingText: {
    fontSize: typography.fontSize.base,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Rank-Up Modal
  rankUpModal: {
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxWidth: 400,
    width: '90%',
  },
  rankUpIconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  rankUpBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  rankUpBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  rankUpName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rankUpXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  rankUpXPText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rankUpDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  rankUpNextContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rankUpNextLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankUpNextGoal: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Session Stats & Streak Styles
  sessionStatsContainer: {
    position: 'absolute',
    bottom: 140,
    right: spacing.base,
    zIndex: 100,
    alignItems: 'flex-end',
  },
  streakContainer: {
    alignItems: 'flex-end',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  streakIconActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakIconCelebrating: {
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
  },
  streakCountActive: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: '#FF6B00',
    minWidth: 20,
    textAlign: 'center',
  },
  streakDotsMinimal: {
    flexDirection: 'row',
    gap: 3,
  },
  streakDotMinimal: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  streakDotFilled: {
    backgroundColor: '#FF6B00',
  },

  rankUpCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  rankUpCloseText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  
  // End Screen - Minimalist Design
  endScreenContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  endScreenContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  endScreenIcon: {
    marginBottom: spacing.lg,
  },
  endScreenTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  endScreenSubtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  endScreenActions: {
    width: '100%',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  endScreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardSubtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  endScreenButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
