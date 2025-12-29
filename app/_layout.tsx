import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { RevenueCatProvider } from '@/context/RevenueCatContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <NetworkProvider>
            <AuthProvider>
              <RevenueCatProvider>
                <SettingsProvider>
                  <StatusBar style="light" backgroundColor={colors.background} />
                  <View style={styles.content}>
                    <AuthGuard />
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
                        name="loading"
                        options={{
                          ...smoothFadeConfig,
                          gestureEnabled: false, // Prevent swipe back during loading
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
                    <OfflineIndicator />
                  </View>
                </SettingsProvider>
              </RevenueCatProvider>
            </AuthProvider>
          </NetworkProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});

