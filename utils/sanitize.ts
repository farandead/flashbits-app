/**
 * Input Sanitization Utilities
 * 
 * Provides sanitization functions for user input to prevent XSS attacks
 * and ensure data integrity.
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * and limiting length. Safe for React Native Text components.
 * 
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string
 */
export const sanitizeString = (input: string | null | undefined, maxLength: number = 100): string => {
  if (!input) return '';
  
  // Convert to string and trim
  let sanitized = String(input).trim();
  
  // Remove control characters (except newlines, tabs, carriage returns)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitize a name (for user profiles, display names, etc.)
 * More restrictive than general string sanitization
 * 
 * @param name - The name to sanitize
 * @param maxLength - Maximum allowed length (default: 50)
 * @returns Sanitized name
 */
export const sanitizeName = (name: string | null | undefined, maxLength: number = 50): string => {
  if (!name) return '';
  
  let sanitized = String(name).trim();
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitize an email address
 * Validates basic email format and removes dangerous characters
 * 
 * @param email - The email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  
  let sanitized = String(email).trim().toLowerCase();
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Basic email validation (simple check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }
  
  // Limit length (RFC 5321 limit is 320 characters)
  if (sanitized.length > 254) {
    sanitized = sanitized.substring(0, 254);
  }
  
  return sanitized;
};

/**
 * Sanitize a URL
 * Validates and sanitizes URLs to prevent javascript: and data: schemes
 * 
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  let sanitized = String(url).trim();
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Block dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = sanitized.toLowerCase();
  
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return '';
    }
  }
  
  // Only allow http, https, and app schemes
  const allowedSchemes = ['http://', 'https://', 'flashbits://'];
  const hasAllowedScheme = allowedSchemes.some(scheme => 
    lowerUrl.startsWith(scheme)
  );
  
  if (!hasAllowedScheme && !lowerUrl.startsWith('/')) {
    return '';
  }
  
  return sanitized;
};

/**
 * Validate and sanitize user profile data
 * 
 * @param profile - User profile object
 * @returns Sanitized profile object
 */
export const sanitizeUserProfile = (profile: {
  name?: string | null;
  email?: string | null;
  occupation?: string | null;
  goals?: string[] | null;
  codingLevel?: string | null;
  [key: string]: any;
}): typeof profile => {
  const sanitized = { ...profile };
  
  if (sanitized.name) {
    sanitized.name = sanitizeName(sanitized.name);
  }
  
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  
  if (sanitized.occupation) {
    sanitized.occupation = sanitizeString(sanitized.occupation, 50);
  }
  
  if (sanitized.codingLevel) {
    sanitized.codingLevel = sanitizeString(sanitized.codingLevel, 50);
  }
  
  // Sanitize goals array
  if (Array.isArray(sanitized.goals)) {
    sanitized.goals = sanitized.goals
      .map(goal => sanitizeString(goal, 100))
      .filter(goal => goal.length > 0); // Remove empty goals
  }
  
  return sanitized;
};

