import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, Topic, Difficulty, Company, QuestionCategory, questions as mockQuestions } from '@/data/questions';
import {
  fetchAllQuestions,
  fetchAllQuestionsLegacy,
  fetchQuestionsWithFilters,
  fetchQuestionsWithFiltersPaginated,
  type PaginatedQuestionsResult,
} from '@/services/questionsService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { useDebounce, useDebounceArray } from '@/utils/debounce';

interface UseQuestionsOptions {
  topics?: Topic[];
  difficulties?: Difficulty[];
  companies?: Company[];
  category?: QuestionCategory | 'all';
  shuffle?: boolean;
  usePagination?: boolean; // Enable pagination
  pageSize?: number; // Questions per page (default: 50)
}

interface UseQuestionsReturn {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>; // Load next page
  hasMore: boolean; // Whether more questions are available
  isLoadingMore: boolean; // Loading state for pagination
}

export const useQuestions = (options: UseQuestionsOptions = {}): UseQuestionsReturn => {
  const { 
    topics, 
    difficulties, 
    companies, 
    category, 
    shuffle = true,
    usePagination = true, // Enable pagination by default
    pageSize = 50
  } = options;
  
  // Debounce filter changes to prevent excessive API calls
  // 500ms delay - enough to wait for user to finish selecting filters
  // Note: Initial load uses original values, subsequent changes use debounced values
  const debouncedTopics = useDebounceArray(topics || [], 500);
  const debouncedDifficulties = useDebounceArray(difficulties || [], 500);
  const debouncedCategory = useDebounce(category || 'all', 500);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  // Track if component has mounted (don't debounce initial load)
  const hasMounted = useRef(false);
  
  // Use ref to track lastDoc to avoid dependency issues
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    lastDocRef.current = lastDoc;
  }, [lastDoc]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const applyCompanyFilter = (questions: Question[]): Question[] => {
    // If no company filter is specified, return all questions
    if (!companies || companies.length === 0) {
      return questions;
    }
    
    // Filter questions: include if question has no companies field OR has overlap with selected companies
    return questions.filter(q => {
      // If question doesn't specify companies, include it
      if (!q.companies || q.companies.length === 0) {
        return true;
      }
      // If question has companies, check if any match the selected companies
      return q.companies.some(company => companies.includes(company));
    });
  };

  const fetchQuestions = useCallback(async (isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
      setQuestions([]);
      setLastDoc(null);
      lastDocRef.current = null;
    }
    
    try {
      // Use debounced values for filters (but use original for initial load)
      // After first mount, use debounced values to prevent excessive API calls
      const activeTopics = !hasMounted.current ? (topics || []) : debouncedTopics;
      const activeDifficulties = !hasMounted.current ? (difficulties || []) : debouncedDifficulties;
      const activeCategory = !hasMounted.current ? (category || 'all') : debouncedCategory;
      
      let result: PaginatedQuestionsResult | { questions: Question[] };
      
      // Use pagination if enabled
      if (usePagination) {
        // Get lastDoc from ref to avoid dependency issues
        const currentLastDoc = isLoadMore ? lastDocRef.current || undefined : undefined;
        
        // If filters are provided, use filtered paginated fetch
        if ((activeTopics.length > 0) || (activeDifficulties.length > 0) || (activeCategory !== 'all')) {
          result = await fetchQuestionsWithFiltersPaginated(
            activeTopics, 
            activeDifficulties, 
            activeCategory, 
            pageSize,
            currentLastDoc
          );
        } else {
          result = await fetchAllQuestions(
            pageSize,
            currentLastDoc
          );
        }
        
        // Handle pagination result
        if ('lastDoc' in result) {
          const paginatedResult = result as PaginatedQuestionsResult;
          
          if (isLoadMore) {
            setQuestions(prev => [...prev, ...paginatedResult.questions]);
          } else {
            setQuestions(paginatedResult.questions);
          }
          
          setLastDoc(paginatedResult.lastDoc);
          lastDocRef.current = paginatedResult.lastDoc;
          setHasMore(paginatedResult.hasMore);
          
          // If no questions from Firestore, fallback to mock
          if (paginatedResult.questions.length === 0 && !isLoadMore) {
            let fallbackQuestions = mockQuestions;
            if (activeTopics.length > 0) {
              fallbackQuestions = fallbackQuestions.filter(q => activeTopics.includes(q.topic));
            }
            if (activeDifficulties.length > 0) {
              fallbackQuestions = fallbackQuestions.filter(q => activeDifficulties.includes(q.difficulty));
            }
            if (activeCategory !== 'all') {
              fallbackQuestions = fallbackQuestions.filter(q => (q.category || 'general') === activeCategory);
            }
            // Use original companies for filtering (not debounced)
            const activeCompanies = companies || [];
            if (activeCompanies.length > 0) {
              fallbackQuestions = fallbackQuestions.filter(q => {
                if (!q.companies || q.companies.length === 0) return true;
                return q.companies.some(company => activeCompanies.includes(company));
              });
            }
            if (shuffle) {
              fallbackQuestions = shuffleArray(fallbackQuestions);
            }
            setQuestions(fallbackQuestions);
            setHasMore(false);
          } else {
            // Apply company filter and shuffle to fetched questions
            let processedQuestions = isLoadMore ? result.questions : result.questions;
            processedQuestions = applyCompanyFilter(processedQuestions);
            if (shuffle && !isLoadMore) {
              processedQuestions = shuffleArray(processedQuestions);
            }
            
            if (isLoadMore) {
              setQuestions(prev => {
                const combined = [...prev, ...processedQuestions];
                return shuffle ? shuffleArray(combined) : combined;
              });
            } else {
              setQuestions(processedQuestions);
            }
          }
        }
      } else {
        // Legacy non-paginated approach
        let fetchedQuestions: Question[];
        
        if ((activeTopics.length > 0) || (activeDifficulties.length > 0) || (activeCategory !== 'all')) {
          fetchedQuestions = await fetchQuestionsWithFilters(activeTopics, activeDifficulties, activeCategory);
        } else {
          fetchedQuestions = await fetchAllQuestionsLegacy();
        }
        
        // Fallback to mock if empty
        if (fetchedQuestions.length === 0) {
          fetchedQuestions = mockQuestions;
          
          if (activeTopics.length > 0) {
            fetchedQuestions = fetchedQuestions.filter(q => activeTopics.includes(q.topic));
          }
          if (activeDifficulties.length > 0) {
            fetchedQuestions = fetchedQuestions.filter(q => activeDifficulties.includes(q.difficulty));
          }
          if (activeCategory !== 'all') {
            fetchedQuestions = fetchedQuestions.filter(q => (q.category || 'general') === activeCategory);
          }
        }
        
        fetchedQuestions = applyCompanyFilter(fetchedQuestions);
        if (shuffle) {
          fetchedQuestions = shuffleArray(fetchedQuestions);
        }
        
        setQuestions(fetchedQuestions);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error in useQuestions:', err);
      setError('Failed to load questions');
      
      // Fallback to mock data on error
      let fallbackQuestions = mockQuestions;
      const activeTopics = !hasMounted.current ? (topics || []) : debouncedTopics;
      const activeDifficulties = !hasMounted.current ? (difficulties || []) : debouncedDifficulties;
      const activeCategory = !hasMounted.current ? (category || 'all') : debouncedCategory;
      
      if (activeTopics.length > 0) {
        fallbackQuestions = fallbackQuestions.filter(q => activeTopics.includes(q.topic));
      }
      if (activeDifficulties.length > 0) {
        fallbackQuestions = fallbackQuestions.filter(q => activeDifficulties.includes(q.difficulty));
      }
      if (activeCategory !== 'all') {
        fallbackQuestions = fallbackQuestions.filter(q => (q.category || 'general') === activeCategory);
      }
      fallbackQuestions = applyCompanyFilter(fallbackQuestions);
      if (shuffle) {
        fallbackQuestions = shuffleArray(fallbackQuestions);
      }
      setQuestions(fallbackQuestions);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      // Mark initial load as complete after first fetch
      if (!hasMounted.current && !isLoadMore) {
        hasMounted.current = true;
      }
    }
  }, [debouncedTopics, debouncedDifficulties, debouncedCategory, companies, shuffle, usePagination, pageSize, topics, difficulties, category]);
  
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) {
      return;
    }
    await fetchQuestions(true);
  }, [hasMore, isLoadingMore, isLoading, fetchQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    questions,
    isLoading,
    error,
    refetch: () => fetchQuestions(false),
    loadMore,
    hasMore,
    isLoadingMore,
  };
};

// Hook for infinite feed (repeats questions for continuous scrolling)
export const useInfiniteQuestions = (options: UseQuestionsOptions = {}): UseQuestionsReturn & { feedQuestions: Question[] } => {
  const { questions, isLoading, error, refetch, loadMore, hasMore, isLoadingMore } = useQuestions(options);
  
  // Create an "infinite" feed by repeating questions
  const feedQuestions = questions.length > 0 
    ? [...questions, ...questions, ...questions] 
    : [];

  return {
    questions,
    feedQuestions,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore,
  };
};

