/**
 * StreakFire Component
 * 
 * Professional, minimalist streak indicator
 * Clean design matching the app's cyber theme
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StreakFireProps {
  streak: number;
  isActive: boolean;
  showCelebration?: boolean;
  onCelebrationComplete?: () => void;
}

// Intensity levels for visual scaling
const getIntensity = (streak: number): 'base' | 'hot' | 'blazing' | 'legendary' => {
  if (streak >= 20) return 'legendary';
  if (streak >= 10) return 'blazing';
  if (streak >= 5) return 'hot';
  return 'base';
};

// Color schemes for different intensities
const INTENSITY_COLORS = {
  base: {
    primary: '#FF6B00',
    secondary: '#FF4500',
    gradient: ['#FF6B00', '#FF4500'] as const,
  },
  hot: {
    primary: '#FF8C00',
    secondary: '#FF5500',
    gradient: ['#FFD700', '#FF6B00'] as const,
  },
  blazing: {
    primary: '#FFD700',
    secondary: '#FF8C00',
    gradient: ['#FFFFFF', '#FFD700'] as const,
  },
  legendary: {
    primary: colors.primary,
    secondary: '#00D4FF',
    gradient: [colors.primary, '#00D4FF'] as const,
  },
};

// This component is now mostly used for milestones only
// The main streak indicator is inline in feed.tsx
export const StreakFire: React.FC<StreakFireProps> = ({
  streak,
  isActive,
  showCelebration = false,
  onCelebrationComplete,
}) => {
  const scale = useSharedValue(1);
  
  const intensity = getIntensity(streak);
  const colorScheme = INTENSITY_COLORS[intensity];

  useEffect(() => {
    if (showCelebration) {
      // Gentle scale animation
      scale.value = withSpring(1.08, { 
        damping: 15, 
        stiffness: 100,
      });
      
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 100 });
      }, 300);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (onCelebrationComplete) {
        setTimeout(onCelebrationComplete, 500);
      }
    }
  }, [showCelebration]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[styles.container, containerStyle]}
    >
      <View style={[styles.badge, { borderColor: colorScheme.primary }]}>
        <Ionicons name="flame" size={14} color={colorScheme.primary} />
        <Text style={[styles.count, { color: colorScheme.primary }]}>{streak}</Text>
      </View>
    </Animated.View>
  );
};

// Streak broken component - minimal floating toast
export const StreakBroken: React.FC<{
  previousStreak: number;
  onComplete?: () => void;
}> = ({ previousStreak, onComplete }) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Slide in from top - slower, smoother
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss - starts fading out at 1.5 seconds
    const timer = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 400, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 });
    }, 1500);

    if (onComplete) {
      setTimeout(onComplete, 2000);
    }

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.brokenToast, animatedStyle]}>
      <Ionicons name="flame-outline" size={16} color={colors.textMuted} />
      <Text style={styles.brokenText}>Streak ended</Text>
      <Text style={styles.brokenCount}>{previousStreak}</Text>
    </Animated.View>
  );
};

// Streak milestone celebration - minimal floating toast
export const StreakMilestone: React.FC<{
  streak: number;
  nextMilestone?: number | null;
  onComplete?: () => void;
}> = ({ streak, nextMilestone, onComplete }) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Slide in from top - slower, smoother
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss - starts fading out at 2 seconds
    const timer = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 400, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 });
    }, 2000);

    if (onComplete) {
      setTimeout(onComplete, 2500);
    }

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getColor = (): string => {
    if (streak >= 50) return '#FFD700';
    if (streak >= 25) return '#00D4FF';
    if (streak >= 20) return '#FF6B00';
    if (streak >= 10) return colors.primary;
    return '#FF8C00';
  };

  const color = getColor();

  return (
    <Animated.View style={[styles.milestoneToast, animatedStyle]}>
      <View style={styles.milestoneContent}>
        <Ionicons name="flame" size={18} color={color} />
        <Text style={[styles.milestoneCount, { color }]}>{streak}</Text>
        <View style={[styles.milestoneDivider, { backgroundColor: color }]} />
        <Text style={styles.milestoneText}>streak</Text>
      </View>
      {nextMilestone && (
        <Text style={styles.nextMilestoneHint}>
          Next milestone: {nextMilestone}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Compact badge style
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  count: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Streak broken toast styles
  brokenToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  brokenText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  brokenCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Milestone toast styles
  milestoneToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },
  milestoneDivider: {
    width: 1,
    height: 16,
    opacity: 0.3,
  },
  milestoneText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextMilestoneHint: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // XP Earned Toast styles
  xpToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 1000,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xpToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpToastText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: '#FFD700',
  },
  streakMultiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  streakMultiplierText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: '#FF6B00',
  },

  // Previously Solved Info Toast styles
  previouslySolvedToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  previouslySolvedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previouslySolvedText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  backOnlineToast: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.correct,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backOnlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  backOnlineText: {
    color: colors.textInverse,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});

// XP Earned Toast - shows when user earns XP
export const XPEarned: React.FC<{
  amount?: number;
  streakMultiplier?: number;
  onComplete?: () => void;
}> = ({ amount = 1, streakMultiplier = 0, onComplete }) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Slide in from top with scale animation
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });

    // Auto dismiss - starts fading out at 1.5 seconds
    const timer = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 400, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
    }, 1500);

    if (onComplete) {
      setTimeout(onComplete, 2000);
    }

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.xpToast, animatedStyle]}>
      <View style={styles.xpToastContent}>
        <Ionicons name="flash" size={16} color="#FFD700" />
        <Text style={styles.xpToastText}>+{amount} XP</Text>
        {streakMultiplier > 0 && (
          <View style={styles.streakMultiplierBadge}>
            <Ionicons name="flame" size={12} color="#FF6B00" />
            <Text style={styles.streakMultiplierText}>x{streakMultiplier}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Previously Solved Info Toast - explains why XP/streak didn't increment
export const PreviouslySolvedInfo: React.FC<{
  onComplete?: () => void;
}> = ({ onComplete }) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Slide in from top with scale animation
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });

    // Auto dismiss - starts fading out at 2.5 seconds (longer for reading)
    const timer = setTimeout(() => {
      translateY.value = withTiming(-100, { duration: 400, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
    }, 1000);

    if (onComplete) {
      setTimeout(onComplete, 3000);
    }

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.previouslySolvedToast, animatedStyle]}>
      <View style={styles.previouslySolvedContent}>
        <Ionicons name="information-circle" size={16} color={colors.textMuted} />
        <Text style={styles.previouslySolvedText}>
          Previously solved - no XP or streak
        </Text>
      </View>
    </Animated.View>
  );
};

// Back Online Toast - shows when user comes back online
// Matches the style of OfflineIndicator
export const BackOnlineToast: React.FC<{
  queuedItems?: number;
  onComplete?: () => void;
}> = ({ queuedItems = 0, onComplete }) => {
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const insets = useSafeAreaInsets();
  const [slideAnim] = React.useState(new RNAnimated.Value(-100));

  React.useEffect(() => {
    // Simple slide down animation (matches OfflineIndicator)
    RNAnimated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Auto dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      RNAnimated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
      
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RNAnimated.View
      style={[
        styles.backOnlineToast,
        {
          top: insets.top,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.backOnlineContent}>
        <Ionicons name="cloud-done-outline" size={16} color={colors.textInverse} />
        <Text style={styles.backOnlineText}>
          {queuedItems > 0 
            ? `Back Online • Syncing ${queuedItems} update${queuedItems !== 1 ? 's' : ''}...`
            : 'Back Online'
          }
        </Text>
      </View>
    </RNAnimated.View>
  );
};

export default StreakFire;
