import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

interface EmailVerificationBannerProps {
  onVerify: () => Promise<void>;
}

export default function EmailVerificationBanner({ onVerify }: EmailVerificationBannerProps) {
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    try {
      setIsSending(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onVerify();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Email Sent', 'Verification email has been sent. Please check your inbox.');
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send verification email. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail-unread-outline" size={24} color={colors.warning} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.message}>
            Check your inbox and click the verification link
          </Text>
        </View>
      </View>
      <Pressable
        style={styles.button}
        onPress={handleResend}
        disabled={isSending}
      >
        <Text style={styles.buttonText}>
          {isSending ? 'Sending...' : 'Resend'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.warning + '25',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.3,
  },
});

