/**
 * User Profile Validation Utilities
 * 
 * Validates user profile data before saving to Firestore
 * Throws errors for invalid data to prevent malicious input
 */

import { UserProfile } from '@/services/userService';

// Validation constants
const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 1,
  OCCUPATION_MAX_LENGTH: 100,
  OCCUPATION_MIN_LENGTH: 1,
  CODING_LEVEL_MAX_LENGTH: 50,
  GOAL_MAX_LENGTH: 100,
  GOALS_MAX_COUNT: 20,
  GOALS_MIN_COUNT: 0,
} as const;

// Valid coding levels
const VALID_CODING_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const;

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate name field
 */
const validateName = (name: string | null | undefined): void => {
  if (!name) {
    throw new ValidationError('Name is required', 'name');
  }

  const trimmed = String(name).trim();
  
  if (trimmed.length < VALIDATION_LIMITS.NAME_MIN_LENGTH) {
    throw new ValidationError(
      `Name must be at least ${VALIDATION_LIMITS.NAME_MIN_LENGTH} character${VALIDATION_LIMITS.NAME_MIN_LENGTH !== 1 ? 's' : ''}`,
      'name'
    );
  }

  if (trimmed.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Name must be no more than ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`,
      'name'
    );
  }

  // Check for only whitespace
  if (trimmed.length === 0 || /^\s+$/.test(trimmed)) {
    throw new ValidationError('Name cannot be only whitespace', 'name');
  }
};

/**
 * Validate occupation field
 */
const validateOccupation = (occupation: string | null | undefined): void => {
  if (!occupation) {
    throw new ValidationError('Occupation is required', 'occupation');
  }

  const trimmed = String(occupation).trim();
  
  if (trimmed.length < VALIDATION_LIMITS.OCCUPATION_MIN_LENGTH) {
    throw new ValidationError(
      `Occupation must be at least ${VALIDATION_LIMITS.OCCUPATION_MIN_LENGTH} character${VALIDATION_LIMITS.OCCUPATION_MIN_LENGTH !== 1 ? 's' : ''}`,
      'occupation'
    );
  }

  if (trimmed.length > VALIDATION_LIMITS.OCCUPATION_MAX_LENGTH) {
    throw new ValidationError(
      `Occupation must be no more than ${VALIDATION_LIMITS.OCCUPATION_MAX_LENGTH} characters`,
      'occupation'
    );
  }

  // Check for only whitespace
  if (trimmed.length === 0 || /^\s+$/.test(trimmed)) {
    throw new ValidationError('Occupation cannot be only whitespace', 'occupation');
  }
};

/**
 * Validate coding level field
 */
const validateCodingLevel = (codingLevel: string | null | undefined): void => {
  if (!codingLevel) {
    throw new ValidationError('Coding level is required', 'codingLevel');
  }

  const trimmed = String(codingLevel).trim().toLowerCase();
  
  if (trimmed.length > VALIDATION_LIMITS.CODING_LEVEL_MAX_LENGTH) {
    throw new ValidationError(
      `Coding level must be no more than ${VALIDATION_LIMITS.CODING_LEVEL_MAX_LENGTH} characters`,
      'codingLevel'
    );
  }

  // Check if it's a valid coding level (case-insensitive)
  const isValidLevel = VALID_CODING_LEVELS.some(
    level => level.toLowerCase() === trimmed
  );
  
  if (!isValidLevel && trimmed.length > 0) {
    // Allow custom levels but warn (or you can throw error to enforce strict values)
    // For now, we'll allow custom levels but validate length
  }
};

/**
 * Validate goals array
 */
const validateGoals = (goals: string[] | null | undefined): void => {
  if (!goals) {
    return; // Goals are optional
  }

  if (!Array.isArray(goals)) {
    throw new ValidationError('Goals must be an array', 'goals');
  }

  if (goals.length > VALIDATION_LIMITS.GOALS_MAX_COUNT) {
    throw new ValidationError(
      `Maximum ${VALIDATION_LIMITS.GOALS_MAX_COUNT} goals allowed`,
      'goals'
    );
  }

  if (goals.length < VALIDATION_LIMITS.GOALS_MIN_COUNT) {
    throw new ValidationError(
      `Minimum ${VALIDATION_LIMITS.GOALS_MIN_COUNT} goals required`,
      'goals'
    );
  }

  // Validate each goal
  goals.forEach((goal, index) => {
    if (typeof goal !== 'string') {
      throw new ValidationError(
        `Goal at index ${index} must be a string`,
        'goals'
      );
    }

    const trimmed = String(goal).trim();
    
    if (trimmed.length === 0) {
      throw new ValidationError(
        `Goal at index ${index} cannot be empty`,
        'goals'
      );
    }

    if (trimmed.length > VALIDATION_LIMITS.GOAL_MAX_LENGTH) {
      throw new ValidationError(
        `Goal at index ${index} must be no more than ${VALIDATION_LIMITS.GOAL_MAX_LENGTH} characters`,
        'goals'
      );
    }
  });

  // Check for duplicate goals (case-insensitive)
  const lowerGoals = goals.map(g => String(g).trim().toLowerCase());
  const uniqueGoals = new Set(lowerGoals);
  if (uniqueGoals.size !== lowerGoals.length) {
    throw new ValidationError('Goals must be unique', 'goals');
  }
};

/**
 * Validate numeric fields
 */
const validateNumericField = (
  value: number | null | undefined,
  fieldName: string,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): void => {
  if (value === null || value === undefined) {
    return; // Optional field
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName);
  }

  if (value < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min}`,
      fieldName
    );
  }

  if (value > max) {
    throw new ValidationError(
      `${fieldName} must be no more than ${max}`,
      fieldName
    );
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName);
  }
};

