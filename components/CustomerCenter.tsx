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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useRevenueCat } from '@/context/RevenueCatContext';
import PurchasesUI from 'react-native-purchases-ui';

interface CustomerCenterProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Customer Center component for managing subscriptions
 * Uses RevenueCat's built-in Customer Center UI
 */
const CustomerCenter: React.FC<CustomerCenterProps> = ({ visible, onClose }) => {
  const { restore, isLoading } = useRevenueCat();
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePresentCustomerCenter = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Present RevenueCat's Customer Center
      await PurchasesUI.presentCustomerCenter();
      
      // Refresh customer info after closing customer center
      // The context will handle this automatically
      onClose();
    } catch (error: any) {
      console.error('Customer Center error:', error);
      Alert.alert('Error', error.message || 'Failed to open Customer Center');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await restore();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          'Your purchases have been restored.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Restore Failed', result.error || 'No purchases found to restore.');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenStoreSubscriptionManagement = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (Platform.OS === 'ios') {
        // Open Apple's subscription management page
        // This opens Settings → [User Name] → Subscriptions
        const url = 'https://apps.apple.com/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback: Show instructions
          Alert.alert(
            'Manage Subscription',
            'To cancel your subscription:\n\n1. Open Settings on your iPhone\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find "Flashbits" and tap it\n5. Tap "Cancel Subscription"',
            [{ text: 'OK' }]
          );
        }
      } else if (Platform.OS === 'android') {
        // Open Google Play subscription management
        const url = 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback: Show instructions
          Alert.alert(
            'Manage Subscription',
            'To cancel your subscription:\n\n1. Open Google Play Store\n2. Tap Menu (☰)\n3. Tap "Subscriptions"\n4. Find "Flashbits" and tap it\n5. Tap "Cancel Subscription"',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('Error opening store subscription management:', error);
      Alert.alert(
        'Open Settings',
        Platform.OS === 'ios'
          ? 'Please go to Settings → [Your Name] → Subscriptions to manage your subscription.'
          : 'Please go to Google Play Store → Menu → Subscriptions to manage your subscription.'
      );
    }
  };

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
          <Text style={styles.title}>Manage Subscription</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Ionicons name="card-outline" size={32} color={colors.primary} style={styles.icon} />
            <Text style={styles.sectionTitle}>Cancel Subscription</Text>
            <Text style={styles.sectionDescription}>
              To cancel your subscription, you can use {Platform.OS === 'ios' ? "Apple's" : "Google Play's"} subscription management. Your subscription will remain active until the end of the current billing period.
            </Text>
            
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleOpenStoreSubscriptionManagement}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'} size={16} color={colors.textInverse} />
                  <Text style={styles.buttonText}>
                    Open {Platform.OS === 'ios' ? 'Apple' : 'Google Play'} Subscriptions
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Ionicons name="settings-outline" size={32} color={colors.primary} style={styles.icon} />
            <Text style={styles.sectionTitle}>Customer Center</Text>
            <Text style={styles.sectionDescription}>
              View your subscription details, update payment methods, and manage your account through RevenueCat.
            </Text>
            
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePresentCustomerCenter}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>Open Customer Center</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Ionicons name="refresh-outline" size={32} color={colors.primary} style={styles.icon} />
            <Text style={styles.sectionTitle}>Restore Purchases</Text>
            <Text style={styles.sectionDescription}>
              Restore your previous purchases if you've reinstalled the app or switched devices.
            </Text>
            
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleRestorePurchases}
              disabled={isRestoring || isLoading}
            >
              {isRestoring ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Restore Purchases
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How to Cancel</Text>
              <Text style={styles.infoText}>
                {Platform.OS === 'ios' 
                  ? 'Go to Settings → [Your Name] → Subscriptions → Flashbits → Cancel Subscription. Your subscription will remain active until the end of the current billing period.'
                  : 'Go to Google Play Store → Menu → Subscriptions → Flashbits → Cancel Subscription. Your subscription will remain active until the end of the current billing period.'}
              </Text>
              <Text style={[styles.infoText, { marginTop: spacing.sm }]}>
                Need help? Contact support for assistance with your subscription.
              </Text>
            </View>
          </View>
        </View>
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
    paddingBottom: spacing.lg,
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
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  icon: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.xl,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    lineHeight: typography.fontSize.xs * 1.4,
  },
});

export default CustomerCenter;

