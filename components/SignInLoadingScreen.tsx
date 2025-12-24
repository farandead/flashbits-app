import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/constants/theme';

interface SignInLoadingScreenProps {
  message?: string;
}

const SignInLoadingScreen: React.FC<SignInLoadingScreenProps> = ({
  message = 'Signing in',
}) => {
  const scale1 = useSharedValue(0.5);
  const scale2 = useSharedValue(0.5);
  const scale3 = useSharedValue(0.5);
  const scale4 = useSharedValue(0.5);
  const scale5 = useSharedValue(0.5);

  useEffect(() => {
    const animationConfig = {
      duration: 600,
      easing: Easing.inOut(Easing.ease),
    };

    // Staggered bar animations
    scale1.value = withRepeat(
      withSequence(
        withTiming(1, animationConfig),
        withTiming(0.5, animationConfig)
      ),
      -1
    );

    scale2.value = withDelay(
      100,
      withRepeat(
        withSequence(
          withTiming(1, animationConfig),
          withTiming(0.5, animationConfig)
        ),
        -1
      )
    );

    scale3.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, animationConfig),
          withTiming(0.5, animationConfig)
        ),
        -1
      )
    );

    scale4.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, animationConfig),
          withTiming(0.5, animationConfig)
        ),
        -1
      )
    );

    scale5.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, animationConfig),
          withTiming(0.5, animationConfig)
        ),
        -1
      )
    );
  }, []);

  const bar1Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale1.value }],
  }));

  const bar2Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale2.value }],
  }));

  const bar3Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale3.value }],
  }));

  const bar4Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale4.value }],
  }));

  const bar5Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale5.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Animated Bars */}
      <View style={styles.barsContainer}>
        <Animated.View style={[styles.bar, bar1Style]} />
        <Animated.View style={[styles.bar, bar2Style]} />
        <Animated.View style={[styles.bar, bar3Style]} />
        <Animated.View style={[styles.bar, bar4Style]} />
        <Animated.View style={[styles.bar, bar5Style]} />
      </View>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    height: 50,
  },
  bar: {
    width: 10,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  message: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

export default SignInLoadingScreen;

