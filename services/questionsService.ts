import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Query,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Question, Topic, Difficulty, QuestionCategory } from '@/data/questions';
import { debug, debugError, debugWarn } from '@/utils/debug';
import { generateCacheKey, getCachedData, setCachedData, clearCacheByPrefix } from './cacheService';
import { 
  loadOfflineQuestions, 
  filterOfflineQuestions as filterOffline,
  saveQuestionsForOffline,
  addQuestionsToOffline,
  getOfflineQuestionsCount,
  getOfflineModeEnabled,
  getOfflineStorageInfo,
  clearOfflineQuestions,
} from './offlineStorageService';
import { hasActiveEntitlement } from './revenueCatService';

const QUESTIONS_COLLECTION = 'questions';
const DEFAULT_PAGE_SIZE = 50; // Number of questions to fetch per batch
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Convert Firestore document to Question type
const convertDocToQuestion = (doc: QueryDocumentSnapshot<DocumentData>): Question => {
  const data = doc.data();
  return {
    id: doc.id,
    topic: data.topic as Topic,
    difficulty: data.difficulty as Difficulty,
    type: data.type,
    question: data.question,
    code: data.code || undefined,
    options: data.options || undefined,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    timeLimit: data.timeLimit || undefined,
    category: (data.category as QuestionCategory) || 'general',
    problemNumber: data.problemNumber || undefined,
    problemName: data.problemName || undefined,
  };
};

// Check if a question should be shown (not hidden)
const isQuestionVisible = (doc: QueryDocumentSnapshot<DocumentData>): boolean => {
  const data = doc.data();
  return data.hidden !== true;
};

