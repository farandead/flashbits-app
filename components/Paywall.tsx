import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useRevenueCat } from '@/context/RevenueCatContext';
import { PurchasesPackage } from 'react-native-purchases';
import PurchasesUI from 'react-native-purchases-ui';
import type { PurchasesPackage as PurchasesPackageType } from 'react-native-purchases';
import { debugError } from '@/utils/debug';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: 'monthly' | 'yearly') => void; // Optional now since we handle it internally
  useRevenueCatPaywall?: boolean; // Option to use RevenueCat's built-in paywall
}

type IoniconsName = keyof typeof Ionicons.glyphMap;

const FEATURES = [
  {
    icon: 'calendar' as IoniconsName,
    title: 'New Questions',
    description: 'New coding questions monthly',
  },
  {
    icon: 'flash' as IoniconsName,
    title: 'Unlimited Questions',
    description: 'Access our entire library',
  },
  {
    icon: 'trophy' as IoniconsName,
    title: 'Track Progress',
    description: 'Earn XP and unlock ranks',
  },
  {
    icon: 'stats-chart' as IoniconsName,
    title: 'Analytics',
    description: 'Performance by topic',
  },
  {
    icon: 'rocket' as IoniconsName,
    title: 'Early Access',
    description: 'New features first',
  },
  {
    icon: 'shield-checkmark' as IoniconsName,
    title: 'Priority Support',
    description: 'Help when you need it',
  },
];

