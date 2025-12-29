import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { debugError } from '@/utils/debug';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our debug utility
    debugError('ui', 'Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Store error info for display
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      this.setState({
        isRetrying: true,
      });

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      debugError('ui', 'Error resetting Error Boundary:', error);
      this.setState({ isRetrying: false });
    }
  };

  handleReload = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // For a full app reload, you might want to use:
      // - React Native: Updates.reloadAsync() from expo-updates
      // - Or navigate to a safe screen
      
      // For now, we'll just reset the error boundary
      await this.handleReset();
    } catch (error) {
      debugError('ui', 'Error reloading app:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, render default error UI
      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Error Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="warning" size={64} color={colors.warning} />
              </View>

              {/* Error Title */}
              <Text style={styles.title}>Something Went Wrong</Text>

              {/* Error Message */}
              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </Text>

              {/* Error Details (only in development) */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetailsContainer}>
                  <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
                  <Text style={styles.errorDetailsText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo?.componentStack && (
                    <Text style={styles.errorDetailsStack}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.handleReset}
                  disabled={this.state.isRetrying}
                >
                  {this.state.isRetrying ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color={colors.textInverse} style={styles.buttonIcon} />
                      <Text style={styles.primaryButtonText}>Try Again</Text>
                    </>
                  )}
                </Pressable>

                {__DEV__ && (
                  <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={this.handleReload}
                  >
                    <Ionicons name="reload" size={20} color={colors.primary} style={styles.buttonIcon} />
                    <Text style={styles.secondaryButtonText}>Reload App</Text>
                  </Pressable>
                )}
              </View>

              {/* Help Text */}
              <Text style={styles.helpText}>
                If this problem persists, please contact support.
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.full,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorDetailsContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorDetailsTitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warning,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  errorDetailsText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  errorDetailsStack: {
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
    color: colors.textMuted,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    fontWeight: '600',
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default ErrorBoundary;

