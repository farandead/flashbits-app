import { debug, debugSuccess, debugError, debugWarn } from '@/utils/debug';
import { auth } from '@/config/firebase';
import { getUserStats } from './statsService';
import { prefetchQuestionsForOffline } from './questionsService';
import { syncSubscriptionToFirestore } from './revenueCatService';
import { getOfflineQuestionsCount, getOfflineStorageInfo } from './offlineStorageService';
import { processStatsQueue } from './statsQueueService';

export interface SyncResult {
  success: boolean;
  synced: {
    stats: boolean;
    questions: boolean;
    subscription: boolean;
  };
  errors: string[];
  timestamp: number;
}

/**
 * Sync all user data when coming back online
 * This should be called when network status changes from offline to online
 */
export const syncAllData = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    synced: {
      stats: false,
      questions: false,
      subscription: false,
    },
    errors: [],
    timestamp: Date.now(),
  };

  const user = auth.currentUser;
  if (!user) {
    debugWarn('sync', 'No user logged in, skipping sync');
    return { ...result, success: false, errors: ['No user logged in'] };
  }

  debug('sync', 'Starting data sync for user:', user.uid);

  // 1. Process queued stats updates first
  try {
    debug('sync', 'Processing queued stats updates...');
    const queueResult = await processStatsQueue(user.uid);
    if (queueResult.processed > 0) {
      debugSuccess('sync', `Processed ${queueResult.processed} queued stats updates`);
    }
    if (queueResult.errors > 0) {
      debugWarn('sync', `${queueResult.errors} stats updates failed`);
    }
  } catch (error: any) {
    debugError('sync', 'Error processing stats queue:', error);
  }

  // 2. Sync user stats (refresh from server to get latest)
  try {
    debug('sync', 'Syncing user stats...');
    const stats = await getUserStats(user.uid);
    debugSuccess('sync', 'User stats synced:', {
      totalQuestions: stats.totalQuestions,
      xp: stats.xp,
      correctAnswers: stats.correctAnswers,
    });
    result.synced.stats = true;
  } catch (error: any) {
    const errorMsg = `Failed to sync stats: ${error?.message || 'Unknown error'}`;
    debugError('sync', errorMsg, error);
    result.errors.push(errorMsg);
    result.success = false;
  }

  // 3. Sync subscription status (RevenueCat -> Firestore)
  try {
    debug('sync', 'Syncing subscription status...');
    await syncSubscriptionToFirestore();
    debugSuccess('sync', 'Subscription status synced');
    result.synced.subscription = true;
  } catch (error: any) {
    const errorMsg = `Failed to sync subscription: ${error?.message || 'Unknown error'}`;
    debugError('sync', errorMsg, error);
    result.errors.push(errorMsg);
    // Don't mark as failed - subscription sync is non-critical
  }

  // 4. Update offline questions (if needed)
  try {
    debug('sync', 'Checking offline questions...');
    const offlineInfo = await getOfflineStorageInfo();
    const questionCount = await getOfflineQuestionsCount();
    
    // Check if offline questions need updating (older than 1 day or empty)
    const shouldUpdate = 
      !offlineInfo || 
      questionCount === 0 ||
      !offlineInfo.lastUpdated ||
      (Date.now() - offlineInfo.lastUpdated) > (24 * 60 * 60 * 1000); // 24 hours
    
    if (shouldUpdate) {
      debug('sync', 'Updating offline questions...');
      const prefetchResult = await prefetchQuestionsForOffline(500, false); // Merge with existing
      if (prefetchResult.success) {
        debugSuccess('sync', `Offline questions updated: ${prefetchResult.count} questions available`);
        result.synced.questions = true;
      } else {
        debugWarn('sync', 'Failed to update offline questions:', prefetchResult.error);
        result.errors.push(`Failed to update offline questions: ${prefetchResult.error || 'Unknown error'}`);
      }
    } else {
      debug('sync', 'Offline questions are up to date');
      result.synced.questions = true; // Already up to date
    }
  } catch (error: any) {
    const errorMsg = `Failed to sync questions: ${error?.message || 'Unknown error'}`;
    debugError('sync', errorMsg, error);
    result.errors.push(errorMsg);
    // Don't mark as failed - question sync is non-critical
  }

  if (result.success && result.errors.length === 0) {
    debugSuccess('sync', 'All data synced successfully');
  } else if (result.errors.length > 0) {
    debugWarn('sync', `Sync completed with ${result.errors.length} error(s):`, result.errors);
  }

  return result;
};

/**
 * Quick sync - only syncs critical data (stats and subscription)
 * Faster than full sync
 */
export const quickSync = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    synced: {
      stats: false,
      questions: false,
      subscription: false,
    },
    errors: [],
    timestamp: Date.now(),
  };

  const user = auth.currentUser;
  if (!user) {
    return { ...result, success: false, errors: ['No user logged in'] };
  }

  debug('sync', 'Starting quick sync...');

  // Sync stats
  try {
    await getUserStats(user.uid);
    result.synced.stats = true;
  } catch (error: any) {
    result.errors.push(`Stats sync failed: ${error?.message || 'Unknown error'}`);
    result.success = false;
  }

  // Sync subscription
  try {
    await syncSubscriptionToFirestore();
    result.synced.subscription = true;
  } catch (error: any) {
    result.errors.push(`Subscription sync failed: ${error?.message || 'Unknown error'}`);
  }

  return result;
};

/**
 * Check if sync is needed
 * Returns true if offline storage is old or missing
 */
export const isSyncNeeded = async (): Promise<boolean> => {
  try {
    const offlineInfo = await getOfflineStorageInfo();
    if (!offlineInfo) {
      return true; // No offline data, sync needed
    }

    // Check if older than 24 hours
    if (!offlineInfo.lastUpdated) {
      return true; // No timestamp, sync needed
    }
    const age = Date.now() - offlineInfo.lastUpdated;
    return age > (24 * 60 * 60 * 1000);
  } catch (error) {
    return true; // If we can't check, assume sync is needed
  }
};