/**
 * Validate boolean fields
 */
const validateBooleanField = (
  value: boolean | null | undefined,
  fieldName: string
): void => {
  if (value === null || value === undefined) {
    return; // Optional field
  }

  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} must be a boolean`, fieldName);
  }
};

/**
 * Validate string date fields
 */
const validateDateString = (
  dateString: string | null | undefined,
  fieldName: string
): void => {
  if (!dateString) {
    return; // Optional field
  }

  if (typeof dateString !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date string`, fieldName);
  }
};

/**
 * Validate a complete user profile
 * 
 * @param profile - User profile to validate
 * @param isPartial - If true, only validate provided fields (for updates)
 * @throws ValidationError if validation fails
 */
export const validateUserProfile = (
  profile: Partial<UserProfile>,
  isPartial: boolean = false
): void => {
  // Validate required fields (only for full profiles)
  if (!isPartial) {
    if (!profile.name) {
      throw new ValidationError('Name is required', 'name');
    }
    if (!profile.occupation) {
      throw new ValidationError('Occupation is required', 'occupation');
    }
    if (!profile.codingLevel) {
      throw new ValidationError('Coding level is required', 'codingLevel');
    }
    if (!profile.goals || !Array.isArray(profile.goals) || profile.goals.length === 0) {
      throw new ValidationError('At least one goal is required', 'goals');
    }
    if (profile.onboardingCompleted === undefined) {
      throw new ValidationError('Onboarding status is required', 'onboardingCompleted');
    }
    if (!profile.createdAt) {
      throw new ValidationError('Created date is required', 'createdAt');
    }
  }

  // Validate individual fields if provided
  if (profile.name !== undefined) {
    validateName(profile.name);
  }

  if (profile.occupation !== undefined) {
    validateOccupation(profile.occupation);
  }

  if (profile.codingLevel !== undefined) {
    validateCodingLevel(profile.codingLevel);
  }

  if (profile.goals !== undefined) {
    validateGoals(profile.goals);
  }

  // Validate optional numeric fields
  if (profile.xp !== undefined) {
    validateNumericField(profile.xp, 'xp', 0, 1000000); // Max 1M XP
  }

  if (profile.questionsAnswered !== undefined) {
    validateNumericField(profile.questionsAnswered, 'questionsAnswered', 0, 100000); // Max 100K questions
  }

  // Validate optional boolean fields
  if (profile.isPro !== undefined) {
    validateBooleanField(profile.isPro, 'isPro');
  }

  if (profile.onboardingCompleted !== undefined) {
    validateBooleanField(profile.onboardingCompleted, 'onboardingCompleted');
  }

  // Validate optional date fields
  if (profile.createdAt !== undefined) {
    validateDateString(profile.createdAt, 'createdAt');
  }

  if (profile.updatedAt !== undefined) {
    validateDateString(profile.updatedAt, 'updatedAt');
  }

  if (profile.proExpiresAt !== undefined) {
    validateDateString(profile.proExpiresAt, 'proExpiresAt');
  }
};

