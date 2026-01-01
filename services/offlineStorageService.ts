import AsyncStorage from '@react-native-async-storage/async-storage';
import { debug, debugSuccess, debugError, debugWarn } from '@/utils/debug';
import { Question } from '@/data/questions';
import { hasActiveEntitlement } from './revenueCatService';

const OFFLINE_STORAGE_PREFIX = '@flashbits_offline:';
const OFFLINE_QUESTIONS_KEY = `${OFFLINE_STORAGE_PREFIX}questions`;
const OFFLINE_METADATA_KEY = `${OFFLINE_STORAGE_PREFIX}metadata`;
const OFFLINE_MODE_ENABLED_KEY = `${OFFLINE_STORAGE_PREFIX}mode_enabled`;

// Configuration
const MAX_OFFLINE_QUESTIONS = 2000; // Limit to prevent storage bloat
const OFFLINE_STORAGE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days - questions expire after a week

interface OfflineMetadata {
  lastUpdated: number;
  totalQuestions: number;
  version: string;
}

/**
 * Save questions for offline use
 * Automatically limits to MAX_OFFLINE_QUESTIONS to prevent storage bloat
 * Only available for Pro subscribers.
 */
export const saveQuestionsForOffline = async (questions: Question[]): Promise<void> => {
  try {
    // Check if user has pro subscription
    const isPro = await hasActiveEntitlement();
    if (!isPro) {
      debugWarn('offline', 'Saving offline questions is only available for Pro subscribers');
      return;
    }

    if (questions.length === 0) {
      debugWarn('offline', 'No questions to save for offline');
      return;
    }

    // Limit to prevent storage bloat
    const questionsToSave = questions.slice(0, MAX_OFFLINE_QUESTIONS);
    
    if (questions.length > MAX_OFFLINE_QUESTIONS) {
      debugWarn('offline', `Limiting offline storage to ${MAX_OFFLINE_QUESTIONS} questions (requested: ${questions.length})`);
    }

    // Save questions
    await AsyncStorage.setItem(OFFLINE_QUESTIONS_KEY, JSON.stringify(questionsToSave));
    
    // Save metadata
    const metadata: OfflineMetadata = {
      lastUpdated: Date.now(),
      totalQuestions: questionsToSave.length,
      version: '1.0.0',
    };
    await AsyncStorage.setItem(OFFLINE_METADATA_KEY, JSON.stringify(metadata));

    const dataSize = JSON.stringify(questionsToSave).length;
    debugSuccess('offline', `Saved ${questionsToSave.length} questions for offline use (${Math.round(dataSize / 1024)}KB)`);
  } catch (error) {
    debugError('offline', 'Error saving questions for offline:', error);
    throw error;
  }
};

/**
 * Load questions from offline storage
 * Returns empty array if storage is expired or invalid
 * Note: This function clears expired questions but doesn't trigger redownload.
 * Redownload is handled by the questions service when it detects expiration.
 * Only available for Pro subscribers.
 */
export const loadOfflineQuestions = async (): Promise<Question[]> => {
  try {
    // Check if user has pro subscription
    const isPro = await hasActiveEntitlement();
    if (!isPro) {
      debug('offline', 'Offline questions are only available for Pro subscribers');
      return [];
    }

    const data = await AsyncStorage.getItem(OFFLINE_QUESTIONS_KEY);
    if (!data) {
      debug('offline', 'No offline questions found');
      return [];
    }

    // Check metadata for expiration
    const metadata = await getOfflineMetadata();
    if (metadata) {
      const age = Date.now() - metadata.lastUpdated;
      if (age > OFFLINE_STORAGE_TTL) {
        debugWarn('offline', `Offline questions expired (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`);
        // Don't clear here - let the questions service handle redownload first
        // If redownload fails, it will be cleared
        return [];
      }
    }

    const questions: Question[] = JSON.parse(data);
    debugSuccess('offline', `Loaded ${questions.length} questions from offline storage`);
    return questions;
  } catch (error) {
    debugError('offline', 'Error loading offline questions:', error);
    return [];
  }
};

/**
 * Get offline storage metadata
 */
export const getOfflineMetadata = async (): Promise<OfflineMetadata | null> => {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_METADATA_KEY);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as OfflineMetadata;
  } catch (error) {
    debugError('offline', 'Error loading offline metadata:', error);
    return null;
  }
};

/**
 * Check if offline questions are available and not expired
 */
export const hasOfflineQuestions = async (): Promise<boolean> => {
  try {
    const metadata = await getOfflineMetadata();
    if (!metadata) return false;
    
    // Check if expired
    const age = Date.now() - metadata.lastUpdated;
    if (age > OFFLINE_STORAGE_TTL) {
      return false; // Expired
    }
    
    const questions = await loadOfflineQuestions();
    return questions.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Get count of offline questions
 */
export const getOfflineQuestionsCount = async (): Promise<number> => {
  try {
    const questions = await loadOfflineQuestions();
    return questions.length;
  } catch (error) {
    return 0;
  }
};

/**
 * Clear offline questions storage
 */
export const clearOfflineQuestions = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUESTIONS_KEY);
    await AsyncStorage.removeItem(OFFLINE_METADATA_KEY);
    await AsyncStorage.removeItem(OFFLINE_MODE_ENABLED_KEY);
    debugSuccess('offline', 'Cleared offline questions storage');
  } catch (error) {
    debugError('offline', 'Error clearing offline questions:', error);
    throw error;
  }
};

