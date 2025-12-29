// flashbits Theme - Dark mode with cyber-green accents
// Inspired by terminal aesthetics × modern design

export const colors = {
  // Core backgrounds
  background: '#0A0A0B',
  backgroundSecondary: '#111113',
  card: '#161618',
  cardElevated: '#1C1C1F',
  
  // Primary accent - Cyber green
  primary: '#00FF94',
  primaryMuted: '#00CC76',
  primaryGlow: 'rgba(0, 255, 148, 0.15)',
  primaryGlowStrong: 'rgba(0, 255, 148, 0.3)',
  
  // Secondary accent - Electric blue
  secondary: '#00D4FF',
  secondaryMuted: '#00A8CC',
  
  // Feedback colors
  correct: '#00FF94',
  correctBg: 'rgba(0, 255, 148, 0.12)',
  incorrect: '#FF4D6A',
  incorrectBg: 'rgba(255, 77, 106, 0.12)',
  warning: '#FFB800',
  warningBg: 'rgba(255, 184, 0, 0.12)',
  
  // Text hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A8',
  textMuted: '#606068',
  textInverse: '#0A0A0B',
  
  // Borders
  border: '#2A2A2E',
  borderFocus: '#00FF94',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  
  // Card backgrounds (semi-transparent white for subtle elevation)
  cardSubtle: 'rgba(255, 255, 255, 0.03)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  
  // Topic badges
  topicArrays: '#FF6B6B',
  topicHashmaps: '#4ECDC4',
  topicStrings: '#FFE66D',
  topicTrees: '#95E1D3',
  topicGraphs: '#DDA0DD',
  topicDP: '#F38181',
  topicLinkedList: '#AA96DA',
  topicRecursion: '#FCE38A',
};

export const typography = {
  // Font families - Using system fonts for reliability
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'SpaceMono',
  },
  
  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

