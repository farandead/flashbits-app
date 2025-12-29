import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { topicColors as TOPIC_COLORS } from '@/data/questions';
import { debug, debugError, debugSuccess } from '@/utils/debug';
import * as Network from 'expo-network';
import { queueCorrectAnswer, queueWrongAnswer, queueSkippedQuestion, queueMaxStreak, queueMilestoneXP } from './statsQueueService';

// Topic stats interface
export interface TopicStats {
  total: number;
  correct: number;
}

// User stats interface
export interface UserStats {
  totalQuestions: number; // Total unique questions attempted
  correctAnswers: number; // Total number of correct attempts (includes re-attempts)
  wrongAnswers: number; // Total number of wrong attempts (includes re-attempts)
  skippedQuestions: number; // Total number of questions skipped
  xp: number; // XP = unique questions answered correctly (first time only, never decreases)
  maxStreak: number; // Best streak ever achieved (highest consecutive correct answers)
  answeredQuestionIds: string[]; // Track which questions have been answered
  correctQuestionIds: string[]; // Track which questions were answered correctly (permanent, never removed)
  wrongQuestionIds: string[]; // Track which questions were answered incorrectly (at least once)
  skippedQuestionIds: string[]; // Track which questions were skipped (removed once answered)
  topicsProgress: Record<string, TopicStats>;
  difficultyProgress: Record<string, { total: number; correct: number }>;
  lastActiveAt: string;
  createdAt: string;
}

// Default stats for new users
const DEFAULT_STATS: UserStats = {
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  skippedQuestions: 0,
  xp: 0,
  maxStreak: 0,
  answeredQuestionIds: [],
  correctQuestionIds: [],
  wrongQuestionIds: [],
  skippedQuestionIds: [],
  topicsProgress: {},
  difficultyProgress: {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  },
  lastActiveAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

/**
 * Get user stats from Firestore
 */
export const getUserStats = async (userId: string): Promise<UserStats> => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return statsSnap.data() as UserStats;
    }
    
    // Return default stats if none exist
    return { ...DEFAULT_STATS };
  } catch (error) {
    debugError('stats', 'Error getting user stats:', error);
    return { ...DEFAULT_STATS };
  }
};

/**
 * Initialize stats for a new user
 */
export const initializeUserStats = async (userId: string): Promise<void> => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
      debugSuccess('stats', 'User stats initialized');
    }
  } catch (error) {
    debugError('stats', 'Error initializing user stats:', error);
  }
};

/**
 * Calculate streak multiplier based on streak length
 * Progressive system: longer streaks = more XP per question
 */
const calculateStreakMultiplier = (streak: number): number => {
  if (streak < 3) return 0; // No streak bonus until streak is active
  if (streak < 5) return 1; // Streak 3-4: +1 bonus
  if (streak < 10) return 2; // Streak 5-9: +2 bonus
  if (streak < 20) return 3; // Streak 10-19: +3 bonus
  if (streak < 30) return 4; // Streak 20-29: +4 bonus
  if (streak < 50) return 5; // Streak 30-49: +5 bonus
  if (streak < 100) return 6; // Streak 50-99: +6 bonus
  return 7; // Streak 100+: +7 bonus (max)
};

/**
 * Calculate XP bonuses
 * Base: +1 for solving a question
 * Streak multiplier: Progressive bonus based on streak length (0-7)
 * Difficulty multiplier: Easy=+1, Medium=+1, Hard=+2, Cracked=+3
 */
const calculateXP = (
  difficulty: string,
  streak: number
): { base: number; streakBonus: number; difficultyBonus: number; total: number } => {
  const base = 1;
  
  // Progressive streak bonus based on streak length
  const streakBonus = calculateStreakMultiplier(streak);
  
  // Difficulty multipliers
  const difficultyMultipliers: Record<string, number> = {
    easy: 1,
    medium: 1,
    hard: 2,
    cracked: 3, // Elite-level mastery - highest reward
  };
  const difficultyBonus = difficultyMultipliers[difficulty.toLowerCase()] || 1;
  
  const total = base + streakBonus + difficultyBonus;
  
  return { base, streakBonus, difficultyBonus, total };
};

/**
 * Check if device is online
 */
const checkIsOnline = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return (networkState.isConnected && networkState.isInternetReachable === true) ?? false;
  } catch {
    return false;
  }
};

/**
 * Record a correct answer
 * Returns the XP earned (base + bonuses) and streak multiplier
 */
