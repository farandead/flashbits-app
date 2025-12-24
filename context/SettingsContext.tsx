import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Topic, Difficulty, Company, QuestionCategory } from '@/data/questions';
import { debug, debugSuccess, debugError } from '@/utils/debug';

const SETTINGS_STORAGE_KEY = '@flashbits_settings';

// All available topics
const ALL_TOPICS: Topic[] = [
  'Arrays',
  'LinkedLists',
  'StacksQueues',
  'Hashing',
  'Trees',
  'Graphs',
  'Sorting',
  'Recursion',
  'Greedy',
  'DP',
  'BitManipulation',
  'Math',
  'AdvancedDS',
  'AdvancedAlgo',
];

// All available difficulties
const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard','cracked'];

// All available companies
const ALL_COMPANIES: Company[] = [
  'Google',
  'Meta',
  'Amazon',
  'Apple',
  'Microsoft',
  'Netflix',
  'Tesla',
  'Uber',
  'Airbnb',
  'LinkedIn',
  'Twitter',
  'Spotify',
  'Adobe',
  'Salesforce',
  'Bloomberg',
  'Oracle',
  'Nvidia',
  'Intel',
];

// All available categories
const ALL_CATEGORIES: QuestionCategory[] = ['general', 'blind75', 'neetcode150', 'leetcode75'];

// Question status filter options
export type QuestionStatusFilter = 'all' | 'new' | 'attempted' | 'unattempted';

interface SettingsContextType {
  // Selected filters
  selectedTopics: Set<Topic>;
  selectedDifficulties: Set<Difficulty>;
  selectedCompanies: Set<Company>;
  selectedCategory: QuestionCategory | 'all';
  questionStatusFilter: QuestionStatusFilter;
  
  // Preferences
  showExplanations: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  notificationsEnabled: boolean;
  
  // Actions
  setSelectedTopics: (topics: Set<Topic>) => void;
  setSelectedDifficulties: (difficulties: Set<Difficulty>) => void;
  setSelectedCompanies: (companies: Set<Company>) => void;
  setSelectedCategory: (category: QuestionCategory | 'all') => void;
  setQuestionStatusFilter: (filter: QuestionStatusFilter) => void;
  toggleTopic: (topic: Topic) => void;
  toggleDifficulty: (difficulty: Difficulty) => void;
  toggleCompany: (company: Company) => void;
  selectAllTopics: () => void;
  selectAllCompanies: () => void;
  setShowExplanations: (value: boolean) => void;
  setHapticFeedback: (value: boolean) => void;
  setSoundEffects: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  
  // Helpers
  allTopics: Topic[];
  allDifficulties: Difficulty[];
  allCompanies: Company[];
  allCategories: QuestionCategory[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to serialize settings for storage
interface StoredSettings {
  selectedTopics: Topic[];
  selectedDifficulties: Difficulty[];
  selectedCompanies: Company[];
  selectedCategory: QuestionCategory | 'all';
  questionStatusFilter: QuestionStatusFilter;
  showExplanations: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
  notificationsEnabled: boolean;
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [selectedTopics, setSelectedTopics] = useState<Set<Topic>>(
    new Set(ALL_TOPICS)
  );
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Difficulty>>(
    new Set(ALL_DIFFICULTIES)
  );
  const [selectedCompanies, setSelectedCompanies] = useState<Set<Company>>(
    new Set(ALL_COMPANIES)
  );
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'all'>('all');
  const [questionStatusFilter, setQuestionStatusFilter] = useState<QuestionStatusFilter>('all');
  const [showExplanations, setShowExplanations] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      debug('settings', 'Loading settings from AsyncStorage...');
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const settings: StoredSettings = JSON.parse(stored);
          debugSuccess('settings', 'Settings loaded:', {
            topics: settings.selectedTopics?.length,
            difficulties: settings.selectedDifficulties?.length,
            statusFilter: settings.questionStatusFilter,
          });
          
          // Restore settings, using defaults if values are missing
          if (settings.selectedTopics?.length > 0) {
            setSelectedTopics(new Set(settings.selectedTopics));
          }
          if (settings.selectedDifficulties?.length > 0) {
            setSelectedDifficulties(new Set(settings.selectedDifficulties));
          }
          if (settings.selectedCompanies?.length > 0) {
            setSelectedCompanies(new Set(settings.selectedCompanies));
          }
          if (settings.selectedCategory) {
            setSelectedCategory(settings.selectedCategory);
          }
          if (settings.questionStatusFilter) {
            setQuestionStatusFilter(settings.questionStatusFilter);
          }
          if (typeof settings.showExplanations === 'boolean') {
            setShowExplanations(settings.showExplanations);
          }
          if (typeof settings.hapticFeedback === 'boolean') {
            setHapticFeedback(settings.hapticFeedback);
          }
          if (typeof settings.soundEffects === 'boolean') {
            setSoundEffects(settings.soundEffects);
          }
          if (typeof settings.notificationsEnabled === 'boolean') {
            setNotificationsEnabled(settings.notificationsEnabled);
          }
        } else {
          debug('settings', 'No stored settings found, using defaults');
        }
      } catch (error) {
        debugError('settings', 'Failed to load settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadSettings();
  }, []);

