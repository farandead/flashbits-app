/**
 * useStreak Hook
 * 
 * Manages streak state for the question answering flow
 * Streak activates after 3 correct answers in a row
 * Breaks when user gets an answer wrong
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { updateMaxStreak } from '@/services/statsService';
import { debugError } from '@/utils/debug';

const getStreakStorageKey = (userId: string | null) => 
  userId ? `@flashbits_streak_data_${userId}` : '@flashbits_streak_data';
const getBestStreakKey = (userId: string | null) => 
  userId ? `@flashbits_best_streak_${userId}` : '@flashbits_best_streak';

interface StreakData {
  currentStreak: number;
  consecutiveCorrect: number; // Tracks answers before streak activates
  isStreakActive: boolean;
  bestStreak: number;
  lastUpdated: number;
}

interface StreakState {
  // Current streak count (0 if not active)
  streak: number;
  // Consecutive correct answers (0-2 before streak activates, then becomes streak)
  consecutiveCorrect: number;
  // Whether streak is active (>= 3)
  isActive: boolean;
  // Best streak ever achieved
  bestStreak: number;
  // Whether to show celebration animation
  showCelebration: boolean;
  // Whether to show milestone celebration
  showMilestone: boolean;
  // Current milestone being celebrated
  currentMilestone: number;
  // Whether streak was just broken
  wasJustBroken: boolean;
  // The streak count before it was broken
  brokenStreakCount: number;
}

interface UseStreakReturn extends StreakState {
  // Call when user answers correctly
  recordCorrectAnswer: () => void;
  // Call when user answers incorrectly
  recordIncorrectAnswer: () => void;
  // Call when user skips a question (doesn't break streak)
  recordSkip: () => void;
  // Reset streak
  resetStreak: () => void;
  // Dismiss celebration
  dismissCelebration: () => void;
  // Dismiss milestone
  dismissMilestone: () => void;
  // Dismiss broken streak animation
  dismissBrokenStreak: () => void;
  // Progress towards streak activation (0-2 before streak, then streak count)
  getProgress: () => { current: number; required: number; isBuilding: boolean };
  // Get the next milestone to reach
  getNextMilestone: () => number | null;
}

// Milestone thresholds
const MILESTONES = [5, 10, 15, 20, 25, 50, 100];
const MAX_MILESTONE = Math.max(...MILESTONES); // 100
const MILESTONE_INTERVAL = 10; // Show milestone every 5 after max

export function useStreak(): UseStreakReturn {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(0);
  const [wasJustBroken, setWasJustBroken] = useState(false);
  const [brokenStreakCount, setBrokenStreakCount] = useState(0);
  
  const lastMilestoneRef = useRef(0);
  const previousUserIdRef = useRef<string | null>(null);

  // Load streak data on mount and when user changes
  useEffect(() => {
    const currentUserId = user?.uid || null;
    const previousUserId = previousUserIdRef.current;
    
    // Only reset if user actually changed (not on initial mount with same user)
    if (previousUserId !== null && previousUserId !== currentUserId) {
      // User changed - reset streak state
      setStreak(0);
      setConsecutiveCorrect(0);
      setIsActive(false);
      setBestStreak(0);
      setShowCelebration(false);
      setShowMilestone(false);
      setWasJustBroken(false);
      lastMilestoneRef.current = 0;
    }
    
    // Load streak data for current user
    if (currentUserId) {
      loadStreakData();
    }
    
    // Update previous user ID
    previousUserIdRef.current = currentUserId;
  }, [user?.uid]);

  // Save streak data whenever it changes
  useEffect(() => {
    if (user?.uid) {
      saveStreakData();
    }
  }, [streak, consecutiveCorrect, isActive, bestStreak, user?.uid]);

  // Sync best streak to Firestore when it changes (will queue if offline)
  useEffect(() => {
    if (user?.uid && bestStreak > 0) {
      updateMaxStreak(user.uid, bestStreak).catch((error) => {
        debugError('stats', 'Error syncing max streak to Firestore:', error);
      });
    }
  }, [bestStreak, user?.uid]);

  const loadStreakData = async () => {
    if (!user?.uid) return;
    
    try {
      // Load from AsyncStorage first (user-specific key)
      const storageKey = getStreakStorageKey(user.uid);
      const data = await AsyncStorage.getItem(storageKey);
      if (data) {
        const parsed: StreakData = JSON.parse(data);
        
        // Check if streak data is from today (reset if from previous day)
        const lastUpdated = new Date(parsed.lastUpdated);
        const today = new Date();
        const isSameDay = 
          lastUpdated.getDate() === today.getDate() &&
          lastUpdated.getMonth() === today.getMonth() &&
          lastUpdated.getFullYear() === today.getFullYear();
        
        if (isSameDay) {
          setStreak(parsed.currentStreak);
          setConsecutiveCorrect(parsed.consecutiveCorrect);
          setIsActive(parsed.isStreakActive);
        }
        
        setBestStreak(parsed.bestStreak);
        
        // Initialize last milestone based on current streak
        if (parsed.currentStreak >= MAX_MILESTONE) {
          // If past max, find the last multiple of 5
          lastMilestoneRef.current = Math.floor(parsed.currentStreak / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
        } else {
          // Otherwise, find the last predefined milestone reached
          lastMilestoneRef.current = Math.max(...MILESTONES.filter(m => m <= parsed.currentStreak), 0);
        }
      }

      // Load best streak separately (persists forever, user-specific)
      const bestStreakKey = getBestStreakKey(user.uid);
      const best = await AsyncStorage.getItem(bestStreakKey);
      if (best) {
        const bestValue = parseInt(best, 10);
        if (!isNaN(bestValue)) {
          setBestStreak(prev => Math.max(prev, bestValue));
        }
      }

      // Also load max streak from Firestore if user is authenticated
      if (user?.uid) {
        try {
          const { getUserStats } = await import('@/services/statsService');
          const stats = await getUserStats(user.uid);
          if (stats.maxStreak && stats.maxStreak > 0) {
            setBestStreak(prev => Math.max(prev, stats.maxStreak || 0));
          }
        } catch (error) {
          debugError('stats', 'Error loading max streak from Firestore:', error);
        }
      }
    } catch (error) {
      debugError('storage', 'Error loading streak data:', error);
    }
  };

  const saveStreakData = async () => {
    if (!user?.uid) return;
    
    try {
      const data: StreakData = {
        currentStreak: streak,
        consecutiveCorrect,
        isStreakActive: isActive,
        bestStreak,
        lastUpdated: Date.now(),
      };
      const storageKey = getStreakStorageKey(user.uid);
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      
      // Save best streak separately (user-specific)
      if (bestStreak > 0) {
        const bestStreakKey = getBestStreakKey(user.uid);
        await AsyncStorage.setItem(bestStreakKey, bestStreak.toString());
      }
    } catch (error) {
      debugError('storage', 'Error saving streak data:', error);
    }
  };

  const recordCorrectAnswer = useCallback(() => {
    setConsecutiveCorrect(prev => {
      const newCount = prev + 1;
      
      if (newCount >= 3) {
        // Streak is now active or continuing
        const newStreak = newCount;
        setStreak(newStreak);
        setIsActive(true);
        
        // Check for new best streak
        setBestStreak(prevBest => {
          const newBest = Math.max(prevBest, newStreak);
          return newBest;
        });
        
        // Show celebration when streak just activated
        if (prev === 2) {
          setShowCelebration(true);
        }
        
        // Check for milestones
        let nextMilestone: number | undefined;
        
        // First, check predefined milestones
        nextMilestone = MILESTONES.find(m => m === newStreak && m > lastMilestoneRef.current);
        
        // If streak is past max milestone, check for every 5 after max
        if (!nextMilestone && newStreak >= MAX_MILESTONE) {
          // Check if current streak is a multiple of MILESTONE_INTERVAL (5) and greater than last milestone
          if (newStreak % MILESTONE_INTERVAL === 0 && newStreak > lastMilestoneRef.current) {
            nextMilestone = newStreak;
          }
        }
        
        if (nextMilestone) {
          lastMilestoneRef.current = nextMilestone;
          setCurrentMilestone(nextMilestone);
          setShowMilestone(true);
        }
      }
      
      return newCount;
    });
  }, []);

  const recordIncorrectAnswer = useCallback(() => {
    if (isActive) {
      // Streak was active, now broken
      setBrokenStreakCount(streak);
      setWasJustBroken(true);
    }
    
    // Reset everything
    setStreak(0);
    setConsecutiveCorrect(0);
    setIsActive(false);
    lastMilestoneRef.current = 0;
  }, [isActive, streak]);

  const recordSkip = useCallback(() => {
    // Skipping doesn't affect streak
    // User can skip and still maintain their progress
  }, []);

  const resetStreak = useCallback(() => {
    setStreak(0);
    setConsecutiveCorrect(0);
    setIsActive(false);
    setShowCelebration(false);
    setShowMilestone(false);
    setWasJustBroken(false);
    lastMilestoneRef.current = 0;
  }, []);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  const dismissMilestone = useCallback(() => {
    setShowMilestone(false);
    setCurrentMilestone(0);
  }, []);

  const dismissBrokenStreak = useCallback(() => {
    setWasJustBroken(false);
    setBrokenStreakCount(0);
  }, []);

  const getProgress = useCallback((): { current: number; required: number; isBuilding: boolean } => {
    if (isActive) {
      return { current: streak, required: streak, isBuilding: false };
    }
    return { current: consecutiveCorrect, required: 3, isBuilding: true };
  }, [isActive, streak, consecutiveCorrect]);

  const getNextMilestone = useCallback((): number | null => {
    if (!isActive) {
      // If streak not active yet, next milestone is 5
      return 5;
    }

    // Find next predefined milestone
    const nextPredefined = MILESTONES.find(m => m > streak);
    if (nextPredefined) {
      return nextPredefined;
    }

    // If past max milestone, calculate next interval milestone
    if (streak >= MAX_MILESTONE) {
      const nextInterval = Math.ceil((streak + 1) / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      return nextInterval;
    }

    return null;
  }, [isActive, streak]);

  return {
    streak,
    consecutiveCorrect,
    isActive,
    bestStreak,
    showCelebration,
    showMilestone,
    currentMilestone,
    wasJustBroken,
    brokenStreakCount,
    recordCorrectAnswer,
    recordIncorrectAnswer,
    recordSkip,
    resetStreak,
    dismissCelebration,
    dismissMilestone,
    dismissBrokenStreak,
    getProgress,
    getNextMilestone,
  };
}

export default useStreak;

