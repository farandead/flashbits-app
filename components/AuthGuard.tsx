import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { hasCompletedOnboarding } from '@/services/userService';
import { debug, debugSuccess, debugError } from '@/utils/debug';

/**
 * AuthGuard - Navigation guard that handles authenticated user redirects
 * 
 * This component ensures that:
 * 1. Authenticated users are redirected to home/onboarding on app launch
 * 2. Authenticated users are redirected when app comes to foreground
 * 3. Token validation and refresh happens automatically
 * 4. No flash of login screen for authenticated users
 */
export default function AuthGuard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user) {
        // App came to foreground - check if user is on login screen
        const currentRoute = segments[0];
        
        // Check if we're on the login/index screen (segments will be empty)
        if (!currentRoute) {
          debug('auth', 'App came to foreground, redirecting authenticated user...');
          
          try {
            // Validate token is still valid by checking user
            await user.reload();
            
            // Check if email user needs verification
            const isEmailUser = user.providerData[0]?.providerId === 'password';
            if (isEmailUser && !user.emailVerified) {
              debug('auth', 'Email not verified, staying on login screen');
              return;
            }
            
            // Navigate to appropriate screen
            const hasOnboarded = await hasCompletedOnboarding(user.uid);
            if (hasOnboarded) {
              debugSuccess('auth', 'Redirecting to home from foreground');
              router.replace('/home');
            } else {
              debug('auth', 'Redirecting to onboarding from foreground');
              router.replace('/onboarding');
            }
          } catch (error) {
            debugError('auth', 'Error validating user on foreground:', error);
            // Token might be expired, let user sign in again
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user, segments, router]);

  // Handle initial auth state on app launch
  useEffect(() => {
    if (isLoading) {
      // Still loading auth state, wait
      return;
    }

    const handleAuthRedirect = async () => {
      const currentRoute = segments[0];
      
      // Don't redirect if already on loading, onboarding, or home screens
      if (currentRoute === 'loading' || currentRoute === 'onboarding' || currentRoute === 'home') {
        return; // Already on a valid screen, don't redirect
      }
      
      // Only redirect if we're on the login screen (segments empty or undefined)
      if (currentRoute && segments.length > 0) {
        return; // Already on a different screen, don't redirect
      }

      if (isAuthenticated && user) {
        debugSuccess('auth', 'User authenticated on app launch, redirecting...');
        
        try {
          // Validate token is still valid
          await user.reload();
          
          // Check if email user needs verification
          const isEmailUser = user.providerData[0]?.providerId === 'password';
          if (isEmailUser && !user.emailVerified) {
            debug('auth', 'Email not verified, staying on login screen');
            return;
          }
          
          // Navigate to loading screen - it will handle data loading and navigation
          debug('auth', 'Redirecting to loading screen...');
          router.replace('/loading');
        } catch (error) {
          debugError('auth', 'Error validating user on launch:', error);
          // Token might be expired or invalid, stay on login screen
        }
      }
    };

    handleAuthRedirect();
  }, [isAuthenticated, user, isLoading, segments, router]);

  // This component doesn't render anything
  return null;
}