// Pagination result type
export interface PaginatedQuestionsResult {
  questions: Question[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

// Cacheable pagination result (without Firestore document references)
interface CacheablePaginatedResult {
  questions: Question[];
  lastDocId: string | null;
  hasMore: boolean;
}

// Fetch all questions with pagination (excludes hidden questions)
export const fetchAllQuestions = async (
  pageSize: number = DEFAULT_PAGE_SIZE,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedQuestionsResult> => {
  // Generate cache key based on pageSize and lastDocument ID
  const lastDocId = lastDocument?.id || 'first';
  const cacheKey = generateCacheKey('questions:all', {
    pageSize,
    lastDocId,
  });
  
  try {
    
    // Try to get from cache first (only for first page to avoid pagination complexity)
    if (!lastDocument) {
      const cached = await getCachedData<CacheablePaginatedResult>(cacheKey, CACHE_TTL);
      if (cached && cached.questions.length > 0) {
        // For cached data, we need to reconstruct lastDoc if we have lastDocId
        // Since we can't easily reconstruct QueryDocumentSnapshot, we'll return cached questions
        // but mark that we can't use it for pagination
        // This is a trade-off: we get fast first-page loads, but subsequent pages need fresh queries
        return {
          questions: cached.questions,
          lastDoc: null, // Can't reconstruct, so pagination will start fresh
          hasMore: cached.hasMore,
        };
      }
    }
    
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with pagination
    let q: Query<DocumentData> = query(
      questionsRef,
      orderBy('createdAt', 'desc'), // Order by creation date for consistent pagination
      limit(pageSize)
    );
    
    // Add cursor for pagination if provided
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If no questions in Firebase, return empty with mock data fallback handled by caller
      const result = {
        questions: [],
        lastDoc: null,
        hasMore: false,
      };
      
      // Cache empty result (only for first page)
      if (!lastDocument) {
        await setCachedData<CacheablePaginatedResult>(cacheKey, {
          questions: [],
          lastDocId: null,
          hasMore: false,
        }, CACHE_TTL);
      }
      
      return result;
    }
    
    // Filter out hidden questions
    const visibleDocs = snapshot.docs.filter(isQuestionVisible);
    const questions = visibleDocs.map(convertDocToQuestion);
    
    // Get the last visible document for pagination cursor
    const lastDoc = visibleDocs.length > 0 ? visibleDocs[visibleDocs.length - 1] : null;
    
    // Check if there are more documents (if we got a full page, there might be more)
    const hasMore = snapshot.docs.length === pageSize;
    
    // Automatically save questions to offline storage (only for first page to avoid excessive writes)
    if (!lastDocument && questions.length > 0) {
      try {
        // Save to offline storage in background (don't block the response)
        addQuestionsToOffline(questions).catch((error) => {
          debugWarn('offline', 'Failed to save questions to offline storage:', error);
        });
      } catch (error) {
        // Silently fail - offline storage is a nice-to-have, not critical
        debugWarn('offline', 'Error saving questions to offline storage:', error);
      }
    }
    
    const result = {
      questions,
      lastDoc,
      hasMore,
    };
    
    // Cache the result (only for first page to avoid complexity with pagination cursors)
    if (!lastDocument) {
      await setCachedData<CacheablePaginatedResult>(cacheKey, {
        questions,
        lastDocId: lastDoc?.id || null,
        hasMore,
      }, CACHE_TTL);
    }
    
    return result;
  } catch (error: any) {
    debugError('questions', 'Error fetching questions:', error);
    
    // Check if it's a network/offline error
    const isNetworkError = 
      error?.code === 'unavailable' ||
      error?.code === 'deadline-exceeded' ||
      error?.code === 'failed-precondition' ||
      error?.code === 'internal' ||
      error?.message?.includes('network') ||
      error?.message?.includes('offline') ||
      error?.message?.includes('Failed to get document') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('connection') ||
      error?.message?.includes('timeout');
    
    // If offline, try to use offline storage or cache
    // For pagination, we can still try offline storage but won't have proper pagination
    if (isNetworkError) {
      // First try cache (even if expired)
      const cached = await getCachedData<CacheablePaginatedResult>(cacheKey, Infinity);
      if (cached && cached.questions.length > 0) {
        debug('cache', 'Using cached questions due to network error');
        return {
          questions: cached.questions,
          lastDoc: null,
          hasMore: cached.hasMore,
        };
      }
      
      // Then try offline storage
      const offlineQuestions = await loadOfflineQuestions();
      if (offlineQuestions.length > 0) {
        // For pagination, if we have a lastDocument, we can't properly paginate offline questions
        // So we'll return all offline questions if it's the first page, or empty if paginating
        if (lastDocument) {
          // Can't paginate offline questions properly, return empty to indicate no more
          debug('offline', 'Cannot paginate offline questions, returning empty');
          return {
            questions: [],
            lastDoc: null,
            hasMore: false,
          };
        }
        
        // Return first page of offline questions
        const paginatedQuestions = offlineQuestions.slice(0, pageSize);
        debug('offline', `Using ${paginatedQuestions.length} questions from offline storage (${offlineQuestions.length} total available)`);
        return {
          questions: paginatedQuestions,
          lastDoc: null,
          hasMore: offlineQuestions.length > pageSize,
        };
      }
    }
    
    // Return empty result on error - caller should handle fallback
    return {
      questions: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};

// Legacy function for backward compatibility - fetches all questions at once
// WARNING: This loads all questions into memory. Use paginated version for better performance.
export const fetchAllQuestionsLegacy = async (): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      if (__DEV__) {
        debug('questions', 'No questions in Firebase');
      }
      // Try offline storage as fallback
      const offlineQuestions = await loadOfflineQuestions();
      return offlineQuestions;
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    debugError('questions', 'Error fetching questions:', error);
    // Try offline storage as fallback
    const offlineQuestions = await loadOfflineQuestions();
    return offlineQuestions;
  }
};

// Fetch questions by topic (excludes hidden questions)
export const fetchQuestionsByTopic = async (topic: Topic): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const q = query(questionsRef, where('topic', '==', topic));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Try offline storage as fallback
      const offlineQuestions = await filterOffline([topic], undefined, undefined);
      return offlineQuestions;
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    debugError('questions', 'Error fetching questions by topic:', error);
    // Try offline storage as fallback
    const offlineQuestions = await filterOffline([topic], undefined, undefined);
    return offlineQuestions;
  }
};

