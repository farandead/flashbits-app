import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Question, topicColors, difficultyColors, QuestionCategory } from '@/data/questions';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';

// Category display configuration
const CATEGORY_CONFIG: Record<QuestionCategory, { label: string; color: string }> = {
  general: { label: 'General', color: '#00d4aa' },
  blind75: { label: 'Blind 75', color: '#f59e0b' },
  neetcode150: { label: 'NeetCode 150', color: '#ef4444' },
  leetcode75: { label: 'LeetCode 75', color: '#a855f7' },
};

// Convert problem name to LeetCode URL slug
const getProblemSlug = (problemName: string): string => {
  return problemName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// Generate LeetCode problem URL
const getLeetCodeUrl = (problemName?: string, problemNumber?: number): string | null => {
  if (problemName) {
    const slug = getProblemSlug(problemName);
    return `https://leetcode.com/problems/${slug}/`;
  }
  return null;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, questionId: string, topic?: string, difficulty?: string) => void;
  isActive: boolean;
  wasSkipped?: boolean;
  wasWrong?: boolean;
  showExplanations?: boolean; // Global setting to show/hide explanations
  wasAnswered?: boolean; // Indicates if question was previously answered
  wasAnsweredCorrectly?: boolean; // Indicates if previously answered correctly
  hapticFeedback?: boolean; // Global setting for haptic feedback
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  isActive,
  wasSkipped = false,
  wasWrong = false,
  showExplanations = true, // Default to true
  wasAnswered = false,
  wasAnsweredCorrectly = false,
  hapticFeedback = true, // Default to true
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowExplanation(false);
  }, [question.id]);

  const handleOptionPress = async (index: number) => {
    if (hasAnswered) return;

    // Haptic feedback for selection
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSelectedAnswer(index);
    setHasAnswered(true);

    const isCorrect = index === question.correctAnswer;

    if (isCorrect) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      // Strong vibration feedback for wrong answer
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    // Show explanation after brief delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 300);

    // Report answer to parent (with topic and difficulty for stats tracking)
    onAnswer(isCorrect, question.id, question.topic, question.difficulty);
  };

  const isCorrectAnswer = (index: number) => index === question.correctAnswer;
  const isSelectedAnswer = (index: number) => index === selectedAnswer;

  const getOptionStyle = (index: number) => {
    if (!hasAnswered) {
      return styles.option;
    }

    if (isCorrectAnswer(index)) {
      return [styles.option, styles.optionCorrect];
    }

    if (isSelectedAnswer(index) && !isCorrectAnswer(index)) {
      return [styles.option, styles.optionIncorrect];
    }

    return [styles.option, styles.optionDisabled];
  };

  const getOptionTextStyle = (index: number) => {
    if (!hasAnswered) {
      return styles.optionText;
    }

    if (isCorrectAnswer(index)) {
      return [styles.optionText, styles.optionTextCorrect];
    }

    if (isSelectedAnswer(index) && !isCorrectAnswer(index)) {
      return [styles.optionText, styles.optionTextIncorrect];
    }

    return [styles.optionText, styles.optionTextDisabled];
  };

  return (
    <View style={styles.container}>
      {/* Answered Before Badge - shown if previously answered (takes priority over skipped/wrong) */}
      {wasAnswered && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={[
            styles.revisitBadge,
            wasAnsweredCorrectly ? styles.solvedCorrectlyBadge : styles.solvedBadge,
          ]}
        >
          <Ionicons 
            name={wasAnsweredCorrectly ? "checkmark-circle" : "refresh"} 
            size={16} 
            color={wasAnsweredCorrectly ? "#00FF94" : "#FFB800"} 
          />
          <Text style={[
            styles.revisitText,
            wasAnsweredCorrectly ? styles.solvedCorrectlyText : styles.solvedText
          ]}>
            {wasAnsweredCorrectly ? "Previously Solved ✓" : "Attempted Before"}
          </Text>
        </Animated.View>
      )}
      
      {/* Revisit Badge - only shown if NOT answered yet (still skipped or wrong with no attempt) */}
      {!wasAnswered && (wasSkipped || wasWrong) && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={[
            styles.revisitBadge,
            wasWrong ? styles.revisitBadgeWrong : styles.revisitBadgeSkipped,
          ]}
        >
          <Ionicons 
            name={wasWrong ? 'refresh' : 'play-skip-forward'} 
            size={14} 
            color={wasWrong ? colors.incorrect : colors.warning} 
          />
          <Text style={[
            styles.revisitText,
            wasWrong ? styles.revisitTextWrong : styles.revisitTextSkipped,
          ]}>
            {wasWrong ? 'Previously Wrong' : 'Previously Skipped'}
          </Text>
        </Animated.View>
      )}

      {/* Topic & Category Badges */}
      <View style={styles.header}>
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.topicBadge,
              { backgroundColor: topicColors[question.topic] + '20' },
            ]}
          >
            <Text
              style={[styles.topicText, { color: topicColors[question.topic] }]}
            >
              {question.topic}
            </Text>
          </View>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: difficultyColors[question.difficulty] + '20' },
            ]}
          >
            <Text
              style={[
                styles.difficultyText,
                { color: difficultyColors[question.difficulty] },
              ]}
            >
              {question.difficulty.toUpperCase()}
            </Text>
          </View>
          {/* Category Badge (for blind75, neetcode150, etc.) */}
          {question.category && question.category !== 'general' && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: CATEGORY_CONFIG[question.category].color + '20' },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: CATEGORY_CONFIG[question.category].color },
                ]}
              >
                {CATEGORY_CONFIG[question.category].label}
              </Text>
            </View>
          )}
        </View>
        
        {/* Problem Name & LeetCode Link */}
        {question.problemName && (
          <View style={styles.problemRow}>
            <View style={styles.problemInfo}>
              {question.problemNumber && (
                <Text style={styles.problemNumber}>#{question.problemNumber}</Text>
              )}
              <Text style={styles.problemName} numberOfLines={1}>
                {question.problemName}
              </Text>
            </View>
            {getLeetCodeUrl(question.problemName, question.problemNumber) && (
              <Pressable
                style={styles.leetcodeButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const url = getLeetCodeUrl(question.problemName, question.problemNumber);
                  if (url) {
                    Linking.openURL(url);
                  }
                }}
              >
                <Ionicons name="open-outline" size={14} color={colors.primary} />
                <Text style={styles.leetcodeButtonText}>LeetCode</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>

        {question.code && (
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{question.code}</Text>
          </View>
        )}
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options?.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={getOptionStyle(index)}
            onPress={() => handleOptionPress(index)}
            disabled={hasAnswered}
            activeOpacity={0.7}
          >
            <View style={styles.optionIndexContainer}>
              <Text style={styles.optionIndex}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <Text style={getOptionTextStyle(index)}>{option}</Text>
            {hasAnswered && isCorrectAnswer(index) && (
              <Ionicons name="checkmark" size={20} color={colors.correct} />
            )}
            {hasAnswered &&
              isSelectedAnswer(index) &&
              !isCorrectAnswer(index) && (
                <Ionicons name="close" size={20} color={colors.incorrect} />
              )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Explanation (shown after answer, if enabled in settings) */}
      {showExplanation && showExplanations && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.explanationContainer}
        >
          <View style={styles.explanationHeader}>
            <View style={styles.explanationLabelRow}>
              <Ionicons name="bulb" size={16} color={colors.primary} />
              <Text style={styles.explanationLabel}>Explanation</Text>
            </View>
            <View style={[
              styles.resultBadge,
              selectedAnswer === question.correctAnswer 
                ? styles.resultBadgeCorrect 
                : styles.resultBadgeWrong
            ]}>
              <Text style={styles.resultBadgeText}>
                {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Keep Learning!'}
              </Text>
            </View>
          </View>
          <Text style={styles.explanationText}>{question.explanation}</Text>
          <Text style={styles.swipeHint}>Swipe up for next question</Text>
        </Animated.View>
      )}

      {/* Minimal feedback when explanations are disabled */}
      {showExplanation && !showExplanations && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.minimalFeedback}
        >
          <Text style={[
            styles.minimalFeedbackText,
            selectedAnswer === question.correctAnswer 
              ? styles.minimalFeedbackCorrect 
              : styles.minimalFeedbackWrong
          ]}>
            {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Wrong'}
          </Text>
          <Text style={styles.swipeHintMinimal}>Swipe up for next</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingHorizontal: spacing.base,
    paddingTop: 115,
    paddingBottom: 130,
    justifyContent: 'flex-start',
  },
  revisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 4,
    marginBottom: spacing.xs,
  },
  revisitBadgeSkipped: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  revisitBadgeWrong: {
    backgroundColor: colors.incorrectBg,
    borderWidth: 1,
    borderColor: colors.incorrect + '40',
  },
  solvedCorrectlyBadge: {
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF94' + '40',
  },
  solvedBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFB800' + '40',
  },
  revisitText: {
    fontSize: 10,
    fontWeight: '600',
  },
  solvedCorrectlyText: {
    color: '#00FF94',
  },
  solvedText: {
    color: '#FFB800',
  },
  revisitTextSkipped: {
    color: colors.warning,
  },
  revisitTextWrong: {
    color: colors.incorrect,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  topicBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  topicText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  problemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  problemNumber: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  problemName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  leetcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  leetcodeButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  questionContainer: {
    marginBottom: spacing.lg,
    flex: 0,
  },
  questionText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: typography.fontSize.md * typography.lineHeight.relaxed,
    letterSpacing: -0.2,
  },
  codeBlock: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    lineHeight: typography.fontSize.xs * 1.5,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  optionCorrect: {
    backgroundColor: colors.correctBg,
    borderColor: colors.correct,
  },
  optionIncorrect: {
    backgroundColor: colors.incorrectBg,
    borderColor: colors.incorrect,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIndexContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndex: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: typography.fontSize.sm * 1.4,
  },
  optionTextCorrect: {
    color: colors.correct,
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: colors.incorrect,
  },
  optionTextDisabled: {
    color: colors.textMuted,
  },
  explanationContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  explanationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  explanationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  resultBadgeCorrect: {
    backgroundColor: colors.correctBg,
  },
  resultBadgeWrong: {
    backgroundColor: colors.incorrectBg,
  },
  resultBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  explanationText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
  swipeHint: {
    marginTop: spacing.sm,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  minimalFeedback: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  minimalFeedbackText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  minimalFeedbackCorrect: {
    color: colors.correct,
  },
  minimalFeedbackWrong: {
    color: colors.incorrect,
  },
  swipeHintMinimal: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

