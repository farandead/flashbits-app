import { useState, useEffect, useCallback } from 'react';
import { Question, Topic, Difficulty, Company, QuestionCategory, questions as mockQuestions } from '@/data/questions';
import {
  fetchAllQuestions,
  fetchQuestionsWithFilters,
} from '@/services/questionsService';

interface UseQuestionsOptions {
  topics?: Topic[];
  difficulties?: Difficulty[];
  companies?: Company[];
  category?: QuestionCategory | 'all';
  shuffle?: boolean;
}

interface UseQuestionsReturn {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useQuestions = (options: UseQuestionsOptions = {}): UseQuestionsReturn => {
  const { topics, difficulties, companies, category, shuffle = true } = options;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let fetchedQuestions: Question[];
      
      // If filters are provided, use filtered fetch
      if ((topics && topics.length > 0) || (difficulties && difficulties.length > 0) || (category && category !== 'all')) {
        fetchedQuestions = await fetchQuestionsWithFilters(topics, difficulties, category);
      } else {
        fetchedQuestions = await fetchAllQuestions();
      }
      
      // Fallback to mock if empty
      if (fetchedQuestions.length === 0) {
        fetchedQuestions = mockQuestions;
        
        // Apply filters to mock data
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
      
      // Apply company filter (works on both Firestore and mock data)
      fetchedQuestions = applyCompanyFilter(fetchedQuestions);
      
      // Shuffle if requested
      if (shuffle) {
        fetchedQuestions = shuffleArray(fetchedQuestions);
      }
      
      setQuestions(fetchedQuestions);
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
    } finally {
      setIsLoading(false);
    }
  }, [topics, difficulties, companies, category, shuffle]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    questions,
    isLoading,
    error,
    refetch: fetchQuestions,
  };
};

// Hook for infinite feed (repeats questions for continuous scrolling)
export const useInfiniteQuestions = (options: UseQuestionsOptions = {}): UseQuestionsReturn & { feedQuestions: Question[] } => {
  const { questions, isLoading, error, refetch } = useQuestions(options);
  
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
  };
};

