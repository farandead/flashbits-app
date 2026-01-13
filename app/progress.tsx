import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, UserProfile, updateUserProfile, ValidationError } from '@/services/userService';
import { getUserStats, UserStats, getFormattedTopicProgress } from '@/services/statsService';
import { topicColors } from '@/data/questions';
import SignInRequired from '@/components/SignInRequired';
import { debugError } from '@/utils/debug';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type IoniconsName = keyof typeof Ionicons.glyphMap;

// Coding levels for editing
const CODING_LEVELS: { id: string; label: string; description: string; icon: IoniconsName }[] = [
  { id: 'beginner', label: 'Beginner', description: 'Just starting out with coding', icon: 'leaf-outline' },
  { id: 'intermediate', label: 'Intermediate', description: 'Comfortable with basics, learning DSA', icon: 'trending-up-outline' },
  { id: 'advanced', label: 'Advanced', description: 'Strong DSA skills, practicing for interviews', icon: 'flash-outline' },
  { id: 'expert', label: 'Expert', description: 'Very comfortable, fine-tuning skills', icon: 'diamond-outline' },
];

// Goals for editing
const GOALS: { id: string; label: string; icon: IoniconsName }[] = [
  { id: 'faang', label: 'Get into FAANG/Big Tech', icon: 'business-outline' },
  { id: 'first_job', label: 'Land my first tech job', icon: 'briefcase-outline' },
  { id: 'promotion', label: 'Get promoted at work', icon: 'arrow-up-outline' },
  { id: 'skills', label: 'Improve coding skills', icon: 'trending-up-outline' },
  { id: 'competitive', label: 'Competitive programming', icon: 'trophy-outline' },
  { id: 'learn', label: 'Just learning for fun', icon: 'heart-outline' },
];

// Hacker Ranks
// Adjusted for new XP system with progressive streak multipliers and ~2K questions
const HACKER_RANKS: { name: string; minXP: number; icon: IoniconsName; color: string; description: string }[] = [
  { name: 'n00b', minXP: 0, icon: 'person-outline', color: '#6B7280', description: 'Just getting started' },
  { name: 'Script Kiddie', minXP: 50, icon: 'code-slash', color: '#10B981', description: 'Learning the basics' },
  { name: 'Code Monkey', minXP: 150, icon: 'terminal', color: '#3B82F6', description: 'Writing code daily' },
  { name: 'Hacktivist', minXP: 350, icon: 'laptop-outline', color: '#8B5CF6', description: 'Fighting with code' },
  { name: 'White Hat', minXP: 700, icon: 'shield-checkmark', color: '#F59E0B', description: 'Ethical hacker' },
  { name: 'Black Hat', minXP: 1500, icon: 'skull', color: '#EF4444', description: 'Elite programmer' },
  { name: 'Ghost', minXP: 3000, icon: 'eye-off', color: '#00FF94', description: 'Legendary status' },
  { name: 'Phantom', minXP: 6000, icon: 'sparkles', color: '#A855F7', description: 'Mythical coder' },
  { name: 'Legend', minXP: 12000, icon: 'diamond', color: '#FFD700', description: 'Ultimate mastery' },
];

// Mock data for progress
const mockProgress = {
  totalQuestions: 85,
  correctAnswers: 62,
  xp: 62, // XP = correct answers
  topicsProgress: [
    { topic: 'Arrays', total: 12, correct: 10, color: topicColors.Arrays },
    { topic: 'Linked Lists', total: 8, correct: 6, color: topicColors.LinkedLists },
    { topic: 'Stacks & Queues', total: 6, correct: 5, color: topicColors.StacksQueues },
    { topic: 'Hashing', total: 10, correct: 8, color: topicColors.Hashing },
    { topic: 'Trees', total: 9, correct: 7, color: topicColors.Trees },
    { topic: 'Graphs', total: 7, correct: 5, color: topicColors.Graphs },
    { topic: 'Sorting & Searching', total: 5, correct: 4, color: topicColors.Sorting },
    { topic: 'Recursion & Backtracking', total: 6, correct: 4, color: topicColors.Recursion },
    { topic: 'Greedy Algorithms', total: 4, correct: 3, color: topicColors.Greedy },
    { topic: 'Dynamic Programming', total: 8, correct: 5, color: topicColors.DP },
    { topic: 'Bit Manipulation', total: 3, correct: 2, color: topicColors.BitManipulation },
    { topic: 'Math & Number Theory', total: 4, correct: 2, color: topicColors.Math },
    { topic: 'Advanced Data Structures', total: 2, correct: 1, color: topicColors.AdvancedDS },
    { topic: 'Advanced Algorithms', total: 1, correct: 0, color: topicColors.AdvancedAlgo },
  ],
};

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

