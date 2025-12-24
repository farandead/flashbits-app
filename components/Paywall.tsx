import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'monthly' | 'yearly') => void;
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

const Paywall: React.FC<PaywallProps> = ({ visible, onClose, onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'yearly'>('monthly');

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPlan(selectedPlan);
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSelectPlan = async (plan: 'monthly' | 'yearly') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
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
            <View style={styles.earlyBirdBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.earlyBirdText}>Early Bird Special</Text>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
            <Text style={styles.subtitle}>
              Limited time offer - Save 30%
            </Text>
          </Animated.View>

          {/* Pricing Plans */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.pricingSection}>
            <Pressable 
              onPress={() => handleSelectPlan('monthly')}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected
              ]}
            >
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>SAVE 30%</Text>
              </View>

              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly Access</Text>
                  <Text style={styles.planDescription}>Full access to all features</Text>
                </View>
                {selectedPlan === 'monthly' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.strikethroughPrice}>£10</Text>
                  <Text style={styles.price}>£6.99</Text>
                  <Text style={styles.period}>/mo</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.pricingSection}>
            <Pressable 
              onPress={() => handleSelectPlan('yearly')}
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected
              ]}
            >
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>SAVE 38%</Text>
              </View>

              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Yearly Access</Text>
                  <Text style={styles.planDescription}>Full access to all features</Text>
                </View>
                {selectedPlan === 'yearly' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.strikethroughPrice}>£120</Text>
                  <Text style={styles.price}>£73.99</Text>
                  <Text style={styles.period}>/yr</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

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
          <Pressable style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Start {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro 
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </Pressable>
          <Text style={styles.footerNote}>
            Early bird pricing • Cancel anytime
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
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
  },
  pricingSection: {
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    position: 'relative',
    opacity: 0.6,
  },
  planCardSelected: {
    opacity: 1,
    borderWidth: 2,
    backgroundColor: colors.primaryGlow,
  },
  discountBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
    fontSize: typography.fontSize.base,
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
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
});

export default Paywall;

