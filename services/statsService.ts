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
    console.error('Error getting user stats:', error);
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
      console.log('User stats initialized');
    }
  } catch (error) {
    console.error('Error initializing user stats:', error);
  }
};

/**
 * Record a correct answer
 */
export const recordCorrectAnswer = async (
  userId: string, 
  questionId: string,
  topic: string, 
  difficulty: string
): Promise<void> => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (!statsSnap.exists()) {
      // Initialize with first correct answer
      await setDoc(statsRef, {
        ...DEFAULT_STATS,
        totalQuestions: 1,
        correctAnswers: 1,
        xp: 1,
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
      
      // Build update object
      const updateData: any = {
        totalQuestions: isNewQuestion ? increment(1) : increment(0),
        correctAnswers: increment(1), // Always increment - count every correct attempt
        xp: isFirstCorrect ? increment(1) : increment(0), // XP only for first correct
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
    }
    console.log('Correct answer recorded for question:', questionId);
  } catch (error) {
    console.error('Error recording correct answer:', error);
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
    console.log('Wrong answer recorded for question:', questionId);
  } catch (error) {
    console.error('Error recording wrong answer:', error);
  }
};

/**
 * Record a skipped question
 */
export const recordSkippedQuestion = async (
  userId: string,
  questionId: string
): Promise<void> => {
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
    console.log('Skipped question recorded for question:', questionId);
  } catch (error) {
    console.error('Error recording skipped question:', error);
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
    console.error('Error checking if question answered:', error);
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
    console.error('Error checking if question answered correctly:', error);
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
    console.error('Error getting answered question IDs:', error);
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
    console.error('Error checking if question answered wrongly:', error);
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
    console.error('Error checking if question was skipped:', error);
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

