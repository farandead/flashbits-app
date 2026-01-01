import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Question, topicColors, difficultyColors, QuestionCategory } from '@/data/questions';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { submitQuestionReport, ReportType } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';
import { sanitizeString } from '@/utils/sanitize';

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
  const { user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const explanationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Animation values for wrong answer
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);
  const wrongAnswerOpacity = useSharedValue(0);

  const MAX_DESCRIPTION_LENGTH = 500;

  // Reset state when question changes
  useEffect(() => {
    // Clear any pending timeout when question changes
    if (explanationTimeoutRef.current) {
      clearTimeout(explanationTimeoutRef.current);
      explanationTimeoutRef.current = null;
    }
    
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowExplanation(false);
    // Reset animations
    shakeX.value = 0;
    scale.value = 1;
    wrongAnswerOpacity.value = 0;
  }, [question.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (explanationTimeoutRef.current) {
        clearTimeout(explanationTimeoutRef.current);
      }
    };
  }, []);

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
      
      // Trigger shake animation for wrong answer
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      
      // Pulse animation
      scale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      
      // Fade in wrong answer indicator
      wrongAnswerOpacity.value = withTiming(1, { duration: 200 });
    }

    // Show explanation after brief delay
    // Clear any existing timeout first
    if (explanationTimeoutRef.current) {
      clearTimeout(explanationTimeoutRef.current);
    }
    
    explanationTimeoutRef.current = setTimeout(() => {
      setShowExplanation(true);
      explanationTimeoutRef.current = null;
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

  // Animated style for wrong answer shake
  const shakeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shakeX.value },
        { scale: scale.value },
      ],
    };
  });

  // Animated style for wrong answer indicator
  const wrongAnswerIndicatorStyle = useAnimatedStyle(() => {
    return {
      opacity: wrongAnswerOpacity.value,
    };
  });

  const handleReportPress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowReportModal(true);
    setDescriptionError(null);
  };

  const handleDescriptionChange = (text: string) => {
    // Sanitize input in real-time
    const sanitized = sanitizeString(text, MAX_DESCRIPTION_LENGTH);
    setReportDescription(sanitized);
    
    // Clear error if input is now valid
    if (descriptionError && sanitized.length <= MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(null);
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedReportType) {
      Alert.alert('Select Issue', 'Please select the type of issue you found.');
      return;
    }

    // Validate description length
    const trimmedDescription = reportDescription.trim();
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`);
      return;
    }

    // Sanitize description before submission
    const sanitizedDescription = sanitizeString(trimmedDescription, MAX_DESCRIPTION_LENGTH);
    
    setIsSubmitting(true);
    setDescriptionError(null);

    try {
      const result = await submitQuestionReport(question.id, selectedReportType, {
        questionText: question.question,
        topic: question.topic,
        difficulty: question.difficulty,
        description: sanitizedDescription || undefined,
        userId: user?.uid,
        userEmail: user?.email || undefined,
      });

      if (result.success) {
        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Report Submitted', 'Thank you for your feedback! We\'ll review it soon.');
        setShowReportModal(false);
        setSelectedReportType(null);
        setReportDescription('');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportTypes: { type: ReportType; label: string; icon: string }[] = [
    { type: 'wrong_answer', label: 'Wrong Answer', icon: 'close-circle' },
    { type: 'incorrect_explanation', label: 'Incorrect Explanation', icon: 'document-text' },
    { type: 'typo', label: 'Typo or Grammar', icon: 'create' },
    { type: 'unclear_question', label: 'Unclear Question', icon: 'help-circle' },
    { type: 'other', label: 'Other Issue', icon: 'ellipsis-horizontal' },
  ];

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
        
        {/* Problem Name & LeetCode Link & Report Button */}
        <View style={styles.problemRow}>
          {question.problemName ? (
            <View style={styles.problemInfo}>
              {question.problemNumber && (
                <Text style={styles.problemNumber}>#{question.problemNumber}</Text>
              )}
              <Text style={styles.problemName} numberOfLines={1}>
                {question.problemName}
              </Text>
            </View>
          ) : (
            <View style={styles.problemInfo} />
          )}
          <View style={styles.headerActions}>
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
            <Pressable
              style={styles.reportButton}
              onPress={handleReportPress}
            >
              <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.reportButtonText}>Report</Text>
            </Pressable>
          </View>
        </View>
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
        {question.options?.map((option, index) => {
          const isWrongAnswer = hasAnswered && isSelectedAnswer(index) && !isCorrectAnswer(index);
          
          return (
            <Animated.View
              key={index}
              style={isWrongAnswer ? shakeAnimatedStyle : undefined}
            >
              <TouchableOpacity
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
                {isWrongAnswer && (
                  <Animated.View style={wrongAnswerIndicatorStyle}>
                    <Ionicons name="close" size={20} color={colors.incorrect} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowReportModal(false);
              setSelectedReportType(null);
              setReportDescription('');
            }}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
                style={styles.modalScrollView}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Issue</Text>
                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setShowReportModal(false);
                      setSelectedReportType(null);
                      setReportDescription('');
                    }}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Text style={styles.modalSubtitle}>What's wrong with this question?</Text>

                <View style={styles.reportOptionsContainer}>
                  {reportTypes.map((report) => (
                    <Pressable
                      key={report.type}
                      style={[
                        styles.reportOption,
                        selectedReportType === report.type && styles.reportOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedReportType(report.type);
                        if (hapticFeedback) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Ionicons
                        name={report.icon as any}
                        size={14}
                        color={selectedReportType === report.type ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.reportOptionText,
                          selectedReportType === report.type && styles.reportOptionTextSelected,
                        ]}
                      >
                        {report.label}
                      </Text>
                      {selectedReportType === report.type && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>

                <View style={styles.descriptionContainer}>
                  <View style={styles.descriptionHeader}>
                    <Text style={styles.descriptionLabel}>Additional details (optional)</Text>
                    <Text style={[
                      styles.characterCount,
                      reportDescription.length > MAX_DESCRIPTION_LENGTH && styles.characterCountError
                    ]}>
                      {reportDescription.length}/{MAX_DESCRIPTION_LENGTH}
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.descriptionInput,
                      descriptionError && styles.descriptionInputError
                    ]}
                    placeholder="Tell us more about the issue..."
                    placeholderTextColor={colors.textMuted}
                    value={reportDescription}
                    onChangeText={handleDescriptionChange}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={MAX_DESCRIPTION_LENGTH + 50} // Allow slightly more for real-time sanitization
                  />
                  {descriptionError && (
                    <Text style={styles.errorText}>{descriptionError}</Text>
                  )}
                </View>

                <Pressable
                  style={[
                    styles.submitButton,
                    (!selectedReportType || isSubmitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleReportSubmit}
                  disabled={!selectedReportType || isSubmitting}
                >
                  {isSubmitting ? (
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.cardSubtle,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reportButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
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
  // Report Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - (spacing.sm * 2),
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  modalScrollView: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  modalScrollContent: {
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  reportOptionsContainer: {
    marginBottom: spacing.sm,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 40,
  },
  reportOptionSelected: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary + '40',
  },
  reportOptionText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reportOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: spacing.md,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  descriptionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  characterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  characterCountError: {
    color: colors.incorrect,
  },
  descriptionInput: {
    backgroundColor: colors.cardSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    minHeight: 70,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  descriptionInputError: {
    borderColor: colors.incorrect + '60',
    backgroundColor: colors.incorrectBg + '20',
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.incorrect,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.background,
  },
});

