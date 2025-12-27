/**
 * Lazy Loading Utilities for React Native
 * 
 * Provides utilities for code splitting and lazy loading components
 * to reduce initial bundle size and improve performance
 */

import React, { useState, useEffect, ComponentType } from 'react';
import { View, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Hook for lazy loading a component
 * 
 * @param importFn - Function that returns a dynamic import promise
 * @param shouldLoad - Boolean to control when to load the component
 * @returns Object with component, loading state, and error
 */
export function useLazyComponent<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  shouldLoad: boolean = true
): {
  Component: ComponentType<T> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [Component, setComponent] = useState<ComponentType<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (shouldLoad && !Component && !isLoading && !error) {
      setIsLoading(true);
      setError(null);
      
      importFn()
        .then((module) => {
          setComponent(() => module.default);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error lazy loading component:', err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, [shouldLoad, Component, isLoading, error, importFn]);

  return { Component, isLoading, error };
}

/**
 * Loading overlay component for lazy loaded modals
 */
export function LazyLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