// Fetch questions by difficulty (excludes hidden questions)
export const fetchQuestionsByDifficulty = async (difficulty: Difficulty): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const q = query(questionsRef, where('difficulty', '==', difficulty));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Try offline storage as fallback
      const offlineQuestions = await filterOffline(undefined, [difficulty], undefined);
      return offlineQuestions;
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    debugError('questions', 'Error fetching questions by difficulty:', error);
    // Try offline storage as fallback
    const offlineQuestions = await filterOffline(undefined, [difficulty], undefined);
    return offlineQuestions;
  }
};

// Fetch questions with filters using Firestore server-side filtering
export const fetchQuestionsWithFilters = async (
  topics?: Topic[],
  difficulties?: Difficulty[],
  category?: QuestionCategory | 'all'
): Promise<Question[]> => {
  // Generate cache key based on filters
  const cacheKey = generateCacheKey('questions:filters', {
    topics: topics?.sort().join(','),
    difficulties: difficulties?.sort().join(','),
    category,
  });
  
  try {
    
    // Try to get from cache first
    const cached = await getCachedData<Question[]>(cacheKey, CACHE_TTL);
    if (cached) {
      return cached;
    }
    
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with Firestore where clauses for server-side filtering
    let q: Query<DocumentData> = query(questionsRef);
    
    // Apply filters using Firestore where clauses
    // Note: Firestore 'in' queries are limited to 10 items
    if (topics && topics.length > 0) {
      if (topics.length <= 10) {
        // Use server-side filtering if <= 10 topics
        q = query(q, where('topic', 'in', topics));
      }
      // If > 10 topics, we'll filter client-side after fetching
    }
    
    if (difficulties && difficulties.length > 0) {
      if (difficulties.length <= 10) {
        // Use server-side filtering if <= 10 difficulties
        q = query(q, where('difficulty', 'in', difficulties));
      }
      // If > 10 difficulties, we'll filter client-side after fetching
    }
    
    if (category && category !== 'all') {
      // Category is always a single value, use server-side filtering
      q = query(q, where('category', '==', category));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Try offline storage as fallback
      const offlineQuestions = await filterOffline(topics, difficulties, category);
      return offlineQuestions;
    }
    
    // Filter out hidden questions first
    let visibleDocs = snapshot.docs.filter(isQuestionVisible);
    
    // Apply client-side filters only if they exceed Firestore limits (> 10 items)
    if (topics && topics.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return topics.includes(data.topic);
      });
    }
    
    if (difficulties && difficulties.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return difficulties.includes(data.difficulty);
      });
    }
    
    // Convert to questions
    let questions = visibleDocs.map(convertDocToQuestion);
    
    // Apply additional client-side filters if needed (for > 10 items)
    if (topics && topics.length > 10) {
      questions = questions.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 10) {
      questions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    
    // Automatically save questions to offline storage
    if (questions.length > 0) {
      try {
        // Save to offline storage in background (don't block the response)
        addQuestionsToOffline(questions).catch((error) => {
          debugWarn('offline', 'Failed to save filtered questions to offline storage:', error);
        });
      } catch (error) {
        // Silently fail - offline storage is a nice-to-have, not critical
        debugWarn('offline', 'Error saving filtered questions to offline storage:', error);
      }
    }
    
    // Cache the result
    await setCachedData<Question[]>(cacheKey, questions, CACHE_TTL);
    
    return questions;
  } catch (error: any) {
    // If index error, fall back to client-side filtering
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      if (__DEV__) {
        debugWarn('questions', 'Firestore index required. Falling back to client-side filtering.');
      }
      
      // Fallback: fetch all and filter client-side
      try {
        const questionsRef = collection(db, QUESTIONS_COLLECTION);
        const snapshot = await getDocs(questionsRef);
        
        if (snapshot.empty) {
          // Try offline storage as fallback
          const offlineQuestions = await filterOffline(topics, difficulties, category);
          return offlineQuestions;
        }
        
        let visibleDocs = snapshot.docs.filter(isQuestionVisible);
        let questions = visibleDocs.map(convertDocToQuestion);
        
        // Apply all filters client-side
        if (topics && topics.length > 0) {
          questions = questions.filter(q => topics.includes(q.topic));
        }
        if (difficulties && difficulties.length > 0) {
          questions = questions.filter(q => difficulties.includes(q.difficulty));
        }
        if (category && category !== 'all') {
          questions = questions.filter(q => (q.category || 'general') === category);
        }
        
        return questions;
      } catch (fallbackError) {
        debugError('questions', 'Error in fallback query:', fallbackError);
      }
    }
    
    debugError('questions', 'Error fetching filtered questions:', error);
    
    // Check if it's a network/offline error
    const isNetworkError = 
      error?.code === 'unavailable' ||
      error?.code === 'deadline-exceeded' ||
      error?.message?.includes('network') ||
      error?.message?.includes('offline') ||
      error?.message?.includes('Failed to get document');
    
    // If offline, try to use offline storage or cache
    if (isNetworkError) {
      // First try cache
      const cached = await getCachedData<Question[]>(cacheKey, Infinity);
      if (cached && cached.length > 0) {
        debug('cache', 'Using cached filtered questions due to network error');
        return cached;
      }
      
      // Then try offline storage with filters
      const offlineQuestions = await filterOffline(
        topics,
        difficulties,
        category
      );
      if (offlineQuestions.length > 0) {
        debug('offline', `Using ${offlineQuestions.length} filtered questions from offline storage`);
        return offlineQuestions;
      }
    }
    
    // No fallback - return empty array
    return [];
  }
};

