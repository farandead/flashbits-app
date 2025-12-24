import { useState, useEffect, useCallback } from 'react';
import { getTopics, TopicConfig } from '@/services/topicsService';

interface UseTopicsReturn {
  topics: TopicConfig[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch topics from Firestore
 * Automatically refetches when needed
 */
export const useTopics = (): UseTopicsReturn => {
  const [topics, setTopics] = useState<TopicConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedTopics = await getTopics();
      setTopics(fetchedTopics);
    } catch (err) {
      console.error('Error in useTopics:', err);
      setError('Failed to load topics');
      // Service already handles fallback, but set empty array if something goes wrong
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    topics,
    isLoading,
    error,
    refetch: fetchTopics,
  };
};

