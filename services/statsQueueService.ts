import AsyncStorage from '@react-native-async-storage/async-storage';
import { debug, debugSuccess, debugError, debugWarn } from '@/utils/debug';
import { Question, Topic, Difficulty } from '@/data/questions';

const STATS_QUEUE_KEY = '@flashbits_stats_queue';
const LOCAL_STATS_KEY = '@flashbits_local_stats';

interface QueuedCorrectAnswer {
  type: 'correct';
  questionId: string;
  topic: Topic;
  difficulty: Difficulty;
  streak: number;
  timestamp: number;
}

interface QueuedWrongAnswer {
  type: 'wrong';
  questionId: string;
  topic: Topic;
  difficulty: Difficulty;
  timestamp: number;
}

interface QueuedSkippedQuestion {
  type: 'skipped';
  questionId: string;
  timestamp: number;
}

interface QueuedMaxStreak {
  type: 'maxStreak';
  maxStreak: number;
  timestamp: number;
}

interface QueuedMilestoneXP {
  type: 'milestoneXP';
  milestone: number;
  timestamp: number;
}

type QueuedStat = QueuedCorrectAnswer | QueuedWrongAnswer | QueuedSkippedQuestion | QueuedMaxStreak | QueuedMilestoneXP;

interface LocalStats {
  xp: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  answeredQuestionIds: string[];
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  skippedQuestionIds: string[];
  topicsProgress: Record<string, { total: number; correct: number }>;
  difficultyProgress: Record<string, { total: number; correct: number }>;
  maxStreak: number;
  lastSyncedAt: number | null;
}

/**
 * Get local stats (for offline XP display)
 */
export const getLocalStats = async (): Promise<LocalStats | null> => {
  try {
    const data = await AsyncStorage.getItem(LOCAL_STATS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    debugError('statsQueue', 'Error getting local stats:', error);
    return null;
  }
};

/**
 * Update local stats (for immediate UI updates)
 */
export const updateLocalStats = async (updates: Partial<LocalStats>): Promise<void> => {
  try {
    const current = await getLocalStats();
    const updated: LocalStats = {
      xp: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      skippedQuestions: 0,
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
      maxStreak: 0,
      lastSyncedAt: null,
      ...current,
      ...updates,
    };
    await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(updated));
  } catch (error) {
    debugError('statsQueue', 'Error updating local stats:', error);
  }
};

/**
 * Queue a correct answer for later sync
 */
export const queueCorrectAnswer = async (
  questionId: string,
  topic: Topic,
  difficulty: Difficulty,
  streak: number,
  xpEarned: number
): Promise<void> => {
  try {
    // Add to queue
    const queue = await getQueue();
    queue.push({
      type: 'correct',
      questionId,
      topic,
      difficulty,
      streak,
      timestamp: Date.now(),
    });
    await saveQueue(queue);

    // Update local stats immediately for UI
    const localStats = await getLocalStats();
    const updatedStats: Partial<LocalStats> = {
      xp: (localStats?.xp || 0) + xpEarned,
      correctAnswers: (localStats?.correctAnswers || 0) + 1,
      answeredQuestionIds: [...(localStats?.answeredQuestionIds || []), questionId].filter((id, index, arr) => arr.indexOf(id) === index),
      correctQuestionIds: [...(localStats?.correctQuestionIds || []), questionId].filter((id, index, arr) => arr.indexOf(id) === index),
    };

    // Update topic progress
    if (!updatedStats.topicsProgress) {
      updatedStats.topicsProgress = { ...localStats?.topicsProgress };
    }
    const topicKey = topic;
    if (!updatedStats.topicsProgress[topicKey]) {
      updatedStats.topicsProgress[topicKey] = { total: 0, correct: 0 };
    }
    updatedStats.topicsProgress[topicKey].total += 1;
    updatedStats.topicsProgress[topicKey].correct += 1;

    // Update difficulty progress
    if (!updatedStats.difficultyProgress) {
      updatedStats.difficultyProgress = { ...localStats?.difficultyProgress };
    }
    if (!updatedStats.difficultyProgress[difficulty]) {
      updatedStats.difficultyProgress[difficulty] = { total: 0, correct: 0 };
    }
    updatedStats.difficultyProgress[difficulty].total += 1;
    updatedStats.difficultyProgress[difficulty].correct += 1;

    await updateLocalStats(updatedStats);
    debug('statsQueue', 'Queued correct answer:', questionId);
  } catch (error) {
    debugError('statsQueue', 'Error queueing correct answer:', error);
  }
};

/**
 * Queue a wrong answer for later sync
 */
