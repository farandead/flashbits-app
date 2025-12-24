/**
 * Activity Service - Tracks user activities for social proof on landing page
 * 
 * This service logs notable user achievements that can be displayed
 * on the landing page as real-time social proof notifications.
 */

import { db } from '@/config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';

// Activity types that can be logged
export type ActivityType = 
  | 'started_practicing'
  | 'completed_questions'
  | 'rank_up'
  | 'high_accuracy'
  | 'topic_mastered'
  | 'streak_achieved'
  | 'xp_milestone';

// Activity data structure
export interface Activity {
  id?: string;
  type: ActivityType;
  userId: string;
  displayName: string; // First name or anonymous
  country?: string;
  countryCode?: string;
  message: string; // Pre-formatted message for display
  metadata?: Record<string, any>; // Additional data (rank name, XP amount, etc.)
  createdAt: Timestamp | Date;
  isPublic: boolean; // Whether to show on landing page
}

// Collection name
const ACTIVITIES_COLLECTION = 'activities';

// Get user's approximate location from their timezone
const getCountryFromTimezone = (): { country: string; code: string } => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map common timezones to countries
    const timezoneToCountry: Record<string, { country: string; code: string }> = {
      // Americas
      'America/New_York': { country: 'United States', code: 'US' },
      'America/Los_Angeles': { country: 'United States', code: 'US' },
      'America/Chicago': { country: 'United States', code: 'US' },
      'America/Denver': { country: 'United States', code: 'US' },
      'America/Toronto': { country: 'Canada', code: 'CA' },
      'America/Vancouver': { country: 'Canada', code: 'CA' },
      'America/Mexico_City': { country: 'Mexico', code: 'MX' },
      'America/Sao_Paulo': { country: 'Brazil', code: 'BR' },
      'America/Argentina/Buenos_Aires': { country: 'Argentina', code: 'AR' },
      
      // Europe
      'Europe/London': { country: 'United Kingdom', code: 'GB' },
      'Europe/Paris': { country: 'France', code: 'FR' },
      'Europe/Berlin': { country: 'Germany', code: 'DE' },
      'Europe/Madrid': { country: 'Spain', code: 'ES' },
      'Europe/Rome': { country: 'Italy', code: 'IT' },
      'Europe/Amsterdam': { country: 'Netherlands', code: 'NL' },
      'Europe/Stockholm': { country: 'Sweden', code: 'SE' },
      'Europe/Warsaw': { country: 'Poland', code: 'PL' },
      'Europe/Moscow': { country: 'Russia', code: 'RU' },
      
      // Asia
      'Asia/Tokyo': { country: 'Japan', code: 'JP' },
      'Asia/Shanghai': { country: 'China', code: 'CN' },
      'Asia/Hong_Kong': { country: 'Hong Kong', code: 'HK' },
      'Asia/Singapore': { country: 'Singapore', code: 'SG' },
      'Asia/Seoul': { country: 'South Korea', code: 'KR' },
      'Asia/Kolkata': { country: 'India', code: 'IN' },
      'Asia/Mumbai': { country: 'India', code: 'IN' },
      'Asia/Dubai': { country: 'UAE', code: 'AE' },
      'Asia/Jakarta': { country: 'Indonesia', code: 'ID' },
      'Asia/Manila': { country: 'Philippines', code: 'PH' },
      'Asia/Bangkok': { country: 'Thailand', code: 'TH' },
      'Asia/Karachi': { country: 'Pakistan', code: 'PK' },
      
      // Oceania
      'Australia/Sydney': { country: 'Australia', code: 'AU' },
      'Australia/Melbourne': { country: 'Australia', code: 'AU' },
      'Pacific/Auckland': { country: 'New Zealand', code: 'NZ' },
      
      // Africa
      'Africa/Cairo': { country: 'Egypt', code: 'EG' },
      'Africa/Johannesburg': { country: 'South Africa', code: 'ZA' },
      'Africa/Lagos': { country: 'Nigeria', code: 'NG' },
    };

    return timezoneToCountry[timezone] || { country: 'Unknown', code: 'XX' };
  } catch {
    return { country: 'Unknown', code: 'XX' };
  }
};

// Get display name from user (first name only for privacy)
const getDisplayName = (name?: string | null): string => {
  if (!name) {
    // Generate anonymous name
    const adjectives = ['Happy', 'Swift', 'Clever', 'Bright', 'Quick'];
    const nouns = ['Coder', 'Dev', 'Hacker', 'Engineer', 'Programmer'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
  
  // Get first name only
  const firstName = name.split(' ')[0];
  return firstName.length > 15 ? firstName.substring(0, 15) : firstName;
};

/**
 * Log an activity to Firestore
 */
export const logActivity = async (
  type: ActivityType,
  userId: string,
  userName: string | null | undefined,
  message: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const location = getCountryFromTimezone();
    const displayName = getDisplayName(userName);

    // Build activity object, excluding undefined fields
    const activity: Record<string, any> = {
      type,
      userId,
      displayName,
      country: location.country,
      countryCode: location.code,
      message,
      createdAt: serverTimestamp(),
      isPublic: true,
    };

    // Only add metadata if it's defined and not empty
    if (metadata && Object.keys(metadata).length > 0) {
      activity.metadata = metadata;
    }

    await addDoc(collection(db, ACTIVITIES_COLLECTION), activity);
    console.log('📣 Activity logged:', type, message);
  } catch (error) {
    // Don't throw - activity logging shouldn't break the app
    console.error('Error logging activity:', error);
  }
};

/**
 * Get recent public activities for the landing page
 */
export const getRecentActivities = async (maxResults: number = 20): Promise<Activity[]> => {
  try {
    const q = query(
      collection(db, ACTIVITIES_COLLECTION),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Activity));
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

// ============================================
// HELPER FUNCTIONS FOR SPECIFIC ACTIVITIES
// ============================================

/**
 * Log when a user starts a practice session
 */
export const logStartedPracticing = async (
  userId: string,
  userName: string | null | undefined
): Promise<void> => {
  await logActivity(
    'started_practicing',
    userId,
    userName,
    'started a practice session'
  );
};

/**
 * Log when a user completes a milestone of questions
 */
export const logQuestionsCompleted = async (
  userId: string,
  userName: string | null | undefined,
  count: number
): Promise<void> => {
  await logActivity(
    'completed_questions',
    userId,
    userName,
    `completed ${count} questions`,
    { count }
  );
};

/**
 * Log when a user ranks up
 */
export const logRankUp = async (
  userId: string,
  userName: string | null | undefined,
  rankName: string
): Promise<void> => {
  await logActivity(
    'rank_up',
    userId,
    userName,
    `reached ${rankName} rank`,
    { rankName }
  );
};

/**
 * Log when a user achieves high accuracy
 */
export const logHighAccuracy = async (
  userId: string,
  userName: string | null | undefined,
  accuracy: number
): Promise<void> => {
  await logActivity(
    'high_accuracy',
    userId,
    userName,
    `achieved ${accuracy}% accuracy`,
    { accuracy }
  );
};

/**
 * Log when a user masters a topic
 */
export const logTopicMastered = async (
  userId: string,
  userName: string | null | undefined,
  topic: string
): Promise<void> => {
  await logActivity(
    'topic_mastered',
    userId,
    userName,
    `mastered ${topic}`,
    { topic }
  );
};

/**
 * Log when a user reaches an XP milestone
 */
export const logXPMilestone = async (
  userId: string,
  userName: string | null | undefined,
  xp: number
): Promise<void> => {
  await logActivity(
    'xp_milestone',
    userId,
    userName,
    `earned ${xp} XP`,
    { xp }
  );
};

