import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { sanitizeUserProfile } from '@/utils/sanitize';
import { validateUserProfile, ValidationError } from '@/utils/validateProfile';
import { debug, debugError, debugSuccess } from '@/utils/debug';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Export ValidationError for use in components
export { ValidationError };

// User profile interface
export interface UserProfile {
  name: string;
  occupation: string;
  codingLevel: string;
  goals: string[];
  onboardingCompleted: boolean;
  isPro?: boolean; // Pro subscription status
  proExpiresAt?: string; // Pro subscription expiry date
  createdAt: string;
  updatedAt?: string;
  xp?: number;
  questionsAnswered?: number;
}

/**
 * Save user profile to Firestore
 * 
 * @throws ValidationError if profile data is invalid
 */
export const saveUserProfile = async (
  userId: string, 
  profile: UserProfile
): Promise<void> => {
  try {
    // Validate user profile data before processing
    validateUserProfile(profile, false);
    
    // Sanitize user profile data after validation
    const sanitizedProfile = sanitizeUserProfile(profile);
    
    const userRef = doc(db, 'users', userId);
    const profileToSave = {
      ...sanitizedProfile,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, profileToSave, { merge: true });
    
    // Cache the profile for instant access (use the original validated profile)
    await cacheProfile(userId, profile);
    
    if (__DEV__) {
      debug('firebase', 'User profile saved successfully');
    }
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }
    debugError('firebase', 'Error saving user profile:', error);
    throw error;
  }
};

const PROFILE_CACHE_KEY = (userId: string) => `@flashbits_profile:${userId}`;
// Profile cache TTL: 1 hour (profiles don't change often)
const PROFILE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedProfile {
  profile: UserProfile;
  timestamp: number;
}

/**
 * Get cached user profile from AsyncStorage (with expiration check)
 */
const getCachedProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY(userId));
    if (!cached) {
      return null;
    }

    const cachedEntry: CachedProfile = JSON.parse(cached);
    const age = Date.now() - cachedEntry.timestamp;
    
    // Check if cache is expired
    if (age > PROFILE_CACHE_TTL) {
      debug('cache', `Profile cache expired (age: ${Math.round(age / (60 * 1000))}min, TTL: ${Math.round(PROFILE_CACHE_TTL / (60 * 1000))}min)`);
      // Remove expired cache
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY(userId));
      return null;
    }

    const remaining = PROFILE_CACHE_TTL - age;
    debugSuccess('cache', `Using cached profile (age: ${Math.round(age / (60 * 1000))}min, remaining: ${Math.round(remaining / (60 * 1000))}min)`);
    return cachedEntry.profile;
  } catch (error) {
    debugError('cache', 'Error getting cached profile:', error);
    return null;
  }
};

/**
 * Cache user profile to AsyncStorage with timestamp
 */
const cacheProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  try {
    const cachedEntry: CachedProfile = {
      profile,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(PROFILE_CACHE_KEY(userId), JSON.stringify(cachedEntry));
    debugSuccess('cache', 'Profile cached successfully');
  } catch (error) {
    debugError('cache', 'Error caching profile:', error);
  }
};

/**
 * Clear cached user profile (call on logout)
 */
export const clearCachedProfile = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY(userId));
    debug('cache', 'Profile cache cleared');
  } catch (error) {
    debugError('cache', 'Error clearing profile cache:', error);
  }
};

/**
 * Get user profile from Firestore (with cache fallback)
 */
export const getUserProfile = async (userId: string, useCache: boolean = true): Promise<UserProfile | null> => {
  try {
    // Try cache first if requested
    if (useCache) {
      const cached = await getCachedProfile(userId);
      if (cached) {
        // Fetch fresh data in background (don't await)
        getUserProfile(userId, false).then((fresh) => {
          if (fresh) {
            cacheProfile(userId, fresh);
          }
        }).catch(() => {
          // Ignore background fetch errors
        });
        return cached;
      }
    }

    // Fetch from Firestore
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;
      // Cache it for next time
      await cacheProfile(userId, profile);
      return profile;
    }
    return null;
  } catch (error) {
    debugError('firebase', 'Error getting user profile:', error);
    // If network error, try cache as fallback
    if (useCache) {
      const cached = await getCachedProfile(userId);
      if (cached) {
        debug('cache', 'Using cached profile as fallback');
        return cached;
      }
    }
    throw error;
  }
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
  try {
    // Use cache first for faster check
    const profile = await getUserProfile(userId, true);
    return profile?.onboardingCompleted === true;
  } catch (error) {
    debugError('firebase', 'Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Update user profile fields
 * 
 * @throws ValidationError if update data is invalid
 */
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    // Validate updates (partial validation - only validate provided fields)
    validateUserProfile(updates, true);
    
    // Sanitize updates after validation
    const sanitizedUpdates = sanitizeUserProfile(updates);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...sanitizedUpdates,
      updatedAt: new Date().toISOString(),
    });
    if (__DEV__) {
      debug('firebase', 'User profile updated successfully');
    }
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }
    debugError('firebase', 'Error updating user profile:', error);
    throw error;
  }
};

/**
 * Delete all user data from Firestore
 * This includes: user profile, user stats, and user activities
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  try {
    debug('firebase', `Deleting all data for user: ${userId}`);
    
    // Delete user profile
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    debug('firebase', 'User profile deleted');
    
    // Delete user stats
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    if (userStatsSnap.exists()) {
      await deleteDoc(userStatsRef);
      debug('firebase', 'User stats deleted');
    }
    
    // Delete user activities from internal collection (if it exists)
    // Note: Public activities don't have userId, so we can't delete them by userId
    // This is intentional for privacy - public activities are anonymized
    try {
      const activitiesInternalRef = collection(db, 'activitiesInternal');
      const activitiesQuery = query(activitiesInternalRef, where('userId', '==', userId));
      const activitiesSnap = await getDocs(activitiesQuery);
      
      const deletePromises = activitiesSnap.docs.map(async (activityDoc) => {
        await deleteDoc(activityDoc.ref);
      });
      
      await Promise.all(deletePromises);
      debug('firebase', `Deleted ${activitiesSnap.docs.length} internal user activities`);
    } catch (error) {
      // Internal activities collection may not exist yet - that's okay
      debug('firebase', 'No internal activities to delete (collection may not exist)');
    }
    
    debug('firebase', 'All user data deleted successfully');
  } catch (error) {
    debugError('firebase', 'Error deleting user data:', error);
    throw error;
  }
};

