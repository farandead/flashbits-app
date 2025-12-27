/**
 * Rate Limiting Utility for Authentication
 * 
 * Prevents brute force attacks on login/signup endpoints
 * Uses AsyncStorage to persist rate limit data across app restarts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Maximum failed attempts before blocking
  MAX_FAILED_ATTEMPTS: 5,
  // Time window in milliseconds (15 minutes)
  TIME_WINDOW_MS: 15 * 60 * 1000,
  // Block duration in milliseconds (30 minutes)
  BLOCK_DURATION_MS: 30 * 60 * 1000,
  // Storage key prefix
  STORAGE_KEY_PREFIX: '@rate_limit:',
} as const;

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

/**
 * Get storage key for a specific identifier (email or IP)
 */
const getStorageKey = (identifier: string): string => {
  return `${RATE_LIMIT_CONFIG.STORAGE_KEY_PREFIX}${identifier}`;
};

/**
 * Check if an identifier is currently rate limited
 * 
 * @param identifier - Email address or IP address
 * @returns Object with `isBlocked` boolean and `retryAfter` timestamp (if blocked)
 */
export const checkRateLimit = async (
  identifier: string
): Promise<{ isBlocked: boolean; retryAfter?: number; remainingAttempts?: number }> => {
  try {
    const storageKey = getStorageKey(identifier);
    const stored = await AsyncStorage.getItem(storageKey);
    
    if (!stored) {
      return { isBlocked: false, remainingAttempts: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS };
    }

    const entry: RateLimitEntry = JSON.parse(stored);
    const now = Date.now();

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        isBlocked: true,
        retryAfter: entry.blockedUntil,
        remainingAttempts: 0,
      };
    }

    // Check if time window has expired (reset if old)
    const timeSinceFirstAttempt = now - entry.firstAttempt;
    if (timeSinceFirstAttempt > RATE_LIMIT_CONFIG.TIME_WINDOW_MS) {
      // Time window expired, reset
      await AsyncStorage.removeItem(storageKey);
      return { isBlocked: false, remainingAttempts: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS };
    }

    // Check if max attempts reached
    if (entry.attempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
      // Block for the configured duration
      const blockedUntil = now + RATE_LIMIT_CONFIG.BLOCK_DURATION_MS;
      const updatedEntry: RateLimitEntry = {
        ...entry,
        blockedUntil,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedEntry));
      
      return {
        isBlocked: true,
        retryAfter: blockedUntil,
        remainingAttempts: 0,
      };
    }

    // Not blocked, return remaining attempts
    const remainingAttempts = RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - entry.attempts;
    return { isBlocked: false, remainingAttempts };
  } catch (error) {
    // On error, allow the request (fail open for better UX)
    console.error('Rate limit check error:', error);
    return { isBlocked: false, remainingAttempts: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS };
  }
};

/**
 * Record a failed authentication attempt
 * 
 * @param identifier - Email address or IP address
 */
export const recordFailedAttempt = async (identifier: string): Promise<void> => {
  try {
    const storageKey = getStorageKey(identifier);
    const stored = await AsyncStorage.getItem(storageKey);
    const now = Date.now();

    let entry: RateLimitEntry;

    if (stored) {
      entry = JSON.parse(stored);
      const timeSinceFirstAttempt = now - entry.firstAttempt;

      // Reset if time window expired
      if (timeSinceFirstAttempt > RATE_LIMIT_CONFIG.TIME_WINDOW_MS) {
        entry = {
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
        };
      } else {
        // Increment attempts within time window
        entry.attempts += 1;
        entry.lastAttempt = now;
      }
    } else {
      // First attempt
      entry = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
    }

    // If max attempts reached, set block duration
    if (entry.attempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
      entry.blockedUntil = now + RATE_LIMIT_CONFIG.BLOCK_DURATION_MS;
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (error) {
    console.error('Rate limit record error:', error);
    // Fail silently - don't break auth flow
  }
};

/**
 * Clear rate limit for an identifier (call on successful authentication)
 * 
 * @param identifier - Email address or IP address
 */
export const clearRateLimit = async (identifier: string): Promise<void> => {
  try {
    const storageKey = getStorageKey(identifier);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Rate limit clear error:', error);
  }
};

/**
 * Get remaining time until rate limit expires (in seconds)
 * 
 * @param identifier - Email address or IP address
 * @returns Remaining seconds until unblocked, or null if not blocked
 */
export const getRemainingBlockTime = async (identifier: string): Promise<number | null> => {
  try {
    const storageKey = getStorageKey(identifier);
    const stored = await AsyncStorage.getItem(storageKey);
    
    if (!stored) {
      return null;
    }

    const entry: RateLimitEntry = JSON.parse(stored);
    const now = Date.now();

    if (entry.blockedUntil && now < entry.blockedUntil) {
      return Math.ceil((entry.blockedUntil - now) / 1000);
    }

    return null;
  } catch (error) {
    console.error('Rate limit get remaining time error:', error);
    return null;
  }
};

/**
 * Format remaining time as human-readable string
 * 
 * @param seconds - Remaining seconds
 * @returns Formatted string (e.g., "5 minutes", "30 seconds")
 */
export const formatRemainingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
};

