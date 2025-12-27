import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useRevenueCat } from '@/context/RevenueCatContext';

interface SubscriptionManagerProps {
  visible: boolean;
  onClose: () => void;
}

type IoniconsName = keyof typeof Ionicons.glyphMap;

/**
 * Professional Subscription Manager component
 * Handles subscription status display, management, and cancellation
 */
const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ visible, onClose }) => {
  const { 
    isPro, 
    subscriptionStatus, 
    restore, 
    isLoading,
    refreshCustomerInfo 
  } = useRevenueCat();
  
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get subscription plan name
  const getPlanName = (): string => {
    if (!subscriptionStatus?.productIdentifier) return 'Pro';
    const id = subscriptionStatus.productIdentifier.toLowerCase();
    if (id.includes('yearly') || id.includes('annual')) return 'Pro Yearly';
    if (id.includes('monthly')) return 'Pro Monthly';
    return 'Pro';
  };

  // Get renewal status text
  const getRenewalStatus = (): { text: string; color: string; icon: IoniconsName } => {
    if (!isPro) {
      return { text: 'No active subscription', color: colors.textMuted, icon: 'close-circle-outline' };
    }
    if (subscriptionStatus?.willRenew) {
      return { text: 'Renews automatically', color: colors.correct, icon: 'checkmark-circle' };
    }
    return { text: 'Expires on renewal date', color: colors.warning, icon: 'alert-circle' };
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await restore();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Purchases Restored',
          'Your purchases have been successfully restored.',
          [{ text: 'OK' }]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'No Purchases Found',
          result.error || 'No previous purchases were found for this account.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle refresh subscription status
  const handleRefreshStatus = async () => {
    try {
      setIsRefreshing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await refreshCustomerInfo();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle opening store subscription management
  const handleManageSubscription = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (Platform.OS === 'ios') {
        const url = 'https://apps.apple.com/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          showManualInstructions();
        }
      } else if (Platform.OS === 'android') {
        const url = 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          showManualInstructions();
        }
      }
    } catch (error: any) {
      console.error('Error opening subscription management:', error);
      showManualInstructions();
    }
  };

  // Show manual instructions for managing subscription
  const showManualInstructions = () => {
    Alert.alert(
      'Manage Your Subscription',
      Platform.OS === 'ios'
        ? 'To manage your subscription:\n\n1. Open Settings on your iPhone\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find "Flashbits" and tap it\n\nFrom there you can:\n• View subscription details\n• Change your plan\n• Cancel subscription'
        : 'To manage your subscription:\n\n1. Open Google Play Store\n2. Tap your profile icon\n3. Tap "Payments & subscriptions"\n4. Tap "Subscriptions"\n5. Find "Flashbits" and tap it\n\nFrom there you can:\n• View subscription details\n• Change your plan\n• Cancel subscription',
      [{ text: 'Got it' }]
    );
  };

  const renewalStatus = getRenewalStatus();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Subscription</Text>
          <Pressable 
            style={styles.refreshButton} 
            onPress={handleRefreshStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Card */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIconContainer, isPro && styles.statusIconContainerActive]}>
                <Ionicons 
                  name={isPro ? 'checkmark-circle' : 'close-circle'} 
                  size={28} 
                  color={isPro ? colors.primary : colors.textMuted} 
                />
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {isPro ? getPlanName() : 'Free Plan'}
                </Text>
                <View style={styles.statusBadge}>
                  <Ionicons name={renewalStatus.icon} size={12} color={renewalStatus.color} />
                  <Text style={[styles.statusBadgeText, { color: renewalStatus.color }]}>
                    {renewalStatus.text}
                  </Text>
                </View>
              </View>
            </View>

            {isPro && subscriptionStatus && (
              <View style={styles.subscriptionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.detailValueContainer}>
                    <View style={[styles.statusDot, { backgroundColor: colors.correct }]} />
                    <Text style={styles.detailValue}>Active</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {subscriptionStatus.willRenew ? 'Renews on' : 'Expires on'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatDate(subscriptionStatus.expirationDate)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text style={styles.detailValue}>{getPlanName()}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Auto-Renew</Text>
                  <Text style={[styles.detailValue, { color: subscriptionStatus.willRenew ? colors.correct : colors.warning }]}>
                    {subscriptionStatus.willRenew ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Manage Subscription</Text>
            
            {isPro ? (
              <>
                {/* Manage Subscription - Opens App Store/Google Play */}
                <Pressable style={styles.actionButton} onPress={handleManageSubscription}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>
                      {Platform.OS === 'ios' ? 'App Store Subscriptions' : 'Google Play Subscriptions'}
                    </Text>
                    <Text style={styles.actionDescription}>
                      Manage, change or cancel your subscription
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </>
            ) : (
              <>
                {/* Restore Purchases */}
                <Pressable 
                  style={styles.actionButton} 
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Restore Purchases</Text>
                    <Text style={styles.actionDescription}>
                      Restore previous subscription
                    </Text>
                  </View>
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              </>
            )}
          </Animated.View>

          {/* Help Section */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.helpSection}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            
            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>How to Cancel</Text>
                <Text style={styles.helpText}>
                  {Platform.OS === 'ios' 
                    ? 'Go to Settings → [Your Name] → Subscriptions → Flashbits → Cancel Subscription.'
                    : 'Go to Google Play → Profile → Payments & subscriptions → Subscriptions → Flashbits → Cancel.'}
                </Text>
                <Text style={[styles.helpText, { marginTop: spacing.xs }]}>
                  Your subscription will remain active until the end of the current billing period.
                </Text>
              </View>
            </View>

            <View style={styles.helpCard}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>Contact Support</Text>
                <Text style={styles.helpText}>
                  Having issues with your subscription? Contact us at support@flashbits.co
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Bottom spacing */}
          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing['3xl'],
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing['3xl'],
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusIconContainerActive: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  subscriptionDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  helpSection: {
    marginBottom: spacing.xl,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    lineHeight: typography.fontSize.xs * 1.5,
  },
});

export default SubscriptionManager;

