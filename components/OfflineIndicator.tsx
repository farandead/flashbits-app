import React from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '@/context/NetworkContext';
import { colors, spacing, typography } from '@/constants/theme';

export const OfflineIndicator: React.FC = () => {
  const { isConnected, isInternetReachable } = useNetwork();
  const insets = useSafeAreaInsets();
  const [slideAnim] = React.useState(new Animated.Value(-100));

  const isOffline = !isConnected || isInternetReachable === false;

  React.useEffect(() => {
    if (isOffline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [isOffline, slideAnim]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.textInverse} />
        <Text style={styles.text}>No Internet Connection</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.incorrect,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  text: {
    color: colors.textInverse,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});

