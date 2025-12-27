import AsyncStorage from '@react-native-async-storage/async-storage';
import { debug, debugWarn, debugError, debugSuccess } from '@/utils/debug';

const CACHE_PREFIX = '@flashbits_cache:';
const CACHE_TTL_PREFIX = '@flashbits_cache_ttl:';

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generate a cache key from query parameters
 */
export const generateCacheKey = (prefix: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return `${CACHE_PREFIX}${prefix}`;
  }
  
  // Sort keys for consistent hashing
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  
  return `${CACHE_PREFIX}${prefix}:${sortedParams}`;
};

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (timestamp: number, ttl: number): boolean => {
  const now = Date.now();
  return (now - timestamp) < ttl;
};

/**
 * Get cached data if available and valid
 */
export const getCachedData = async <T>(
  cacheKey: string,
  ttl: number = DEFAULT_TTL
): Promise<T | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (!cachedData) {
      debug('cache', `Cache MISS: ${cacheKey.replace(CACHE_PREFIX, '')}`);
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(cachedData);
    
    // Check if cache is still valid
    if (!isCacheValid(entry.timestamp, ttl)) {
      // Cache expired, remove it
      const age = Date.now() - entry.timestamp;
      debug('cache', `Cache EXPIRED: ${cacheKey.replace(CACHE_PREFIX, '')} (age: ${Math.round(age / 1000)}s, TTL: ${Math.round(ttl / 1000)}s)`);
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    const age = Date.now() - entry.timestamp;
    const remaining = ttl - age;
    debugSuccess('cache', `Cache HIT: ${cacheKey.replace(CACHE_PREFIX, '')} (age: ${Math.round(age / 1000)}s, remaining: ${Math.round(remaining / 1000)}s)`);
    return entry.data;
  } catch (error) {
    debugError('cache', `Error reading from cache: ${cacheKey.replace(CACHE_PREFIX, '')}`, error);
    return null;
  }
};

/**
 * Store data in cache with TTL
 */
export const setCachedData = async <T>(
  cacheKey: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> => {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    const dataSize = JSON.stringify(entry).length;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    
    debug('cache', `Cache WRITE: ${cacheKey.replace(CACHE_PREFIX, '')} (size: ${Math.round(dataSize / 1024)}KB, TTL: ${Math.round(ttl / 1000)}s)`);
  } catch (error) {
    debugError('cache', `Error writing to cache: ${cacheKey.replace(CACHE_PREFIX, '')}`, error);
  }
};

/**
 * Remove cached data
 */
export const removeCachedData = async (cacheKey: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(cacheKey);
    debug('cache', `Cache REMOVE: ${cacheKey.replace(CACHE_PREFIX, '')}`);
  } catch (error) {
    debugError('cache', `Error removing from cache: ${cacheKey.replace(CACHE_PREFIX, '')}`, error);
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    debugSuccess('cache', `Cache CLEAR ALL: Removed ${cacheKeys.length} entries`);
  } catch (error) {
    debugError('cache', 'Error clearing all cache', error);
  }
};

/**
 * Clear cache entries by prefix
 */
export const clearCacheByPrefix = async (prefix: string): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith(`${CACHE_PREFIX}${prefix}`)
    );
    await AsyncStorage.multiRemove(cacheKeys);
    debugSuccess('cache', `Cache CLEAR PREFIX: ${prefix} (removed ${cacheKeys.length} entries)`);
  } catch (error) {
    debugError('cache', `Error clearing cache by prefix: ${prefix}`, error);
  }
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = async (): Promise<{
  totalEntries: number;
  entries: Array<{ key: string; age: number; size: number }>;
}> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    const entries = await Promise.all(
      cacheKeys.map(async (key) => {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entry: CacheEntry<any> = JSON.parse(data);
          return {
            key: key.replace(CACHE_PREFIX, ''),
            age: Date.now() - entry.timestamp,
            size: JSON.stringify(entry.data).length,
          };
        }
        return null;
      })
    );
    
    const validEntries = entries.filter((e): e is { key: string; age: number; size: number } => e !== null);
    const totalSize = validEntries.reduce((sum, e) => sum + e.size, 0);
    
    debug('cache', `Cache STATS: ${validEntries.length} entries, ${Math.round(totalSize / 1024)}KB total`);
    
    return {
      totalEntries: validEntries.length,
      entries: validEntries,
    };
  } catch (error) {
    debugError('cache', 'Error getting cache stats', error);
    return { totalEntries: 0, entries: [] };
  }
};