export const queueWrongAnswer = async (
  questionId: string,
  topic: Topic,
  difficulty: Difficulty
): Promise<void> => {
  try {
    const queue = await getQueue();
    queue.push({
      type: 'wrong',
      questionId,
      topic,
      difficulty,
      timestamp: Date.now(),
    });
    await saveQueue(queue);

    // Update local stats
    const localStats = await getLocalStats();
    await updateLocalStats({
      wrongAnswers: (localStats?.wrongAnswers || 0) + 1,
      answeredQuestionIds: [...(localStats?.answeredQuestionIds || []), questionId].filter((id, index, arr) => arr.indexOf(id) === index),
      wrongQuestionIds: [...(localStats?.wrongQuestionIds || []), questionId].filter((id, index, arr) => arr.indexOf(id) === index),
    });
    debug('statsQueue', 'Queued wrong answer:', questionId);
  } catch (error) {
    debugError('statsQueue', 'Error queueing wrong answer:', error);
  }
};

/**
 * Queue a skipped question for later sync
 */
export const queueSkippedQuestion = async (questionId: string): Promise<void> => {
  try {
    const queue = await getQueue();
    queue.push({
      type: 'skipped',
      questionId,
      timestamp: Date.now(),
    });
    await saveQueue(queue);
    debug('statsQueue', 'Queued skipped question:', questionId);
  } catch (error) {
    debugError('statsQueue', 'Error queueing skipped question:', error);
  }
};

/**
 * Queue max streak update for later sync
 */
export const queueMaxStreak = async (maxStreak: number): Promise<void> => {
  try {
    const queue = await getQueue();
    queue.push({
      type: 'maxStreak',
      maxStreak,
      timestamp: Date.now(),
    });
    await saveQueue(queue);

    // Update local stats
    const localStats = await getLocalStats();
    if (!localStats || maxStreak > (localStats.maxStreak || 0)) {
      await updateLocalStats({ maxStreak });
    }
    debug('statsQueue', 'Queued max streak update:', maxStreak);
  } catch (error) {
    debugError('statsQueue', 'Error queueing max streak:', error);
  }
};

/**
 * Queue milestone XP for later sync
 */
export const queueMilestoneXP = async (milestone: number, xpReward: number): Promise<void> => {
  try {
    const queue = await getQueue();
    queue.push({
      type: 'milestoneXP',
      milestone,
      timestamp: Date.now(),
    });
    await saveQueue(queue);

    // Update local stats
    const localStats = await getLocalStats();
    await updateLocalStats({
      xp: (localStats?.xp || 0) + xpReward,
    });
    debug('statsQueue', 'Queued milestone XP:', milestone, 'XP:', xpReward);
  } catch (error) {
    debugError('statsQueue', 'Error queueing milestone XP:', error);
  }
};

/**
 * Get the queue
 */
const getQueue = async (): Promise<QueuedStat[]> => {
  try {
    const data = await AsyncStorage.getItem(STATS_QUEUE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    debugError('statsQueue', 'Error getting queue:', error);
    return [];
  }
};

/**
 * Save the queue
 */
const saveQueue = async (queue: QueuedStat[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STATS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    debugError('statsQueue', 'Error saving queue:', error);
  }
};

/**
 * Process the queue and sync to Firestore
 * Returns the number of items processed
 */
export const processStatsQueue = async (userId: string): Promise<{ processed: number; errors: number }> => {
  const queue = await getQueue();
  if (queue.length === 0) {
    return { processed: 0, errors: 0 };
  }

  debug('statsQueue', `Processing ${queue.length} queued stats updates...`);

  const { recordCorrectAnswer, recordWrongAnswer, recordSkippedQuestion, updateMaxStreak, awardMilestoneXP } = await import('@/services/statsService');
  
  let processed = 0;
  let errors = 0;
  const remainingQueue: QueuedStat[] = [];

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'correct':
          await recordCorrectAnswer(userId, item.questionId, item.topic, item.difficulty, item.streak);
          processed++;
          break;
        case 'wrong':
          await recordWrongAnswer(userId, item.questionId, item.topic, item.difficulty);
          processed++;
          break;
        case 'skipped':
          await recordSkippedQuestion(userId, item.questionId);
          processed++;
          break;
        case 'maxStreak':
          await updateMaxStreak(userId, item.maxStreak);
          processed++;
          break;
        case 'milestoneXP':
          await awardMilestoneXP(userId, item.milestone);
          processed++;
          break;
      }
    } catch (error) {
      debugError('statsQueue', `Error processing queued ${item.type}:`, error);
      errors++;
      // Keep failed items in queue for retry
      remainingQueue.push(item);
    }
  }

  // Save remaining queue (failed items)
  await saveQueue(remainingQueue);

  // Update last synced timestamp
  await updateLocalStats({ lastSyncedAt: Date.now() });

  if (processed > 0) {
    debugSuccess('statsQueue', `Processed ${processed} stats updates, ${errors} errors`);
  }

  return { processed, errors };
};

/**
 * Clear the queue (after successful sync)
 */
export const clearStatsQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STATS_QUEUE_KEY);
    debug('statsQueue', 'Stats queue cleared');
  } catch (error) {
    debugError('statsQueue', 'Error clearing queue:', error);
  }
};

/**
 * Get queue size
 */
export const getQueueSize = async (): Promise<number> => {
  const queue = await getQueue();
  return queue.length;
};