// Paginated version of fetchQuestionsWithFilters
// Uses Firestore where clauses for server-side filtering when possible
export const fetchQuestionsWithFiltersPaginated = async (
  topics?: Topic[],
  difficulties?: Difficulty[],
  category?: QuestionCategory | 'all',
  pageSize: number = DEFAULT_PAGE_SIZE,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedQuestionsResult> => {
  // Generate cache key based on filters, pageSize, and lastDocument ID
  const lastDocId = lastDocument?.id || 'first';
  const cacheKey = generateCacheKey('questions:filters:paginated', {
    topics: topics?.sort().join(','),
    difficulties: difficulties?.sort().join(','),
    category,
    pageSize,
    lastDocId,
  });
  
  try {
    
    // Try to get from cache first (only for first page)
    if (!lastDocument) {
      const cached = await getCachedData<CacheablePaginatedResult>(cacheKey, CACHE_TTL);
      if (cached && cached.questions.length > 0) {
        return {
          questions: cached.questions,
          lastDoc: null, // Can't reconstruct, so pagination will start fresh
          hasMore: cached.hasMore,
        };
      }
    }
    
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with Firestore where clauses for server-side filtering
    let q: Query<DocumentData> = query(questionsRef);
    
    // Apply filters using Firestore where clauses
    // Note: Firestore 'in' queries are limited to 10 items
    if (topics && topics.length > 0 && topics.length <= 10) {
      q = query(q, where('topic', 'in', topics));
    }
    
    if (difficulties && difficulties.length > 0 && difficulties.length <= 10) {
      q = query(q, where('difficulty', 'in', difficulties));
    }
    
    if (category && category !== 'all') {
      q = query(q, where('category', '==', category));
    }
    
    // Add ordering and pagination
    // Fetch more to account for hidden questions and client-side filtering if needed
    const fetchLimit = (topics && topics.length > 10) || (difficulties && difficulties.length > 10)
      ? pageSize * 3  // Fetch more if we need client-side filtering
      : pageSize * 2; // Fetch less if server-side filtering is used
    
    q = query(q, orderBy('createdAt', 'desc'), limit(fetchLimit));
    
    // Add cursor for pagination if provided
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        questions: [],
        lastDoc: null,
        hasMore: false,
      };
    }
    
    // Filter out hidden questions first
    let visibleDocs = snapshot.docs.filter(isQuestionVisible);
    
    // Apply client-side filters only if they exceed Firestore limits (> 10 items)
    if (topics && topics.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return topics.includes(data.topic);
      });
    }
    
    if (difficulties && difficulties.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return difficulties.includes(data.difficulty);
      });
    }
    
    // Convert to questions
    let questions = visibleDocs.map(convertDocToQuestion);
    
    // Apply additional client-side filters if needed (for > 10 items)
    if (topics && topics.length > 10) {
      questions = questions.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 10) {
      questions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    
    // Limit to pageSize after filtering
    questions = questions.slice(0, pageSize);
    
    // Get the last document for pagination cursor
    // Use the last document from the original snapshot for consistent pagination
    const lastDoc = snapshot.docs.length > 0 && snapshot.docs.length === fetchLimit
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;
    
    // Check if there are more documents
    // If we got a full batch and have questions, there might be more
    const hasMore = snapshot.docs.length === fetchLimit && questions.length > 0;
    
    // Automatically save questions to offline storage (only for first page to avoid excessive writes)
    if (!lastDocument && questions.length > 0) {
      try {
        // Save to offline storage in background (don't block the response)
        addQuestionsToOffline(questions).catch((error) => {
          debugWarn('offline', 'Failed to save filtered questions to offline storage:', error);
        });
      } catch (error) {
        // Silently fail - offline storage is a nice-to-have, not critical
        debugWarn('offline', 'Error saving filtered questions to offline storage:', error);
      }
    }
    
    const result = {
      questions,
      lastDoc,
      hasMore,
    };
    
    // Cache the result (only for first page)
    if (!lastDocument) {
      await setCachedData<CacheablePaginatedResult>(cacheKey, {
        questions,
        lastDocId: lastDoc?.id || null,
        hasMore,
      }, CACHE_TTL);
    }
    
    return result;
  } catch (error: any) {
    // If index error, fall back to fetching all and filtering client-side
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      if (__DEV__) {
        debugWarn('questions', 'Firestore index required. Falling back to client-side filtering.');
      }
      
      // Fallback: fetch without filters, filter client-side
      try {
        const questionsRef = collection(db, QUESTIONS_COLLECTION);
        let q: Query<DocumentData> = query(
          questionsRef,
          orderBy('createdAt', 'desc'),
          limit(pageSize * 3)
        );
        
        if (lastDocument) {
          q = query(q, startAfter(lastDocument));
        }
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          return {
            questions: [],
            lastDoc: null,
            hasMore: false,
          };
        }
        
        // Filter client-side
        let visibleDocs = snapshot.docs.filter(isQuestionVisible);
        
        if (topics && topics.length > 0) {
          visibleDocs = visibleDocs.filter(doc => topics.includes(doc.data().topic));
        }
        if (difficulties && difficulties.length > 0) {
          visibleDocs = visibleDocs.filter(doc => difficulties.includes(doc.data().difficulty));
        }
        if (category && category !== 'all') {
          visibleDocs = visibleDocs.filter(doc => (doc.data().category || 'general') === category);
        }
        
        let questions = visibleDocs.map(convertDocToQuestion).slice(0, pageSize);
        const lastDoc = snapshot.docs.length === pageSize * 3 ? snapshot.docs[snapshot.docs.length - 1] : null;
        const hasMore = snapshot.docs.length === pageSize * 3 && questions.length > 0;
        
        return {
          questions,
          lastDoc,
          hasMore,
        };
      } catch (fallbackError) {
        debugError('questions', 'Error in fallback query:', fallbackError);
      }
    }
    
    debugError('questions', 'Error fetching filtered questions:', error);
    
    // Check if it's a network/offline error
    const isNetworkError = 
      error?.code === 'unavailable' ||
      error?.code === 'deadline-exceeded' ||
      error?.code === 'failed-precondition' ||
      error?.code === 'internal' ||
      error?.message?.includes('network') ||
      error?.message?.includes('offline') ||
      error?.message?.includes('Failed to get document') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('connection') ||
      error?.message?.includes('timeout');
    
    // If offline, try to use cached data (only for first page)
    if (isNetworkError) {
      // First try cache
      const cached = await getCachedData<CacheablePaginatedResult>(cacheKey, Infinity);
      if (cached && cached.questions.length > 0) {
        debug('cache', 'Using cached paginated questions due to network error');
        return {
          questions: cached.questions,
          lastDoc: null,
          hasMore: cached.hasMore,
        };
      }
      
      // Check offline storage info first to see if expired
      const offlineInfo = await getOfflineStorageInfo();
      const offlineModeEnabled = await getOfflineModeEnabled();
      
      // If offline mode is enabled but questions are expired, auto-redownload
      if (offlineModeEnabled && (offlineInfo.isExpired || offlineInfo.questionCount === 0) && !lastDocument) {
        debug('offline', 'Offline mode enabled but questions expired - auto-redownloading...');
        try {
          // Clear expired questions if any
          if (offlineInfo.isExpired && offlineInfo.questionCount > 0) {
            await clearOfflineQuestions();
          }
          
          // Download fresh questions
          const result = await prefetchQuestionsForOffline(2000, true);
          if (result.success) {
            debug('offline', 'Auto-redownloaded expired questions successfully');
            // Reload offline questions after download and filter them
            const freshOfflineQuestions = await filterOffline(
              topics,
              difficulties,
              category
            );
            if (freshOfflineQuestions.length > 0) {
              const paginatedQuestions = freshOfflineQuestions.slice(0, pageSize);
              return {
                questions: paginatedQuestions,
                lastDoc: null,
                hasMore: freshOfflineQuestions.length > pageSize,
              };
            }
          }
        } catch (error) {
          debugError('offline', 'Error auto-redownloading expired questions:', error);
        }
      }
      
      // Then try offline storage with filters
      // For pagination, we can't properly paginate filtered offline questions
      if (lastDocument) {
        // Can't paginate offline questions properly, return empty to indicate no more
        debug('offline', 'Cannot paginate filtered offline questions, returning empty');
        return {
          questions: [],
          lastDoc: null,
          hasMore: false,
        };
      }
      
      const offlineQuestions = await filterOffline(
        topics,
        difficulties,
        category
      );
      if (offlineQuestions.length > 0) {
        // Return first page of offline questions
        const paginatedQuestions = offlineQuestions.slice(0, pageSize);
        debug('offline', `Using ${paginatedQuestions.length} filtered questions from offline storage (${offlineQuestions.length} total available)`);
        return {
          questions: paginatedQuestions,
          lastDoc: null,
          hasMore: offlineQuestions.length > pageSize,
        };
      }
    }
    
    return {
      questions: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};