export const recordCorrectAnswer = async (
  userId: string, 
  questionId: string,
  topic: string, 
  difficulty: string,
  streak: number = 0
): Promise<{ xp: number; streakMultiplier: number }> => {
  // Calculate XP first (needed for both online and offline)
  const xpCalculation = calculateXP(difficulty, streak);
  const xpEarned = xpCalculation.total;

  // Check if online
  const online = await checkIsOnline();
  
  if (!online) {
    // Queue for later sync
    await queueCorrectAnswer(questionId, topic as any, difficulty as any, streak, xpEarned);
    debug('stats', 'Offline - queued correct answer:', questionId);
    return { xp: xpEarned, streakMultiplier: xpCalculation.streakBonus };
  }

  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize with first correct answer
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        totalQuestions: 1,
        correctAnswers: 1,
        xp: xpEarned,
        answeredQuestionIds: [questionId],
        correctQuestionIds: [questionId],
        topicsProgress: {
          [topic]: { total: 1, correct: 1 },
        },
        difficultyProgress: {
          ...DEFAULT_STATS.difficultyProgress,
          [difficulty]: { total: 1, correct: 1 },
        },
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      
      debugSuccess('stats', 'Correct answer recorded for question:', questionId, 'XP earned:', xpEarned);
      return { xp: xpEarned, streakMultiplier: xpCalculation.streakBonus };
    } else {
      const currentStats = statsSnap.data() as UserStats;
      const currentTopicStats = currentStats.topicsProgress[topic] || { total: 0, correct: 0 };
      const currentDiffStats = currentStats.difficultyProgress[difficulty] || { total: 0, correct: 0 };
      
      // Check if question was already answered
      const isNewQuestion = !currentStats.answeredQuestionIds?.includes(questionId);
      const wasCorrectBefore = currentStats.correctQuestionIds?.includes(questionId);
      const wasWrong = currentStats.wrongQuestionIds?.includes(questionId);
      const wasSkipped = currentStats.skippedQuestionIds?.includes(questionId);
      
      // Only increment XP if this is the first time answering correctly
      const isFirstCorrect = !wasCorrectBefore;
      
      // Use pre-calculated XP (already calculated before online check)
      const finalXpEarned = isFirstCorrect ? xpEarned : 0;
      
      // Build update object
      const updateData: any = {
        totalQuestions: isNewQuestion ? increment(1) : increment(0),
        correctAnswers: increment(1), // Always increment - count every correct attempt
        xp: isFirstCorrect ? increment(finalXpEarned) : increment(0), // XP with bonuses only for first correct
        answeredQuestionIds: arrayUnion(questionId),
        correctQuestionIds: arrayUnion(questionId),
        [`topicsProgress.${topic}`]: {
          total: isNewQuestion ? currentTopicStats.total + 1 : currentTopicStats.total,
          correct: isFirstCorrect ? currentTopicStats.correct + 1 : currentTopicStats.correct,
        },
        [`difficultyProgress.${difficulty}`]: {
          total: isNewQuestion ? currentDiffStats.total + 1 : currentDiffStats.total,
          correct: isFirstCorrect ? currentDiffStats.correct + 1 : currentDiffStats.correct,
        },
        lastActiveAt: new Date().toISOString(),
      };

      // Remove from wrong/skipped if it was there (but don't decrement counts)
      if (wasWrong) {
        updateData.wrongQuestionIds = arrayRemove(questionId);
      }
      if (wasSkipped) {
        updateData.skippedQuestionIds = arrayRemove(questionId);
        updateData.skippedQuestions = increment(-1); // Still decrement skipped count
      }
      
      await updateDoc(statsRef, updateData);
      
      // Return XP earned and streak multiplier (0 if not first correct)
      return isFirstCorrect 
        ? { xp: finalXpEarned, streakMultiplier: xpCalculation.streakBonus }
        : { xp: 0, streakMultiplier: 0 };
    }
  } catch (error) {
    debugError('stats', 'Error recording correct answer:', error);
    // If error, queue it for retry
    await queueCorrectAnswer(questionId, topic as any, difficulty as any, streak, xpEarned);
    return { xp: xpEarned, streakMultiplier: xpCalculation.streakBonus };
  }
};

/**
 * Record a wrong answer
 */
