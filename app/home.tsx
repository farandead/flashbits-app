import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
// Animations removed for a cleaner, professional look
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, UserProfile } from '@/services/userService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Feature cards data
const FEATURES: { icon: IoniconsName; title: string; description: string }[] = [
  {
    icon: 'flash',
    title: 'No Brainrot',
    description: 'Swipe to get smarter, not dumber',
  },
  {
    icon: 'checkmark-circle',
    title: 'Instant Feedback',
    description: 'Know right away if you nailed it',
  },
  {
    icon: 'trophy',
    title: 'Level Up',
    description: 'Earn XP and climb hacker ranks',
  },
  {
    icon: 'bulb',
    title: 'Actually Learn',
    description: 'Missed questions come back smarter',
  },
];

// Quick stats for returning users
const QuickStats = ({ xp, questionsAnswered }: { xp: number; questionsAnswered: number }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{xp}</Text>
      <Text style={styles.statLabel}>XP Earned</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{questionsAnswered}</Text>
      <Text style={styles.statLabel}>Questions</Text>
    </View>
  </View>
);

export default function LandingPage() {
  const router = useRouter();
  const { hapticFeedback, selectedTopics, selectedDifficulties } = useSettings();
  const { isAuthenticated, user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [emailVerified, setEmailVerified] = useState(true); // Default to true to avoid flashing banner
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    };
    fetchProfile();
  }, [user?.uid]);

  // Check email verification status
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (user) {
        // Reload user to get latest emailVerified status
        await user.reload();
        const isVerified = user.emailVerified;
        setEmailVerified(isVerified);
        setShowVerificationBanner(!isVerified && user.providerData[0]?.providerId === 'password');
      }
    };
    checkEmailVerification();
  }, [user]);

  // Get display name
  const displayName = userProfile?.name 
    || user?.email?.split('@')[0] 
    || 'there';


  const handleStartPractice = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/feed');
  };

  const handleSettings = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/settings');
  };

  const handleProgress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/progress');
  };

  const handleLogin = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/');
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.backgroundBase} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with settings */}
        <View style={styles.header}>
          {/* Only show Sign In when not authenticated */}
          {!isAuthenticated ? (
            <Pressable onPress={handleLogin} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          ) : (
            <View style={styles.loginButtonPlaceholder} />
          )}
          <View style={styles.headerButtons}>
            <Pressable onPress={handleProgress} style={styles.headerButton}>
              <Ionicons name="stats-chart" size={22} color={colors.textPrimary} />
            </Pressable>
            <Pressable onPress={handleSettings} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Simple Email Verification Banner */}
        {isAuthenticated && showVerificationBanner && (
          <View style={styles.simpleVerificationBanner}>
            <View style={styles.verificationBannerContent}>
              <Ionicons name="mail-unread-outline" size={20} color={colors.warning} />
              <View style={styles.verificationTextContainer}>
                <Text style={styles.simpleVerificationTitle}>
                  Email not verified
                </Text>
                <Text style={styles.simpleVerificationSubtext}>
                  Tap to verify your account
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                router.push('/settings');
              }}
              style={styles.simpleVerificationButton}
            >
              <Text style={styles.simpleVerificationButtonText}>Verify</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.warning} />
            </Pressable>
          </View>
        )}

        {/* Hero Section - Combined welcome and branding */}
        <View style={styles.heroSection}>
          {/* Welcome greeting */}
          {isAuthenticated && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                Hey, <Text style={styles.welcomeName}>{displayName}</Text> 👋
              </Text>
            </View>
          )}

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/icons/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Tagline */}
          <Text style={styles.tagline}>
            Master coding interviews,{'\n'}one swipe at a time
          </Text>

          {/* Filter chips */}
          <View style={styles.filterTags}>
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>
                {selectedTopics.size} topics
              </Text>
            </View>
            <View style={styles.filterTagDivider} />
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>
                {selectedDifficulties.size} levels
              </Text>
            </View>
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.startButtonContainer}>
          <Pressable
            style={styles.startButton}
            onPress={handleStartPractice}
          >
            <View style={styles.startButtonContent}>
              <Ionicons name="play" size={18} color={colors.textInverse} />
              <Text style={styles.startButtonText}>Start Practice</Text>
            </View>
            <Text style={styles.startButtonHint}>Swipe-based learning</Text>
          </Pressable>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why flashbits?</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <View
                key={feature.title}
                style={styles.featureCard}
              >
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickActionButton}
            onPress={handleSettings}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="options-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>Customize Topics</Text>
              <Text style={styles.quickActionDescription}>
                Choose what to practice
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.quickActionButton}
            onPress={handleProgress}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>View Progress</Text>
              <Text style={styles.quickActionDescription}>
                Track your hacker rank
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built for developers, by developers
          </Text>
          <View style={styles.footerDivider} />
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050506',
  },
  backgroundBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050506',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  simpleVerificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  verificationBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  verificationTextContainer: {
    flex: 1,
  },
  simpleVerificationTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  simpleVerificationSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '400',
  },
  simpleVerificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '25',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    gap: spacing.xs,
  },
  simpleVerificationButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.warning,
  },
  loginButton: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  loginButtonPlaceholder: {
    // Empty placeholder to maintain header layout when signed in
    width: 1,
  },
  loginButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(22, 22, 24, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  // Welcome Message
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    paddingTop: spacing.md,
  },
  welcomeContainer: {
    marginBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  welcomeName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  tagline: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.md * 1.5,
    marginBottom: spacing.xl,
  },
  filterTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterTagDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  filterTagText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  startButtonContainer: {
    marginBottom: spacing['2xl'],
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.3,
  },
  startButtonHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textInverse,
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  featuresSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm) / 2,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  quickActions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  quickActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickActionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  footerDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    borderRadius: 1,
  },
  versionText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    opacity: 0.6,
  },
});