// Helper to get occupation label
const getOccupationLabel = (id: string): string => {
  const occupations: Record<string, string> = {
    student: 'Student',
    new_grad: 'New Graduate',
    junior: 'Junior Developer',
    mid: 'Mid-level Developer',
    senior: 'Senior Developer',
    career_change: 'Career Changer',
    other: 'Other',
  };
  return occupations[id] || id;
};

// Helper to get level label
const getLevelLabel = (id: string): string => {
  const levels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };
  return levels[id] || id;
};

export default function ProgressScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Edit modals
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<string>('');
  const [editingGoals, setEditingGoals] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          setIsLoadingStats(true);
          const [profile, stats] = await Promise.all([
            getUserProfile(user.uid),
            getUserStats(user.uid),
          ]);
          setUserProfile(profile);
          setUserStats(stats);
        } catch (error) {
          debugError('firebase', 'Error fetching data:', error);
        } finally {
          setIsLoadingStats(false);
        }
      } else {
        setIsLoadingStats(false);
      }
    };
    fetchData();
  }, [user?.uid]);

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Open level editor
  const handleEditLevel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingLevel(userProfile?.codingLevel || 'intermediate');
    setShowLevelModal(true);
  };

  // Open goals editor
  const handleEditGoals = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingGoals(userProfile?.goals || []);
    setShowGoalsModal(true);
  };

  // Save level changes
  const handleSaveLevel = async () => {
    if (!user?.uid || !editingLevel) return;
    
    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateUserProfile(user.uid, { codingLevel: editingLevel });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, codingLevel: editingLevel } : null);
      setShowLevelModal(false);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      debugError('firebase', 'Error saving level:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save goals changes
  const handleSaveGoals = async () => {
    if (!user?.uid) return;
    
    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateUserProfile(user.uid, { goals: editingGoals });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, goals: editingGoals } : null);
      setShowGoalsModal(false);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      debugError('firebase', 'Error saving goals:', error);
      
      // Show user-friendly error message for validation errors
      if (error instanceof ValidationError) {
        Alert.alert('Validation Error', error.message || 'Invalid goals. Please check and try again.');
      } else {
        Alert.alert('Error', 'Failed to save changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle goal selection
  const toggleGoal = (goalId: string) => {
    setEditingGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  // Get display name: profile name > email username > "Hacker"
  const displayName = userProfile?.name 
    || user?.email?.split('@')[0] 
    || 'Hacker';

  // Use real stats or fallback to defaults
  const stats = userStats || {
    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    skippedQuestions: 0,
    xp: 0,
    maxStreak: 0,
    topicsProgress: {},
    difficultyProgress: {},
    answeredQuestionIds: [],
    correctQuestionIds: [],
    lastActiveAt: '',
    createdAt: '',
  };

  const rankInfo = getHackerRank(stats.xp);
  const progressToNext = rankInfo.next
    ? ((stats.xp - rankInfo.current.minXP) / (rankInfo.next.minXP - rankInfo.current.minXP)) * 100
    : 100;

  // Calculate accuracy based on total attempts (correct + wrong)
  const totalAttempts = stats.correctAnswers + stats.wrongAnswers;
  const overallAccuracy =
    totalAttempts > 0
      ? Math.round((stats.correctAnswers / totalAttempts) * 100)
      : 0;

  const xpToNextRank = rankInfo.next
    ? rankInfo.next.minXP - stats.xp
    : 0;

  // Get formatted topic progress for display
  const topicsProgress = userStats ? getFormattedTopicProgress(userStats) : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{displayName}'s Profile</Text>
          <Text style={styles.headerSubtitle}>
            {isAuthenticated ? user?.email : 'Your coding journey'}
          </Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Show sign-in required if not authenticated */}
      {!isAuthenticated ? (
        <SignInRequired 
          message="Sign In to Track Progress"
          description="Create an account to save your progress, earn XP, unlock hacker ranks, and track your coding journey!"
        />
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        {userProfile && (
          <Animated.View
            entering={FadeInUp.duration(600).delay(50)}
            style={styles.userInfoCard}
          >
            <View style={styles.userInfoHeader}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <View style={styles.userInfoText}>
                <Text style={styles.userName}>{userProfile.name}</Text>
                <Text style={styles.userOccupation}>
                  {getOccupationLabel(userProfile.occupation)}
                </Text>
              </View>
            </View>
            <View style={styles.userStatsRow}>
              <Pressable style={styles.userStatItemTappable} onPress={handleEditLevel}>
                <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
                <Text style={styles.userStatTextTappable}>
                  {getLevelLabel(userProfile.codingLevel)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
              <Pressable style={styles.userStatItemTappable} onPress={handleEditGoals}>
                <Ionicons name="flag-outline" size={16} color={colors.primary} />
                <Text style={styles.userStatTextTappable}>
                  {userProfile.goals?.length || 0} goals
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Current Rank Display */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          style={[styles.rankSection, { borderColor: rankInfo.current.color + '40' }]}
        >
          <View style={styles.rankDisplay}>
            <View style={[styles.rankIconContainer, { backgroundColor: rankInfo.current.color + '20' }]}>
              <Ionicons name={rankInfo.current.icon} size={48} color={rankInfo.current.color} />
            </View>
            <View style={styles.rankDetails}>
              <Text style={[styles.rankName, { color: rankInfo.current.color }]}>
                {rankInfo.current.name}
              </Text>
              <Text style={styles.rankDescription}>{rankInfo.current.description}</Text>
              <View style={styles.xpContainer}>
                <Text style={styles.xpValue}>{stats.xp}</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
            </View>
          </View>

          {rankInfo.next && (
            <View style={styles.nextRankInfo}>
              <View style={styles.nextRankTextRow}>
                <Text style={styles.xpNeeded}>{xpToNextRank} XP</Text>
                <Text style={styles.nextRankText}> to reach </Text>
                <Ionicons name={rankInfo.next.icon} size={16} color={rankInfo.next.color} />
                <Text style={[styles.nextRankName, { color: rankInfo.next.color }]}>
                  {' '}{rankInfo.next.name}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressToNext}%`,
                      backgroundColor: rankInfo.current.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* All Ranks */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.allRanksSection}
        >
          <Text style={styles.sectionTitle}>All Ranks</Text>
          <View style={styles.ranksGrid}>
            {HACKER_RANKS.map((rank, index) => {
              const isUnlocked = stats.xp >= rank.minXP;
              const isCurrent = index === rankInfo.index;
              
              return (
                <Animated.View
                  key={rank.name}
                  entering={FadeIn.duration(400).delay(250 + index * 50)}
                  style={[
                    styles.rankCard,
                    !isUnlocked && styles.rankCardLocked,
                    isCurrent && isUnlocked && { 
                      borderColor: rank.color, 
                      borderWidth: 0,
                      backgroundColor: rank.color + '15',
                    },
                  ]}
                >
                  {!isUnlocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
                    </View>
                  )}
                  <Ionicons 
                    name={isUnlocked ? rank.icon : rank.icon} 
                    size={24} 
                    color={isUnlocked ? rank.color : colors.textMuted} 
                  />
                  <Text
                    style={[
                      styles.rankCardName,
                      isUnlocked && { color: rank.color },
                      !isUnlocked && styles.lockedText,
                      isCurrent && isUnlocked && { fontWeight: '700' },
                    ]}
                  >
                    {rank.name}
                  </Text>
                  <Text style={styles.rankCardXP}>{rank.minXP} XP</Text>
                  {isCurrent && isUnlocked && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(300)}
          style={styles.statsSection}
        >
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="bar-chart" size={32} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{totalAttempts}</Text>
              <Text style={styles.statLabel}>Total Attempts</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-circle" size={32} color={colors.correct} />
              </View>
              <Text style={styles.statValue}>{stats.correctAnswers}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="close-circle" size={32} color={colors.incorrect} />
              </View>
              <Text style={styles.statValue}>{stats.wrongAnswers}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="analytics" size={32} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{overallAccuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
          
          {/* Additional Stats Row */}
          <View style={styles.additionalStatsRow}>
            <View style={styles.additionalStatCard}>
              <View style={styles.additionalStatIconContainer}>
                <Ionicons name="document-text" size={24} color={colors.textPrimary} />
              </View>
              <Text style={styles.additionalStatValue}>{stats.totalQuestions}</Text>
              <Text style={styles.additionalStatLabel}>Questions Attempted</Text>
            </View>

            <View style={styles.additionalStatCard}>
              <View style={styles.additionalStatIconContainer}>
                <Ionicons name="trophy" size={24} color="#FFD700" />
              </View>
              <Text style={styles.additionalStatValue}>{stats.correctQuestionIds?.length || 0}</Text>
              <Text style={styles.additionalStatLabel}>Questions Solved</Text>
            </View>

            <View style={styles.additionalStatCard}>
              <View style={styles.additionalStatIconContainer}>
                <Ionicons name="flash" size={24} color="#FFD700" />
              </View>
              <Text style={styles.additionalStatValue}>{stats.xp}</Text>
              <Text style={styles.additionalStatLabel}>Total XP</Text>
            </View>
          </View>

          {/* Max Streak Card - Highlighted */}
          {stats.maxStreak > 0 && (
            <Animated.View
              entering={FadeInUp.duration(600).delay(500)}
              style={styles.maxStreakCard}
            >
              <View style={styles.maxStreakContent}>
                <View style={styles.maxStreakIconContainer}>
                  <Ionicons name="flame" size={32} color="#FF6B00" />
                </View>
                <View style={styles.maxStreakTextContainer}>
                  <Text style={styles.maxStreakLabel}>Best Streak</Text>
                  <Text style={styles.maxStreakValue}>{stats.maxStreak}</Text>
                  <Text style={styles.maxStreakSubtext}>consecutive correct answers</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Topics Progress */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.topicsSection}
        >
          <Text style={styles.sectionTitle}>Topics Mastery</Text>

          {topicsProgress.length > 0 ? (
            topicsProgress.map((topic, index) => {
              const percentage =
                topic.total > 0
                  ? Math.round((topic.correct / topic.total) * 100)
                  : 0;

              return (
                <Animated.View
                  key={topic.topic}
                  entering={FadeIn.duration(400).delay(500 + index * 100)}
                  style={styles.topicItem}
                >
                  <View style={styles.topicHeader}>
                    <View style={styles.topicLeft}>
                      <View
                        style={[
                          styles.topicDot,
                          { backgroundColor: topic.color },
                        ]}
                      />
                      <Text style={styles.topicName}>{topic.topic}</Text>
                    </View>
                    <Text style={styles.topicStats}>
                      {topic.correct}/{topic.total}{' '}
                      <Text style={styles.topicPercentage}>({percentage}%)</Text>
                    </Text>
                  </View>
                  <View style={styles.topicBar}>
                    <View
                      style={[
                        styles.topicBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: topic.color,
                        },
                      ]}
                    />
                  </View>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyStateText}>No topic data yet</Text>
              <Text style={styles.emptyStateSubtext}>Start answering questions to see your progress!</Text>
            </View>
          )}
        </Animated.View>

        {/* Motivational Footer */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(700)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            Keep practicing! Every correct answer earns XP
          </Text>
        </Animated.View>
      </ScrollView>
      )}

      {/* Level Edit Modal */}
      <Modal
        visible={showLevelModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Skill Level</Text>
              <Pressable 
                style={styles.modalCloseButton}
                onPress={() => setShowLevelModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <Text style={styles.modalSubtitle}>
              How would you rate your current coding skills?
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {CODING_LEVELS.map((level) => (
                <Pressable
                  key={level.id}
                  style={[
                    styles.levelOption,
                    editingLevel === level.id && styles.levelOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingLevel(level.id);
                  }}
                >
                  <View style={[
                    styles.levelOptionIcon,
                    editingLevel === level.id && styles.levelOptionIconSelected,
                  ]}>
                    <Ionicons 
                      name={level.icon} 
                      size={24} 
                      color={editingLevel === level.id ? colors.primary : colors.textSecondary} 
                    />
                  </View>
                  <View style={styles.levelOptionInfo}>
                    <Text style={[
                      styles.levelOptionLabel,
                      editingLevel === level.id && styles.levelOptionLabelSelected,
                    ]}>
                      {level.label}
                    </Text>
                    <Text style={styles.levelOptionDescription}>
                      {level.description}
                    </Text>
                  </View>
                  {editingLevel === level.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
              onPress={handleSaveLevel}
              disabled={isSaving}
            >
              <Text style={styles.modalSaveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Goals Edit Modal */}
      <Modal
        visible={showGoalsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Goals</Text>
              <Pressable 
                style={styles.modalCloseButton}
                onPress={() => setShowGoalsModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <Text style={styles.modalSubtitle}>
              What are you working towards? Select all that apply.
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {GOALS.map((goal) => {
                const isSelected = editingGoals.includes(goal.id);
                return (
                  <Pressable
                    key={goal.id}
                    style={[
                      styles.goalOption,
                      isSelected && styles.goalOptionSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleGoal(goal.id);
                    }}
                  >
                    <View style={[
                      styles.goalIconContainer,
                      isSelected && styles.goalIconContainerSelected,
                    ]}>
                      <Ionicons 
                        name={goal.icon} 
                        size={18} 
                        color={isSelected ? colors.primary : colors.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.goalOptionLabel,
                      isSelected && styles.goalOptionLabelSelected,
                    ]}>
                      {goal.label}
                    </Text>
                    <View style={[
                      styles.goalCheckbox,
                      isSelected && styles.goalCheckboxSelected,
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={colors.background} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.selectedCount}>
                {editingGoals.length} goal{editingGoals.length !== 1 ? 's' : ''} selected
              </Text>
              <Pressable
                style={[
                  styles.modalSaveButton, 
                  (isSaving || editingGoals.length === 0) && styles.modalSaveButtonDisabled
                ]}
                onPress={handleSaveGoals}
                disabled={isSaving || editingGoals.length === 0}
              >
                <Text style={styles.modalSaveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Goals'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginTop: 4,
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
    paddingBottom: 100,
  },
  
  // User Info Card
  userInfoCard: {
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoText: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userOccupation: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userStatText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  userStatItemTappable: {
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
  userStatTextTappable: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  modalScroll: {
    paddingHorizontal: spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  modalFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  selectedCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: spacing.xl,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  
  // Level Option Styles
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  levelOptionSelected: {
    borderColor: 'rgba(0, 255, 148, 0.4)',
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
  },
  levelOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelOptionIconSelected: {
    backgroundColor: 'rgba(0, 255, 148, 0.15)',
  },
  levelOptionInfo: {
    flex: 1,
  },
  levelOptionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  levelOptionLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  levelOptionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  
  // Goal Option Styles
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  goalOptionSelected: {
    borderColor: 'rgba(0, 255, 148, 0.4)',
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
  },
  goalOptionLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  goalOptionLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  goalCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  goalCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconContainerSelected: {
    backgroundColor: 'rgba(0, 255, 148, 0.15)',
  },
  
  rankSection: {
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankDetails: {
    flex: 1,
  },
  rankName: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  xpValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  xpLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  nextRankInfo: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextRankTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  nextRankText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  xpNeeded: {
    color: colors.primary,
    fontWeight: '700',
  },
  nextRankName: {
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  allRanksSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  ranksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs / 2,
  },
  rankCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 2) / 3,
    marginHorizontal: spacing.xs / 2,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rankCardLocked: {
    opacity: 0.35,
    backgroundColor: 'transparent',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    zIndex: 10,
  },
  rankCardName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockedText: {
    color: colors.textMuted,
  },
  rankCardXP: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statsSection: {
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2 - spacing.sm,
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statIconContainer: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  
  // Additional Stats Row
  additionalStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  additionalStatCard: {
    flex: 1,
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  additionalStatIconContainer: {
    marginBottom: spacing.xs,
  },
  additionalStatValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  additionalStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Max Streak Card
  maxStreakCard: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  maxStreakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  maxStreakIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  maxStreakTextContainer: {
    flex: 1,
  },
  maxStreakLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  maxStreakValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '900',
    color: '#FF6B00',
    lineHeight: typography.fontSize['3xl'] * 1.1,
  },
  maxStreakSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  
  topicsSection: {
    marginBottom: spacing.lg,
  },
  topicItem: {
    marginBottom: spacing.md,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  topicName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topicStats: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  topicPercentage: {
    color: colors.textMuted,
  },
  topicBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  topicBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