export const recordWrongAnswer = async (
  userId: string, 
  questionId: string,
  topic: string, 
  difficulty: string
): Promise<void> => {
  // Check if online
  const online = await checkIsOnline();
  
  if (!online) {
    // Queue for later sync
    await queueWrongAnswer(questionId, topic as any, difficulty as any);
    debug('stats', 'Offline - queued wrong answer:', questionId);
    return;
  }

  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize with first wrong answer
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        totalQuestions: 1,
        wrongAnswers: 1,
        answeredQuestionIds: [questionId],
        wrongQuestionIds: [questionId],
        topicsProgress: {
          [topic]: { total: 1, correct: 0 },
        },
        difficultyProgress: {
          ...DEFAULT_STATS.difficultyProgress,
          [difficulty]: { total: 1, correct: 0 },
        },
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } else {
      const currentStats = statsSnap.data() as UserStats;
      const currentTopicStats = currentStats.topicsProgress[topic] || { total: 0, correct: 0 };
      const currentDiffStats = currentStats.difficultyProgress[difficulty] || { total: 0, correct: 0 };
      
      // Check if question was already answered
      const isNewQuestion = !currentStats.answeredQuestionIds?.includes(questionId);
      const wasCorrect = currentStats.correctQuestionIds?.includes(questionId);
      const wasSkipped = currentStats.skippedQuestionIds?.includes(questionId);
      
      // Build update object
      const updateData: any = {
        totalQuestions: isNewQuestion ? increment(1) : increment(0),
        wrongAnswers: increment(1), // Always increment - count every wrong attempt
        answeredQuestionIds: arrayUnion(questionId),
        wrongQuestionIds: arrayUnion(questionId),
        [`topicsProgress.${topic}`]: {
          total: isNewQuestion ? currentTopicStats.total + 1 : currentTopicStats.total,
          correct: currentTopicStats.correct,
        },
        [`difficultyProgress.${difficulty}`]: {
          total: isNewQuestion ? currentDiffStats.total + 1 : currentDiffStats.total,
          correct: currentDiffStats.correct,
        },
        lastActiveAt: new Date().toISOString(),
      };

      // Remove from skipped if it was there
      // Once a question is solved correctly, it stays in correctQuestionIds forever
      // This ensures "Previously Solved" status is permanent
      if (wasSkipped) {
        updateData.skippedQuestionIds = arrayRemove(questionId);
        updateData.skippedQuestions = increment(-1); // Decrement skipped count when answered
      }
      
      await updateDoc(statsRef, updateData);
    }
    debugSuccess('stats', 'Wrong answer recorded for question:', questionId);
  } catch (error) {
    debugError('stats', 'Error recording wrong answer:', error);
    // If error, queue it for retry
    await queueWrongAnswer(questionId, topic as any, difficulty as any);
  }
};

/**
 * Record a skipped question
 */
export const recordSkippedQuestion = async (
  userId: string,
  questionId: string
): Promise<void> => {
  // Check if online
  const online = await checkIsOnline();
  
  if (!online) {
    // Queue for later sync
    await queueSkippedQuestion(questionId);
    debug('stats', 'Offline - queued skipped question:', questionId);
    return;
  }

  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        skippedQuestions: 1,
        skippedQuestionIds: [questionId],
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } else {
      const currentStats = statsSnap.data() as UserStats;
      const wasSkippedBefore = currentStats.skippedQuestionIds?.includes(questionId);
      
      // Only increment if this is the first time skipping
      const isFirstSkip = !wasSkippedBefore;
      
      await updateDoc(statsRef, {
        skippedQuestions: isFirstSkip ? increment(1) : increment(0),
        skippedQuestionIds: arrayUnion(questionId),
        lastActiveAt: new Date().toISOString(),
      });
    }
    debugSuccess('stats', 'Skipped question recorded for question:', questionId);
  } catch (error) {
    debugError('stats', 'Error recording skipped question:', error);
    // If error, queue it for retry
    await queueSkippedQuestion(questionId);
  }
};

/**
 * Check if a question has been answered by the user
 */
export const hasAnsweredQuestion = async (
  userId: string,
  questionId: string
): Promise<boolean> => {
  try {
    const stats = await getUserStats(userId);
    return stats.answeredQuestionIds?.includes(questionId) || false;
  } catch (error) {
    debugError('stats', 'Error checking if question answered:', error);
    return false;
  }
};

/**
 * Check if a question was answered correctly by the user
 */
export const hasAnsweredCorrectly = async (
  userId: string,
  questionId: string
): Promise<boolean> => {
  try {
    const stats = await getUserStats(userId);
    return stats.correctQuestionIds?.includes(questionId) || false;
  } catch (error) {
    debugError('stats', 'Error checking if question answered correctly:', error);
    return false;
  }
};

/**
 * Get list of answered question IDs for a user
 */
export const getAnsweredQuestionIds = async (userId: string): Promise<string[]> => {
  try {
    const stats = await getUserStats(userId);
    return stats.answeredQuestionIds || [];
  } catch (error) {
    debugError('stats', 'Error getting answered question IDs:', error);
    return [];
  }
};

/**
 * Check if a question was answered wrongly by the user
 */
export const hasAnsweredWrongly = async (
  userId: string,
  questionId: string
): Promise<boolean> => {
  try {
    const stats = await getUserStats(userId);
    return stats.wrongQuestionIds?.includes(questionId) || false;
  } catch (error) {
    debugError('stats', 'Error checking if question answered wrongly:', error);
    return false;
  }
};

/**
 * Check if a question was skipped by the user
 */
