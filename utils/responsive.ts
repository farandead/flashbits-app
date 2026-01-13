/**
 * Responsive Design Utilities for iPad Support
 * 
 * Follows Apple Human Interface Guidelines:
 * - Content width constraints for optimal readability (max 600-700px on portrait, 900px on landscape)
 * - Increased padding on larger screens (minimum 80px on iPad)
 * - Centered layouts for better visual balance
 * - Proper touch target sizes (minimum 44x44 points)
 * 
 * NOTE: iPad uses landscape mode, iPhone uses portrait mode
 */

import { Dimensions, Platform, StyleSheet, ViewStyle } from 'react-native';

/**
 * Get current screen dimensions
 * Call this when you need fresh dimensions (e.g., after orientation change)
 */
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Initial dimensions - these are cached values, use getScreenDimensions() for fresh values
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Maximum content width for optimal readability on iPad
 * Following Apple HIG: text should not exceed 600-700px for comfortable reading
 * For landscape iPad, we can use a wider content area
 */
export const MAX_CONTENT_WIDTH = 600;
export const MAX_CONTENT_WIDTH_LARGE = 700;
export const MAX_CONTENT_WIDTH_LANDSCAPE = 900; // For iPad landscape mode

/**
 * Minimum width to consider a device as a tablet/iPad
 * iPad Mini: 768x1024, iPad Air/Pro: 820x1180 or larger
 */
const TABLET_MIN_WIDTH = 768;
const TABLET_MIN_HEIGHT = 1024;

/**
 * Detects if the current device is an iPad or tablet-sized device
 * Uses screen dimensions as the primary indicator
 */
export const isTablet = (): boolean => {
  const { width, height } = getScreenDimensions();
  // On iOS, check if it's iPad based on the smaller dimension
  if (Platform.OS === 'ios') {
    // iPad detection: smaller dimension >= 768 or larger dimension >= 1024
    return Math.min(width, height) >= TABLET_MIN_WIDTH || Math.max(width, height) >= TABLET_MIN_HEIGHT;
  }

  // For Android, use similar logic
  return Math.min(width, height) >= TABLET_MIN_WIDTH || Math.max(width, height) >= TABLET_MIN_HEIGHT;
};

/**
 * Detects if the device is currently in landscape orientation
 */
export const isLandscape = (): boolean => {
  const { width, height } = getScreenDimensions();
  return width > height;
};

/**
 * Detects if the screen is considered "large" (wider than 768px)
 * Useful for responsive padding and layout adjustments
 */
export const isLargeScreen = (): boolean => {
  const { width } = getScreenDimensions();
  return width >= TABLET_MIN_WIDTH;
};

/**
 * Gets the appropriate max content width based on device and orientation
 * iPad in landscape uses a wider content area
 */
export const getMaxContentWidth = (): number => {
  if (isTablet() && isLandscape()) {
    return MAX_CONTENT_WIDTH_LANDSCAPE;
  }
  if (isTablet()) {
    return MAX_CONTENT_WIDTH_LARGE;
  }
  return MAX_CONTENT_WIDTH;
};

/**
 * Gets responsive horizontal padding
 * Following Apple HIG: iPad should have increased padding (minimum 80px)
 * In landscape mode, we may want even more padding to center content
 * 
 * @param basePadding - Base padding value (typically from theme.spacing)
 * @returns Responsive padding value
 */
export const getResponsiveHorizontalPadding = (basePadding: number): number => {
  if (isTablet()) {
    if (isLandscape()) {
      // In landscape, use more padding to center content nicely
      return Math.max(basePadding * 2.5, 100);
    }
    // On iPad portrait (if ever enabled), use 2x base padding with minimum of 80px
    return Math.max(basePadding * 2, 80);
  }
  return basePadding;
};

/**
 * Gets responsive vertical padding
 * Slightly increased on iPad for better spacing
 * 
 * @param basePadding - Base padding value
 * @returns Responsive padding value
 */
export const getResponsiveVerticalPadding = (basePadding: number): number => {
  if (isTablet()) {
    if (isLandscape()) {
      // In landscape, vertical space is more limited, use slightly less padding
      return Math.max(basePadding * 1.2, 32);
    }
    return Math.max(basePadding * 1.5, 40);
  }
  return basePadding;
};

/**
 * Creates a centered container style with max-width constraint
 * Following Apple HIG: content should be centered and constrained on iPad
 * 
 * @param maxWidth - Maximum width for the container (default: auto-detect based on orientation)
 * @returns Style object for centered container
 */
export const getCenteredContainerStyle = (maxWidth?: number): ViewStyle => {
  if (isTablet()) {
    const effectiveMaxWidth = maxWidth ?? getMaxContentWidth();
    return {
      maxWidth: effectiveMaxWidth,
      width: '100%',
      alignSelf: 'center',
    };
  }
  return {
    width: '100%',
  };
};

/**
 * Gets responsive font size
 * Slightly larger on iPad for better readability
 * 
 * @param baseSize - Base font size
 * @returns Responsive font size
 */
export const getResponsiveFontSize = (baseSize: number): number => {
  if (isTablet()) {
    // Increase by ~10% on iPad
    return Math.round(baseSize * 1.1);
  }
  return baseSize;
};

/**
 * Gets responsive spacing
 * Increased spacing on iPad for better visual hierarchy
 * 
 * @param baseSpacing - Base spacing value
 * @returns Responsive spacing value
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  if (isTablet()) {
    if (isLandscape()) {
      // In landscape, we have less vertical space, use slightly less scaling
      return Math.round(baseSpacing * 1.15);
    }
    return Math.round(baseSpacing * 1.25);
  }
  return baseSpacing;
};

/**
 * Gets minimum touch target size
 * Following Apple HIG: minimum 44x44 points for touch targets
 * 
 * @returns Minimum touch target size
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Ensures a touch target meets minimum size requirements
 * 
 * @param size - Current size
 * @returns Size that meets minimum requirements
 */
export const ensureMinTouchTarget = (size: number): number => {
  return Math.max(size, MIN_TOUCH_TARGET);
};

/**
 * Gets responsive card width
 * Cards should be appropriately sized on iPad
 * 
 * @param baseWidth - Base card width
 * @returns Responsive card width
 */
export const getResponsiveCardWidth = (baseWidth: number): number => {
  if (isTablet()) {
    const maxWidth = getMaxContentWidth();
    // On iPad, cards can be slightly wider but still constrained
    return Math.min(baseWidth * 1.2, maxWidth);
  }
  return baseWidth;
};

/**
 * Gets responsive grid columns
 * More columns on iPad for better use of screen space
 * 
 * @param baseColumns - Base number of columns
 * @returns Responsive number of columns
 */
export const getResponsiveGridColumns = (baseColumns: number): number => {
  if (isTablet()) {
    if (isLandscape()) {
      // In landscape, we have more horizontal space, can use more columns
      return baseColumns === 1 ? 3 : baseColumns + 1;
    }
    // On iPad portrait, use 2 columns if base is 1, otherwise keep the same
    return baseColumns === 1 ? 2 : baseColumns;
  }
  return baseColumns;
};

/**
 * Screen dimensions helper - use getScreenDimensions() for fresh values
 * These are cached values from initial load
 */
export const screenDimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isTablet: isTablet(),
  isLargeScreen: isLargeScreen(),
  isLandscape: isLandscape(),
};

