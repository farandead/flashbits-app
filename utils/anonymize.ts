/**
 * Anonymization Utilities
 * 
 * Provides functions to anonymize user identifiers for privacy
 */

/**
 * Create a one-way hash of a userId for analytics
 * Uses a simple hash function (not cryptographically secure, but sufficient for anonymization)
 * 
 * @param userId - The user ID to hash
 * @returns Hashed user ID (first 16 characters for privacy)
 */
export const hashUserId = (userId: string): string => {
  // Simple hash function (FNV-1a variant)
  let hash = 2166136261; // FNV offset basis
  
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  // Convert to hex and take first 16 chars for privacy
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');
  return hexHash.substring(0, 16);
};

/**
 * Check if a string looks like a Firebase Auth UID
 * Firebase UIDs are 28 characters long and contain alphanumeric characters
 */
const isFirebaseUID = (str: string): boolean => {
  return /^[a-zA-Z0-9]{28}$/.test(str);
};

/**
 * Anonymize a user ID for public display
 * If it's a Firebase UID, hash it. Otherwise, return as-is (already anonymized)
 * 
 * @param userId - The user ID to anonymize
 * @returns Anonymized user identifier
 */
export const anonymizeUserId = (userId: string): string => {
  if (!userId) return '';
  
  // If it looks like a Firebase UID, hash it
  if (isFirebaseUID(userId)) {
    return hashUserId(userId);
  }
  
  // Otherwise, assume it's already anonymized
  return userId;
};