const Paywall: React.FC<PaywallProps> = ({ 
  visible, 
  onClose, 
  onSelectPlan,
  useRevenueCatPaywall = false 
}) => {
  const { 
    currentOffering, 
    purchasePlan, 
    isLoading,
    refreshOfferings,
    refreshCustomerInfo,
    isPro
  } = useRevenueCat();
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [packages, setPackages] = useState<PurchasesPackageType[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Load packages when modal opens
  useEffect(() => {
    if (visible && currentOffering) {
      setPackages(currentOffering.availablePackages);
      
      // Auto-select yearly if available (better value)
      const yearlyPackage = currentOffering.availablePackages.find(
        pkg => pkg.identifier.toLowerCase().includes('yearly') || 
               pkg.identifier.toLowerCase().includes('annual')
      );
      if (yearlyPackage) {
        setSelectedPlan('yearly');
      }
    }
  }, [visible, currentOffering]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Present RevenueCat's built-in paywall
  const presentRevenueCatPaywall = async () => {
    try {
      if (!currentOffering) {
        Alert.alert('Error', 'No offerings available. Please try again later.');
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Present RevenueCat's paywall UI
      // Note: presentPaywall can take an offering or use the default
      const result = await PurchasesUI.presentPaywall({
        offering: currentOffering,
      });
      
      if (result) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Wait a moment for RevenueCat to process
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Immediately refresh customer info to update pro status
        // This ensures UI updates right away and syncs to Firestore
        await refreshCustomerInfo();
        
        // Close paywall after successful purchase
        onClose();
      }
    } catch (error: any) {
      debugError('revenueCat', 'RevenueCat paywall error:', error);
      if (!error.userCancelled) {
        Alert.alert('Error', error.message || 'Failed to present paywall');
      }
    }
  };

  const handleContinue = async () => {
    if (useRevenueCatPaywall) {
      await presentRevenueCatPaywall();
      return;
    }

    try {
      setIsPurchasing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await purchasePlan(selectedPlan);
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Pro status is already updated in purchasePlan, but refresh to be sure
        // Wait a tiny bit to ensure state has propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshCustomerInfo();
        
        // Close paywall - pro status should be updated
        onClose();
        
        // Show success message after closing (non-blocking)
        // Clear any existing timeout first
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
        }
        
        alertTimeoutRef.current = setTimeout(() => {
          Alert.alert(
            'Success!',
            'Your subscription is now active. Enjoy Pro features!',
            [{ text: 'OK' }]
          );
          alertTimeoutRef.current = null;
        }, 300);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (error: any) {
      debugError('revenueCat', 'Purchase error:', error);
      Alert.alert('Error', error.message || 'Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSelectPlan = async (plan: 'monthly' | 'yearly') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  // Get package for selected plan
  const getSelectedPackage = (): PurchasesPackageType | null => {
    return packages.find((pkg) => {
      const identifier = pkg.identifier.toLowerCase();
      return identifier.includes(selectedPlan.toLowerCase());
    }) || null;
  };

  // Format price from package
  const formatPrice = (pkg: PurchasesPackageType | null): string => {
    if (!pkg || !pkg.product) return 'Loading...';
    return pkg.product.priceString;
  };

  // Get package description
  const getPackageDescription = (pkg: PurchasesPackageType | null): string => {
    if (!pkg) return 'Full access to all features';
    return pkg.product.description || 'Full access to all features';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="rocket" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Unlock Pro</Text>
            <View style={styles.trialBadgeLarge}>
              <Ionicons name="gift" size={18} color={colors.primary} />
              <Text style={styles.trialTextLarge}>7-Day Free Trial</Text>
            </View>
            <Text style={styles.subtitle}>
              {(() => {
                const selectedPkg = getSelectedPackage();
                if (selectedPkg) {
                  const period = selectedPlan === 'monthly' ? '/month' : '/year';
                  return `Try Pro free for 7 days, then ${formatPrice(selectedPkg)}${period}`;
                }
                return 'Try Pro free for 7 days, then continue with subscription';
              })()}
            </Text>
          </Animated.View>

          {/* Pricing Plans */}
          {packages.length > 0 ? (
            <>
              {packages.map((pkg: PurchasesPackageType, index: number) => {
                const isMonthly = pkg.identifier.toLowerCase().includes('monthly') || 
                                 pkg.identifier.toLowerCase().includes('month');
                const isYearly = pkg.identifier.toLowerCase().includes('yearly') || 
                                pkg.identifier.toLowerCase().includes('annual') ||
                                pkg.identifier.toLowerCase().includes('year');
                
                // Only show monthly and yearly packages
                if (!isMonthly && !isYearly) return null;
                
                const planType = isMonthly ? 'monthly' : 'yearly';
                const isSelected = selectedPlan === planType;
                
                return (
                  <Animated.View 
                    key={pkg.identifier} 
                    entering={FadeInUp.duration(400).delay(200 + (index * 100))} 
                    style={styles.pricingSection}
                  >
                    <Pressable 
                      onPress={() => handleSelectPlan(planType)}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected
                      ]}
                      disabled={isPurchasing}
                    >
                      {isYearly && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>BEST VALUE</Text>
                        </View>
                      )}

                      <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                          <Text style={styles.planName}>
                            {isMonthly ? 'Monthly Access' : 'Yearly Access'}
                          </Text>
                          <Text style={styles.planDescription}>
                            {getPackageDescription(pkg)}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          </View>
                        )}
                      </View>

                      <View style={styles.priceContainer}>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>{formatPrice(pkg)}</Text>
                          <Text style={styles.period}>
                            {isMonthly ? '/mo' : '/yr'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          )}

          {/* Features List */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What's Included</Text>
            <View style={styles.featuresList}>
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={feature.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Trust Badges */}
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.trustSection}>
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
              <Text style={styles.trustText}>Secure</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="refresh" size={12} color={colors.textMuted} />
              <Text style={styles.trustText}>Cancel Anytime</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={12} color={colors.textMuted} />
              <Text style={styles.trustText}>Guarantee</Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <Pressable 
            style={[styles.continueButton, (isPurchasing || isLoading) && styles.continueButtonDisabled]} 
            onPress={handleContinue}
            disabled={isPurchasing || isLoading || packages.length === 0}
          >
            {isPurchasing ? (
              <>
                <ActivityIndicator size="small" color={colors.textInverse} />
                <Text style={styles.continueButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {useRevenueCatPaywall 
                    ? 'Start Free Trial' 
                    : `Start 7-Day Free Trial`
                  }
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
              </>
            )}
          </Pressable>
          <Text style={styles.footerNote}>
            Start your 7-day free trial • Cancel anytime • Subscription auto-renews after trial
          </Text>
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
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  earlyBirdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  earlyBirdText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: '#FFD700',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
    marginTop: spacing.xs,
  },
  trialText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  trialBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trialTextLarge: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pricingSection: {
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.4)',
    backgroundColor: 'rgba(0, 255, 148, 0.08)',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.background,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  selectedIndicator: {
    marginLeft: spacing.sm,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  planDescription: {
    fontSize: typography.fontSize.xs,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  strikethroughPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: spacing.sm,
  },
  price: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  period: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  featuresSection: {
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: spacing.xs,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  featureDescription: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.textMuted,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  continueButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
  footerNote: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default Paywall;