export const hasSkippedQuestion = async (
  userId: string,
  questionId: string
): Promise<boolean> => {
  try {
    const stats = await getUserStats(userId);
    return stats.skippedQuestionIds?.includes(questionId) || false;
  } catch (error) {
    debugError('stats', 'Error checking if question was skipped:', error);
    return false;
  }
};

/**
 * Get formatted topic progress for display
 */
export const getFormattedTopicProgress = (stats: UserStats): Array<{
  topic: string;
  total: number;
  correct: number;
  color: string;
}> => {
  // Map topic keys to color names
  const topicColorMap: Record<string, keyof typeof TOPIC_COLORS> = {
    'Arrays': 'Arrays',
    'LinkedLists': 'LinkedLists',
    'Linked Lists': 'LinkedLists',
    'StacksQueues': 'StacksQueues',
    'Stacks & Queues': 'StacksQueues',
    'Hashing': 'Hashing',
    'Trees': 'Trees',
    'Graphs': 'Graphs',
    'Sorting': 'Sorting',
    'Sorting & Searching': 'Sorting',
    'Recursion': 'Recursion',
    'Recursion & Backtracking': 'Recursion',
    'Greedy': 'Greedy',
    'Greedy Algorithms': 'Greedy',
    'DP': 'DP',
    'Dynamic Programming': 'DP',
    'BitManipulation': 'BitManipulation',
    'Bit Manipulation': 'BitManipulation',
    'Math & Number Theory': 'Math',
    'AdvancedDS': 'AdvancedDS',
    'Advanced Data Structures': 'AdvancedDS',
    'AdvancedAlgo': 'AdvancedAlgo',
    'Advanced Algorithms': 'AdvancedAlgo',
  };

  return Object.entries(stats.topicsProgress)
    .map(([topic, data]) => ({
      topic,
      total: data.total,
      correct: data.correct,
      color: TOPIC_COLORS[topicColorMap[topic]] || TOPIC_COLORS.Arrays,
    }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);
};

/**
 * Calculate milestone XP reward based on milestone value
 * Higher milestones = more XP
 */
const calculateMilestoneXP = (milestone: number): number => {
  // Base milestone rewards
  if (milestone <= 10) return 5; // 5-10 streak: +5 XP
  if (milestone <= 25) return 10; // 15-25 streak: +10 XP
  if (milestone <= 50) return 15; // 50 streak: +15 XP
  if (milestone <= 100) return 25; // 100 streak: +25 XP
  // After 100, every 10 streak milestone: +10 XP
  return 10;
};

/**
 * Award XP for reaching a streak milestone
 */
export const awardMilestoneXP = async (
  userId: string,
  milestone: number
): Promise<number> => {
  const xpReward = calculateMilestoneXP(milestone);
  
  // Check if online
  const online = await checkIsOnline();
  
  if (!online) {
    // Queue for later sync
    await queueMilestoneXP(milestone, xpReward);
    debug('stats', 'Offline - queued milestone XP:', milestone);
    return xpReward;
  }

  try {
      const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize with milestone reward
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        xp: xpReward,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      debugSuccess('stats', 'Milestone XP awarded:', milestone, 'XP:', xpReward);
      return xpReward;
    } else {
      // Add milestone XP
      await updateDoc(statsRef, {
        xp: increment(xpReward),
        lastActiveAt: new Date().toISOString(),
      });
      debugSuccess('stats', 'Milestone XP awarded:', milestone, 'XP:', xpReward);
      return xpReward;
    }
  } catch (error) {
    debugError('stats', 'Error awarding milestone XP:', error);
    // If error, queue it for retry
    await queueMilestoneXP(milestone, xpReward);
    return xpReward;
  }
};

/**
 * Update max streak in user stats
 * Only updates if the new streak is higher than current max
 */
export const updateMaxStreak = async (
  userId: string,
  newStreak: number
): Promise<void> => {
  // Check if online
  const online = await checkIsOnline();
  
  if (!online) {
    // Queue for later sync
    await queueMaxStreak(newStreak);
    debug('stats', 'Offline - queued max streak update:', newStreak);
    return;
  }

  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize with max streak
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        maxStreak: newStreak,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      debugSuccess('stats', 'Max streak initialized:', newStreak);
    } else {
      const currentStats = statsSnap.data() as UserStats;
      const currentMaxStreak = currentStats.maxStreak || 0;
      
      // Only update if new streak is higher
      if (newStreak > currentMaxStreak) {
        await updateDoc(statsRef, {
          maxStreak: newStreak,
          lastActiveAt: new Date().toISOString(),
        });
        debugSuccess('stats', 'Max streak updated:', currentMaxStreak, '->', newStreak);
      }
    }
  } catch (error) {
    debugError('stats', 'Error updating max streak:', error);
    // If error, queue it for retry
    await queueMaxStreak(newStreak);
  }
};

