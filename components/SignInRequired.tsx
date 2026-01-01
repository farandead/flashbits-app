import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

type SignInRequiredProps = {
  message?: string;
  description?: string;
};

export default function SignInRequired({ 
  message = 'Sign In Required',
  description = 'Create an account or sign in to access this feature and track your progress.'
}: SignInRequiredProps) {
  const router = useRouter();

  const handleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/');
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(600)} 
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={24} color={colors.primary} />
      </View>
      
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.description}>{description}</Text>

      <Pressable style={styles.signInButton} onPress={handleSignIn}>
        <Text style={styles.signInButtonText}>Sign In</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  signInButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
});

