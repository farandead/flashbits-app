import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/constants/theme';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { RevenueCatProvider } from '@/context/RevenueCatContext';

// Smooth transition configuration
const smoothFadeConfig = {
  animation: 'fade' as const,
  animationDuration: 350,
};

const smoothSlideFromRightConfig = {
  animation: 'slide_from_right' as const,
  animationDuration: 400,
};

const smoothSlideFromBottomConfig = {
  animation: 'slide_from_bottom' as const,
  animationDuration: 350,
};

const smoothFadeFromBottomConfig = {
  animation: 'fade_from_bottom' as const,
  animationDuration: 400,
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <RevenueCatProvider>
          <SettingsProvider>
            <StatusBar style="light" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              ...smoothFadeConfig,
              // Enable smooth gesture-based navigation
              fullScreenGestureEnabled: true,
            }}
          >
            <Stack.Screen 
              name="index"
              options={{
                ...smoothFadeConfig,
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{
                ...smoothFadeFromBottomConfig,
                gestureEnabled: false, // Prevent swipe back during onboarding
              }}
            />
            <Stack.Screen
              name="home"
              options={{
                ...smoothFadeConfig,
              }}
            />
            <Stack.Screen
              name="feed"
              options={{
                ...smoothSlideFromRightConfig,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }}
            />
            <Stack.Screen
              name="progress"
              options={{
                presentation: 'modal',
                ...smoothSlideFromBottomConfig,
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: 'modal',
                ...smoothSlideFromBottomConfig,
                gestureEnabled: true,
              }}
            />
          </Stack>
        </SettingsProvider>
        </RevenueCatProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

