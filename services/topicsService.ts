import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Topic } from '@/data/questions';
import { generateCacheKey, getCachedData, setCachedData, clearCacheByPrefix } from './cacheService';
import { debug, debugError } from '@/utils/debug';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL for topics (longer since they change less frequently)

type IoniconsName = string; // We'll use string for icon names from Firestore

export interface TopicConfig {
  id: Topic;
  name: string;
  icon: IoniconsName;
  color: string;
  order?: number; // For custom ordering
  enabled?: boolean; // To enable/disable topics
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get all topics from Firestore
 * Falls back to default topics if Firestore is empty or fails
 */
export const getTopics = async (): Promise<TopicConfig[]> => {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('topics:all');
    
    // Try to get from cache first
    const cached = await getCachedData<TopicConfig[]>(cacheKey, CACHE_TTL);
    if (cached) {
      return cached;
    }
    
    const topicsRef = collection(db, 'topics');
    const q = query(topicsRef, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      debug('questions', 'No topics found in Firestore, returning default topics');
      const defaultTopics = getDefaultTopics();
      
      // Cache default topics
      await setCachedData<TopicConfig[]>(cacheKey, defaultTopics, CACHE_TTL);
      
      return defaultTopics;
    }
    
    const topics: TopicConfig[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      topics.push({
        id: data.id as Topic,
        name: data.name,
        icon: data.icon,
        color: data.color,
        order: data.order || 0,
        enabled: data.enabled !== false, // Default to true if not specified
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    
    // Filter out disabled topics and sort by order
    const filteredTopics = topics
      .filter(topic => topic.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Cache the result
    await setCachedData<TopicConfig[]>(cacheKey, filteredTopics, CACHE_TTL);
    
    return filteredTopics;
  } catch (error) {
    debugError('questions', 'Error fetching topics from Firestore:', error);
    // Fallback to default topics on error
    const defaultTopics = getDefaultTopics();
    
    // Cache default topics even on error
    const cacheKey = generateCacheKey('topics:all');
    await setCachedData<TopicConfig[]>(cacheKey, defaultTopics, CACHE_TTL);
    
    return defaultTopics;
  }
};

/**
 * Get a single topic by ID
 */
export const getTopic = async (topicId: Topic): Promise<TopicConfig | null> => {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('topic:id', { topicId });
    
    // Try to get from cache first
    const cached = await getCachedData<TopicConfig>(cacheKey, CACHE_TTL);
    if (cached) {
      return cached;
    }
    
    const topicRef = doc(db, 'topics', topicId);
    const topicSnap = await getDoc(topicRef);
    
    if (topicSnap.exists()) {
      const data = topicSnap.data();
      const topic = {
        id: data.id as Topic,
        name: data.name,
        icon: data.icon,
        color: data.color,
        order: data.order || 0,
        enabled: data.enabled !== false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      // Cache the result
      await setCachedData<TopicConfig>(cacheKey, topic, CACHE_TTL);
      
      return topic;
    }
    return null;
  } catch (error) {
    debugError('questions', 'Error fetching topic:', error);
    return null;
  }
};

/**
 * Default topics fallback (matches current hardcoded topics)
 */
const getDefaultTopics = (): TopicConfig[] => [
  { id: 'Arrays', name: 'Arrays', icon: 'grid-outline', color: '#FF6B6B', order: 1 },
  { id: 'LinkedLists', name: 'Linked Lists', icon: 'link-outline', color: '#AA96DA', order: 2 },
  { id: 'StacksQueues', name: 'Stacks & Queues', icon: 'layers-outline', color: '#4ECDC4', order: 3 },
  { id: 'Hashing', name: 'Hashing', icon: 'key-outline', color: '#FFE66D', order: 4 },
  { id: 'Trees', name: 'Trees', icon: 'git-branch-outline', color: '#95E1D3', order: 5 },
  { id: 'Graphs', name: 'Graphs', icon: 'git-network-outline', color: '#DDA0DD', order: 6 },
  { id: 'Sorting', name: 'Sorting & Searching', icon: 'funnel-outline', color: '#FF9F43', order: 7 },
  { id: 'Recursion', name: 'Recursion & Backtracking', icon: 'repeat-outline', color: '#FCE38A', order: 8 },
  { id: 'Greedy', name: 'Greedy Algorithms', icon: 'flash-outline', color: '#5F27CD', order: 9 },
  { id: 'DP', name: 'Dynamic Programming', icon: 'calculator-outline', color: '#F38181', order: 10 },
  { id: 'BitManipulation', name: 'Bit Manipulation', icon: 'code-slash-outline', color: '#00D2D3', order: 11 },
  { id: 'Math', name: 'Math & Number Theory', icon: 'calculator-outline', color: '#FD79A8', order: 12 },
  { id: 'AdvancedDS', name: 'Advanced Data Structures', icon: 'cube-outline', color: '#6C5CE7', order: 13 },
  { id: 'AdvancedAlgo', name: 'Advanced Algorithms', icon: 'trending-up-outline', color: '#A29BFE', order: 14 },
];