// Fetch a single question by ID
export const fetchQuestionById = async (questionId: string): Promise<Question | null> => {
  try {
    // Generate cache key based on question ID
    const cacheKey = generateCacheKey('question:id', { questionId });
    
    // Try to get from cache first
    const cached = await getCachedData<Question>(cacheKey, CACHE_TTL);
    if (cached) {
      return cached;
    }
    
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const question = convertDocToQuestion(docSnap as QueryDocumentSnapshot<DocumentData>);
      
      // Cache the result
      await setCachedData<Question>(cacheKey, question, CACHE_TTL);
      
      return question;
    }
    
    // Try offline storage as fallback
    const offlineQuestions = await loadOfflineQuestions();
    const offlineQuestion = offlineQuestions.find(q => q.id === questionId) || null;
    if (offlineQuestion) {
      // Cache offline question too
      await setCachedData<Question>(cacheKey, offlineQuestion, CACHE_TTL);
    }
    
    return offlineQuestion;
  } catch (error) {
    debugError('questions', 'Error fetching question:', error);
    // Try offline storage as fallback
    const offlineQuestions = await loadOfflineQuestions();
    const offlineQuestion = offlineQuestions.find(q => q.id === questionId) || null;
    return offlineQuestion;
  }
};

// Add a new question
export const addQuestion = async (question: Omit<Question, 'id'>): Promise<string> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const docRef = await addDoc(questionsRef, {
      ...question,
      createdAt: new Date().toISOString(),
    });
    
    // Invalidate cache when a new question is added
    await clearCacheByPrefix('questions');
    
    return docRef.id;
  } catch (error) {
    debugError('questions', 'Error adding question:', error);
    throw error;
  }
};