  // Save settings to AsyncStorage whenever they change
  useEffect(() => {
    // Don't save until initial load is complete
    if (!isLoaded) return;
    
    const saveSettings = async () => {
      try {
        const settings: StoredSettings = {
          selectedTopics: Array.from(selectedTopics),
          selectedDifficulties: Array.from(selectedDifficulties),
          selectedCompanies: Array.from(selectedCompanies),
          selectedCategory,
          questionStatusFilter,
          showExplanations,
          hapticFeedback,
          soundEffects,
          notificationsEnabled,
        };
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        debug('settings', 'Settings saved to AsyncStorage');
      } catch (error) {
        debugError('settings', 'Failed to save settings:', error);
      }
    };
    
    saveSettings();
  }, [
    selectedTopics,
    selectedDifficulties,
    selectedCompanies,
    selectedCategory,
    questionStatusFilter,
    showExplanations,
    hapticFeedback,
    soundEffects,
    notificationsEnabled,
    isLoaded,
  ]);

  // Toggle a single topic
  const toggleTopic = (topic: Topic) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        // Don't allow deselecting all topics
        if (next.size > 1) {
          next.delete(topic);
        }
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  // Toggle a single difficulty
  const toggleDifficulty = (difficulty: Difficulty) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(difficulty)) {
        // Don't allow deselecting all difficulties
        if (next.size > 1) {
          next.delete(difficulty);
        }
      } else {
        next.add(difficulty);
      }
      return next;
    });
  };

  // Toggle a single company
  const toggleCompany = (company: Company) => {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) {
        // Don't allow deselecting all companies
        if (next.size > 1) {
          next.delete(company);
        }
      } else {
        next.add(company);
      }
      return next;
    });
  };

  // Select all topics
  const selectAllTopics = () => {
    setSelectedTopics(new Set(ALL_TOPICS));
  };

  // Select all companies
  const selectAllCompanies = () => {
    setSelectedCompanies(new Set(ALL_COMPANIES));
  };

  return (
    <SettingsContext.Provider
      value={{
        selectedTopics,
        selectedDifficulties,
        selectedCompanies,
        selectedCategory,
        questionStatusFilter,
        showExplanations,
        hapticFeedback,
        soundEffects,
        notificationsEnabled,
        setSelectedTopics,
        setSelectedDifficulties,
        setSelectedCompanies,
        setSelectedCategory,
        setQuestionStatusFilter,
        toggleTopic,
        toggleDifficulty,
        toggleCompany,
        selectAllTopics,
        selectAllCompanies,
        setShowExplanations,
        setHapticFeedback,
        setSoundEffects,
        setNotificationsEnabled,
        allTopics: ALL_TOPICS,
        allDifficulties: ALL_DIFFICULTIES,
        allCompanies: ALL_COMPANIES,
        allCategories: ALL_CATEGORIES,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

