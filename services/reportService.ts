/**
 * Report Service - Handles user reports/complaints about questions
 */

import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { debug, debugError, debugSuccess } from '@/utils/debug';

export type ReportType = 
  | 'wrong_answer'
  | 'incorrect_explanation'
  | 'typo'
  | 'unclear_question'
  | 'other';

export interface QuestionReport {
  questionId: string;
  questionText?: string; // First 200 chars for context
  topic?: string;
  difficulty?: string;
  reportType: ReportType;
  description?: string; // Optional user description
  userId?: string; // Optional - only if user is logged in
  userEmail?: string; // Optional - only if user is logged in
  createdAt: any; // Firestore Timestamp
  status: 'pending' | 'reviewed' | 'resolved';
}

const REPORTS_COLLECTION = 'questionReports';

/**
 * Submit a report about a question
 */
export const submitQuestionReport = async (
  questionId: string,
  reportType: ReportType,
  options: {
    questionText?: string;
    topic?: string;
    difficulty?: string;
    description?: string;
    userId?: string;
    userEmail?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    debug('questions', 'Submitting question report', { questionId, reportType });

    // Truncate question text if provided
    const questionText = options.questionText 
      ? options.questionText.substring(0, 200)
      : undefined;

    // Build report object, only including fields that are not undefined
    const report: any = {
      questionId,
      reportType,
      status: 'pending',
    };

    // Only add optional fields if they have values
    if (questionText) {
      report.questionText = questionText;
    }
    if (options.topic) {
      report.topic = options.topic;
    }
    if (options.difficulty) {
      report.difficulty = options.difficulty;
    }
    if (options.description?.trim()) {
      report.description = options.description.trim();
    }
    if (options.userId) {
      report.userId = options.userId;
    }
    if (options.userEmail) {
      report.userEmail = options.userEmail;
    }

    await addDoc(collection(db, REPORTS_COLLECTION), {
      ...report,
      createdAt: serverTimestamp(),
    });

    debugSuccess('questions', 'Question report submitted successfully', { questionId });
    return { success: true };
  } catch (error) {
    debugError('questions', 'Failed to submit question report', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