// Update a question
export const updateQuestion = async (
  questionId: string,
  updates: Partial<Question>
): Promise<void> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    // Invalidate cache when a question is updated
    await clearCacheByPrefix('questions');
  } catch (error) {
    debugError('questions', 'Error updating question:', error);
    throw error;
  }
};

// Delete a question
export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(docRef);
    
    // Invalidate cache when a question is deleted
    await clearCacheByPrefix('questions');
  } catch (error) {
    debugError('questions', 'Error deleting question:', error);
    throw error;
  }
};

// Seed Firebase with mock questions (useful for initial setup)
export const seedQuestionsToFirebase = async (): Promise<void> => {
  // Import mock questions only for seeding
  const { questions: mockQuestions } = await import('@/data/questions');
  
  try {
    const batch = writeBatch(db);
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Check if questions already exist
    const existingDocs = await getDocs(questionsRef);
    if (!existingDocs.empty) {
      debug('questions', 'Questions already exist in Firebase, skipping seed');
      return;
    }
    
    // Add each mock question
    for (const question of mockQuestions) {
      const { id, ...questionData } = question;
      const docRef = doc(questionsRef, id);
      batch.set(docRef, {
        ...questionData,
        createdAt: new Date().toISOString(),
      });
    }
    
    await batch.commit();
    debug('questions', 'Successfully seeded questions to Firebase');
  } catch (error) {
    debugError('questions', 'Error seeding questions:', error);
    throw error;
  }
};

