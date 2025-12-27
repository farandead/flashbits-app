/**
 * Debounce and Throttle Utilities
 * 
 * Prevents excessive function calls for performance optimization
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Debounce function - delays execution until after wait time has passed
 * since the last invocation. Useful for search inputs, filter changes, etc.
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @param immediate - If true, call function immediately on first invocation
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func(...args);
    }
  };
}

/**
 * Throttle function - limits function execution to at most once per wait period
 * Useful for scroll events, resize events, etc.
 * 
 * @param func - Function to throttle
 * @param wait - Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>): ReturnType<T> {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
    return lastResult;
  };
}

/**
 * React hook for debouncing a value
 * Useful for debouncing search inputs, filter selections, etc.
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook for debouncing an array value
 * Useful for debouncing filter arrays (topics, difficulties, etc.)
 * Compares arrays by content, not reference
 * 
 * @param value - Array value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced array value
 */
export function useDebounceArray<T>(value: T[], delay: number): T[] {
  const [debouncedValue, setDebouncedValue] = useState<T[]>(value);
  const valueRef = useRef<string>('');

  useEffect(() => {
    // Serialize array to string for comparison (sort copy to avoid mutation)
    const sortedValue = [...value].sort();
    const currentValueStr = JSON.stringify(sortedValue);
    const previousValueStr = valueRef.current;
    
    // Only update if content actually changed
    if (currentValueStr !== previousValueStr) {
      valueRef.current = currentValueStr;
      
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay]);

  return debouncedValue;
}