/**
 * Add questions to existing offline storage (merge)
 * Respects MAX_OFFLINE_QUESTIONS limit
 * Only available for Pro subscribers.
 */
export const addQuestionsToOffline = async (newQuestions: Question[]): Promise<void> => {
  try {
    // Check if user has pro subscription
    const isPro = await hasActiveEntitlement();
    if (!isPro) {
      debugWarn('offline', 'Adding offline questions is only available for Pro subscribers');
      return;
    }

    const existingQuestions = await loadOfflineQuestions();
    
    // Create a map of existing question IDs to avoid duplicates
    const existingIds = new Set(existingQuestions.map(q => q.id));
    
    // Filter out duplicates
    const uniqueNewQuestions = newQuestions.filter(q => !existingIds.has(q.id));
    
    if (uniqueNewQuestions.length === 0) {
      debug('offline', 'All questions already exist in offline storage');
      return;
    }

    // Merge questions
    let mergedQuestions = [...existingQuestions, ...uniqueNewQuestions];
    
    // Limit to MAX_OFFLINE_QUESTIONS (keep most recent)
    if (mergedQuestions.length > MAX_OFFLINE_QUESTIONS) {
      mergedQuestions = mergedQuestions.slice(-MAX_OFFLINE_QUESTIONS);
      debugWarn('offline', `Offline storage limit reached. Keeping most recent ${MAX_OFFLINE_QUESTIONS} questions.`);
    }
    
    // Save merged questions
    await saveQuestionsForOffline(mergedQuestions);
    
    debugSuccess('offline', `Added ${uniqueNewQuestions.length} new questions to offline storage (total: ${mergedQuestions.length})`);
  } catch (error) {
    debugError('offline', 'Error adding questions to offline storage:', error);
    throw error;
  }
};

/**
 * Filter offline questions by criteria
 * Only available for Pro subscribers.
 */
export const filterOfflineQuestions = async (
  topics?: string[],
  difficulties?: string[],
  category?: string
): Promise<Question[]> => {
  try {
    // loadOfflineQuestions already checks for pro, so we can just call it
    const questions = await loadOfflineQuestions();
    
    let filtered = questions;
    
    if (topics && topics.length > 0) {
      filtered = filtered.filter(q => topics.includes(q.topic));
    }
    
    if (difficulties && difficulties.length > 0) {
      filtered = filtered.filter(q => difficulties.includes(q.difficulty));
    }
    
    if (category && category !== 'all') {
      filtered = filtered.filter(q => (q.category || 'general') === category);
    }
    
    return filtered;
  } catch (error) {
    debugError('offline', 'Error filtering offline questions:', error);
    return [];
  }
};

/**
 * Get storage size information
 */
export const getOfflineStorageInfo = async (): Promise<{
  questionCount: number;
  storageSize: number;
  lastUpdated: number | null;
  isExpired: boolean;
}> => {
  try {
    const metadata = await getOfflineMetadata();
    
    // Check expiration first
    const isExpired = metadata 
      ? (Date.now() - metadata.lastUpdated) > OFFLINE_STORAGE_TTL
      : false;
    
    // If expired, return metadata but mark as expired
    if (isExpired && metadata) {
      // Try to get actual data size even if expired
      const data = await AsyncStorage.getItem(OFFLINE_QUESTIONS_KEY);
      const storageSize = data ? data.length : 0;
      
      return {
        questionCount: metadata.totalQuestions, // Use stored count even if expired
        storageSize,
        lastUpdated: metadata.lastUpdated,
        isExpired: true,
      };
    }
    
    // Not expired, load questions normally
    const questions = await loadOfflineQuestions();
    const data = JSON.stringify(questions);
    const storageSize = data.length; // Size in bytes
    
    return {
      questionCount: questions.length,
      storageSize,
      lastUpdated: metadata?.lastUpdated || null,
      isExpired: false,
    };
  } catch (error) {
    debugError('offline', 'Error getting offline storage info:', error);
    return {
      questionCount: 0,
      storageSize: 0,
      lastUpdated: null,
      isExpired: true,
    };
  }
};

/**
 * Save offline mode enabled state
 */
export const setOfflineModeEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(OFFLINE_MODE_ENABLED_KEY, JSON.stringify(enabled));
  } catch (error) {
    debugError('offline', 'Error saving offline mode state:', error);
  }
};

/**
 * Get offline mode enabled state
 */
export const getOfflineModeEnabled = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_MODE_ENABLED_KEY);
    if (!data) {
      return false;
    }
    return JSON.parse(data) as boolean;
  } catch (error) {
    debugError('offline', 'Error loading offline mode state:', error);
    return false;
  }
};