/**
 * Pre-fetch and save questions for offline use
 * Fetches questions from Firebase and stores them locally for offline access
 * Only available for Pro subscribers.
 * @param maxQuestions Maximum number of questions to fetch (default: 200)
 * @param replaceExisting If true, replaces existing offline questions. If false, merges with existing.
 */
export const prefetchQuestionsForOffline = async (
  maxQuestions: number = 200,
  replaceExisting: boolean = false
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Check if user has pro subscription
    const isPro = await hasActiveEntitlement();
    if (!isPro) {
      debugWarn('offline', 'Pre-fetching offline questions is only available for Pro subscribers');
      return { success: false, count: 0, error: 'Offline mode is only available for Pro subscribers' };
    }

    debug('offline', `Pre-fetching up to ${maxQuestions} questions for offline use...`);
    
    // Fetch questions from Firebase
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const q = query(
      questionsRef,
      orderBy('createdAt', 'desc'),
      limit(maxQuestions)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      debug('questions', 'No questions found in Firebase');
      return { success: false, count: 0, error: 'No questions found' };
    }
    
    // Filter out hidden questions and convert to Question type
    const visibleDocs = snapshot.docs.filter(isQuestionVisible);
    const questions = visibleDocs.map(convertDocToQuestion);
    
    if (questions.length === 0) {
      debug('questions', 'No visible questions found');
      return { success: false, count: 0, error: 'No visible questions found' };
    }
    
    // Save to offline storage
    if (replaceExisting) {
      await saveQuestionsForOffline(questions);
    } else {
      await addQuestionsToOffline(questions);
    }
    
    const finalCount = await getOfflineQuestionsCount();
    debug('offline', `Successfully saved ${questions.length} questions for offline use (${finalCount} total offline)`);
    
    return { success: true, count: finalCount };
  } catch (error: any) {
    debugError('offline', 'Error pre-fetching questions for offline:', error);
    
    // Check if it's a network error
    const isNetworkError = 
      error?.code === 'unavailable' ||
      error?.code === 'deadline-exceeded' ||
      error?.message?.includes('network') ||
      error?.message?.includes('offline');
    
    if (isNetworkError) {
      return { success: false, count: 0, error: 'Network error. Please check your connection.' };
    }
    
    return { success: false, count: 0, error: error?.message || 'Failed to pre-fetch questions' };
  }
};

