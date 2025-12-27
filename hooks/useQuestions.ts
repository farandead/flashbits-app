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
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
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
      let result: PaginatedQuestionsResult | { questions: Question[] };
      
      // Use pagination if enabled
      if (usePagination) {
        // Get lastDoc from ref to avoid dependency issues
        const currentLastDoc = isLoadMore ? lastDocRef.current || undefined : undefined;
        
        // If filters are provided, use filtered paginated fetch
        if ((topics && topics.length > 0) || (difficulties && difficulties.length > 0) || (category && category !== 'all')) {
          result = await fetchQuestionsWithFiltersPaginated(
            topics, 
            difficulties, 
            category, 
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
            if (topics && topics.length > 0) {
              fallbackQuestions = fallbackQuestions.filter(q => topics.includes(q.topic));
            }
            if (difficulties && difficulties.length > 0) {
              fallbackQuestions = fallbackQuestions.filter(q => difficulties.includes(q.difficulty));
            }
            if (category && category !== 'all') {
              fallbackQuestions = fallbackQuestions.filter(q => (q.category || 'general') === category);
            }
            fallbackQuestions = applyCompanyFilter(fallbackQuestions);
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
        
        if ((topics && topics.length > 0) || (difficulties && difficulties.length > 0) || (category && category !== 'all')) {
          fetchedQuestions = await fetchQuestionsWithFilters(topics, difficulties, category);
        } else {
          fetchedQuestions = await fetchAllQuestionsLegacy();
        }
        
        // Fallback to mock if empty
        if (fetchedQuestions.length === 0) {
          fetchedQuestions = mockQuestions;
          
          if (topics && topics.length > 0) {
            fetchedQuestions = fetchedQuestions.filter(q => topics.includes(q.topic));
          }
          if (difficulties && difficulties.length > 0) {
            fetchedQuestions = fetchedQuestions.filter(q => difficulties.includes(q.difficulty));
          }
          if (category && category !== 'all') {
            fetchedQuestions = fetchedQuestions.filter(q => (q.category || 'general') === category);
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
      if (topics && topics.length > 0) {
        fallbackQuestions = fallbackQuestions.filter(q => topics.includes(q.topic));
      }
      if (difficulties && difficulties.length > 0) {
        fallbackQuestions = fallbackQuestions.filter(q => difficulties.includes(q.difficulty));
      }
      if (category && category !== 'all') {
        fallbackQuestions = fallbackQuestions.filter(q => (q.category || 'general') === category);
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
    }
  }, [topics, difficulties, companies, category, shuffle, usePagination, pageSize]);
  
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

