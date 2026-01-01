/**
 * Debug Utility
 * 
 * Toggle DEBUG_ENABLED to turn all debug logging on/off
 * You can also toggle individual categories
 */

// Master switch - set to false to disable all debug logging
const DEBUG_ENABLED = false;

// Category toggles - enable/disable specific debug areas
const DEBUG_CATEGORIES = {
  auth: true,        // Authentication & login flow
  firebase: true,    // Firebase operations
  settings: true,    // Settings persistence
  navigation: false,  // Screen navigation
  questions: true,   // Question loading & filtering
  storage: true,     // AsyncStorage operations
  api: true,         // API calls
  ui: false,          // UI state changes
  revenueCat: true,   // RevenueCat operations
  feed: true,         // Feed operations
  cache: true,       // Cache operations (hits, misses, writes)
  stats: true,       // User stats operations
  network: true,     // Network connectivity & offline mode
  sync: true,        // Data synchronization operations
  offline: true,     // Offline storage operations
};

type DebugCategory = keyof typeof DEBUG_CATEGORIES;

// Color codes for different categories (for better visibility in console)
const CATEGORY_EMOJIS: Record<DebugCategory, string> = {
  auth: '🔐',
  firebase: '🔥',
  settings: '⚙️',
  navigation: '🧭',
  questions: '❓',
  storage: '🗄️',
  api: '🌐',
  ui: '🎨',
  revenueCat: '💰',
  feed: '🔄',
  cache: '💾',
  stats: '📊',
  network: '📡',
  sync: '🔄',
  offline: '💾',
};

/**
 * Debug log function
 * Only logs if DEBUG_ENABLED is true and the category is enabled
 */
export const debug = (category: DebugCategory, message: string, ...args: any[]) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) return;
  
  const emoji = CATEGORY_EMOJIS[category];
  const prefix = `${emoji} [${category.toUpperCase()}]`;
  
  console.log(prefix, message, ...args);
};

/**
 * Debug warn function
 */
export const debugWarn = (category: DebugCategory, message: string, ...args: any[]) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) return;
  
  const emoji = CATEGORY_EMOJIS[category];
  const prefix = `${emoji} [${category.toUpperCase()}] ⚠️`;
  
  console.warn(prefix, message, ...args);
};

/**
 * Debug error function (always logs errors, but with category prefix when debug is on)
 */
export const debugError = (category: DebugCategory, message: string, ...args: any[]) => {
  const emoji = CATEGORY_EMOJIS[category];
  const prefix = `${emoji} [${category.toUpperCase()}] ❌`;
  
  console.error(prefix, message, ...args);
};

/**
 * Debug success function
 */
export const debugSuccess = (category: DebugCategory, message: string, ...args: any[]) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) return;
  
  const emoji = CATEGORY_EMOJIS[category];
  const prefix = `${emoji} [${category.toUpperCase()}] ✅`;
  
  console.log(prefix, message, ...args);
};

/**
 * Check if debugging is enabled for a category
 */
export const isDebugEnabled = (category?: DebugCategory): boolean => {
  if (!DEBUG_ENABLED) return false;
  if (!category) return true;
  return DEBUG_CATEGORIES[category];
};

/**
 * Log a group of related debug messages
 */
export const debugGroup = (category: DebugCategory, groupName: string, callback: () => void) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) return;
  
  const emoji = CATEGORY_EMOJIS[category];
  console.group(`${emoji} [${category.toUpperCase()}] ${groupName}`);
  callback();
  console.groupEnd();
};

/**
 * Log an object in a formatted way
 */
export const debugObject = (category: DebugCategory, label: string, obj: any) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) return;
  
  const emoji = CATEGORY_EMOJIS[category];
  console.log(`${emoji} [${category.toUpperCase()}] ${label}:`, JSON.stringify(obj, null, 2));
};

export default {
  log: debug,
  warn: debugWarn,
  error: debugError,
  success: debugSuccess,
  group: debugGroup,
  object: debugObject,
  isEnabled: isDebugEnabled,
};

