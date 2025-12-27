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
    await setDoc(userRef, {
      ...sanitizedProfile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    if (__DEV__) {
      console.log('User profile saved successfully');
    }
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('Error saving user profile:', error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.onboardingCompleted === true;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
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
      console.log('User profile updated successfully');
    }
  } catch (error) {
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Delete all user data from Firestore
 * This includes: user profile, user stats, and user activities
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  try {
    console.log(`Deleting all data for user: ${userId}`);
    
    // Delete user profile
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    console.log('User profile deleted');
    
    // Delete user stats
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    if (userStatsSnap.exists()) {
      await deleteDoc(userStatsRef);
      console.log('User stats deleted');
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
      console.log(`Deleted ${activitiesSnap.docs.length} internal user activities`);
    } catch (error) {
      // Internal activities collection may not exist yet - that's okay
      console.log('No internal activities to delete (collection may not exist)');
    }
    
    console.log('All user data deleted successfully');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
};

