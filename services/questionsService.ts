import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Query,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Question, Topic, Difficulty, QuestionCategory, questions as mockQuestions } from '@/data/questions';

const QUESTIONS_COLLECTION = 'questions';
const DEFAULT_PAGE_SIZE = 50; // Number of questions to fetch per batch

// Convert Firestore document to Question type
const convertDocToQuestion = (doc: QueryDocumentSnapshot<DocumentData>): Question => {
  const data = doc.data();
  return {
    id: doc.id,
    topic: data.topic as Topic,
    difficulty: data.difficulty as Difficulty,
    type: data.type,
    question: data.question,
    code: data.code || undefined,
    options: data.options || undefined,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    timeLimit: data.timeLimit || undefined,
    category: (data.category as QuestionCategory) || 'general',
    problemNumber: data.problemNumber || undefined,
    problemName: data.problemName || undefined,
  };
};

// Check if a question should be shown (not hidden)
const isQuestionVisible = (doc: QueryDocumentSnapshot<DocumentData>): boolean => {
  const data = doc.data();
  return data.hidden !== true;
};

// Pagination result type
export interface PaginatedQuestionsResult {
  questions: Question[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

// Fetch all questions with pagination (excludes hidden questions)
export const fetchAllQuestions = async (
  pageSize: number = DEFAULT_PAGE_SIZE,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedQuestionsResult> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with pagination
    let q: Query<DocumentData> = query(
      questionsRef,
      orderBy('createdAt', 'desc'), // Order by creation date for consistent pagination
      limit(pageSize)
    );
    
    // Add cursor for pagination if provided
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If no questions in Firebase, return empty with mock data fallback handled by caller
      return {
        questions: [],
        lastDoc: null,
        hasMore: false,
      };
    }
    
    // Filter out hidden questions
    const visibleDocs = snapshot.docs.filter(isQuestionVisible);
    const questions = visibleDocs.map(convertDocToQuestion);
    
    // Get the last visible document for pagination cursor
    const lastDoc = visibleDocs.length > 0 ? visibleDocs[visibleDocs.length - 1] : null;
    
    // Check if there are more documents (if we got a full page, there might be more)
    const hasMore = snapshot.docs.length === pageSize;
    
    return {
      questions,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Return empty result on error - caller should handle fallback
    return {
      questions: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};

// Legacy function for backward compatibility - fetches all questions at once
// WARNING: This loads all questions into memory. Use paginated version for better performance.
export const fetchAllQuestionsLegacy = async (): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      if (__DEV__) {
        console.log('No questions in Firebase, returning mock data');
      }
      return mockQuestions;
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Fallback to mock data if Firebase fails
    return mockQuestions;
  }
};

// Fetch questions by topic (excludes hidden questions)
export const fetchQuestionsByTopic = async (topic: Topic): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const q = query(questionsRef, where('topic', '==', topic));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return mockQuestions.filter(q => q.topic === topic);
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    console.error('Error fetching questions by topic:', error);
    return mockQuestions.filter(q => q.topic === topic);
  }
};

// Fetch questions by difficulty (excludes hidden questions)
export const fetchQuestionsByDifficulty = async (difficulty: Difficulty): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const q = query(questionsRef, where('difficulty', '==', difficulty));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return mockQuestions.filter(q => q.difficulty === difficulty);
    }
    
    // Filter out hidden questions
    return snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
  } catch (error) {
    console.error('Error fetching questions by difficulty:', error);
    return mockQuestions.filter(q => q.difficulty === difficulty);
  }
};

// Fetch questions with filters using Firestore server-side filtering
export const fetchQuestionsWithFilters = async (
  topics?: Topic[],
  difficulties?: Difficulty[],
  category?: QuestionCategory | 'all'
): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with Firestore where clauses for server-side filtering
    let q: Query<DocumentData> = query(questionsRef);
    
    // Apply filters using Firestore where clauses
    // Note: Firestore 'in' queries are limited to 10 items
    if (topics && topics.length > 0) {
      if (topics.length <= 10) {
        // Use server-side filtering if <= 10 topics
        q = query(q, where('topic', 'in', topics));
      }
      // If > 10 topics, we'll filter client-side after fetching
    }
    
    if (difficulties && difficulties.length > 0) {
      if (difficulties.length <= 10) {
        // Use server-side filtering if <= 10 difficulties
        q = query(q, where('difficulty', 'in', difficulties));
      }
      // If > 10 difficulties, we'll filter client-side after fetching
    }
    
    if (category && category !== 'all') {
      // Category is always a single value, use server-side filtering
      q = query(q, where('category', '==', category));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Use mock data with filters
      let filtered = mockQuestions;
      if (topics && topics.length > 0) {
        filtered = filtered.filter((q: Question) => topics.includes(q.topic));
      }
      if (difficulties && difficulties.length > 0) {
        filtered = filtered.filter((q: Question) => difficulties.includes(q.difficulty));
      }
      // Mock questions don't have category, treat as 'general'
      if (category && category !== 'all') {
        filtered = filtered.filter((q: Question) => (q.category || 'general') === category);
      }
      return filtered;
    }
    
    // Filter out hidden questions first
    let visibleDocs = snapshot.docs.filter(isQuestionVisible);
    
    // Apply client-side filters only if they exceed Firestore limits (> 10 items)
    if (topics && topics.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return topics.includes(data.topic);
      });
    }
    
    if (difficulties && difficulties.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return difficulties.includes(data.difficulty);
      });
    }
    
    // Convert to questions
    let questions = visibleDocs.map(convertDocToQuestion);
    
    // Apply additional client-side filters if needed (for > 10 items)
    if (topics && topics.length > 10) {
      questions = questions.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 10) {
      questions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    
    return questions;
  } catch (error: any) {
    // If index error, fall back to client-side filtering
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      if (__DEV__) {
        console.warn('Firestore index required. Falling back to client-side filtering.');
      }
      
      // Fallback: fetch all and filter client-side
      try {
        const questionsRef = collection(db, QUESTIONS_COLLECTION);
        const snapshot = await getDocs(questionsRef);
        
        if (snapshot.empty) {
          let filtered = mockQuestions;
          if (topics && topics.length > 0) {
            filtered = filtered.filter((q: Question) => topics.includes(q.topic));
          }
          if (difficulties && difficulties.length > 0) {
            filtered = filtered.filter((q: Question) => difficulties.includes(q.difficulty));
          }
          if (category && category !== 'all') {
            filtered = filtered.filter((q: Question) => (q.category || 'general') === category);
          }
          return filtered;
        }
        
        let visibleDocs = snapshot.docs.filter(isQuestionVisible);
        let questions = visibleDocs.map(convertDocToQuestion);
        
        // Apply all filters client-side
        if (topics && topics.length > 0) {
          questions = questions.filter(q => topics.includes(q.topic));
        }
        if (difficulties && difficulties.length > 0) {
          questions = questions.filter(q => difficulties.includes(q.difficulty));
        }
        if (category && category !== 'all') {
          questions = questions.filter(q => (q.category || 'general') === category);
        }
        
        return questions;
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
      }
    }
    
    console.error('Error fetching filtered questions:', error);
    // Fallback with filters
    let filtered = mockQuestions;
    if (topics && topics.length > 0) {
      filtered = filtered.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 0) {
      filtered = filtered.filter(q => difficulties.includes(q.difficulty));
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(q => (q.category || 'general') === category);
    }
    return filtered;
  }
};

// Paginated version of fetchQuestionsWithFilters
// Uses Firestore where clauses for server-side filtering when possible
export const fetchQuestionsWithFiltersPaginated = async (
  topics?: Topic[],
  difficulties?: Difficulty[],
  category?: QuestionCategory | 'all',
  pageSize: number = DEFAULT_PAGE_SIZE,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedQuestionsResult> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Build query with Firestore where clauses for server-side filtering
    let q: Query<DocumentData> = query(questionsRef);
    
    // Apply filters using Firestore where clauses
    // Note: Firestore 'in' queries are limited to 10 items
    if (topics && topics.length > 0 && topics.length <= 10) {
      q = query(q, where('topic', 'in', topics));
    }
    
    if (difficulties && difficulties.length > 0 && difficulties.length <= 10) {
      q = query(q, where('difficulty', 'in', difficulties));
    }
    
    if (category && category !== 'all') {
      q = query(q, where('category', '==', category));
    }
    
    // Add ordering and pagination
    // Fetch more to account for hidden questions and client-side filtering if needed
    const fetchLimit = (topics && topics.length > 10) || (difficulties && difficulties.length > 10)
      ? pageSize * 3  // Fetch more if we need client-side filtering
      : pageSize * 2; // Fetch less if server-side filtering is used
    
    q = query(q, orderBy('createdAt', 'desc'), limit(fetchLimit));
    
    // Add cursor for pagination if provided
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        questions: [],
        lastDoc: null,
        hasMore: false,
      };
    }
    
    // Filter out hidden questions first
    let visibleDocs = snapshot.docs.filter(isQuestionVisible);
    
    // Apply client-side filters only if they exceed Firestore limits (> 10 items)
    if (topics && topics.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return topics.includes(data.topic);
      });
    }
    
    if (difficulties && difficulties.length > 10) {
      visibleDocs = visibleDocs.filter(doc => {
        const data = doc.data();
        return difficulties.includes(data.difficulty);
      });
    }
    
    // Convert to questions
    let questions = visibleDocs.map(convertDocToQuestion);
    
    // Apply additional client-side filters if needed (for > 10 items)
    if (topics && topics.length > 10) {
      questions = questions.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 10) {
      questions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    
    // Limit to pageSize after filtering
    questions = questions.slice(0, pageSize);
    
    // Get the last document for pagination cursor
    // Use the last document from the original snapshot for consistent pagination
    const lastDoc = snapshot.docs.length > 0 && snapshot.docs.length === fetchLimit
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;
    
    // Check if there are more documents
    // If we got a full batch and have questions, there might be more
    const hasMore = snapshot.docs.length === fetchLimit && questions.length > 0;
    
    return {
      questions,
      lastDoc,
      hasMore,
    };
  } catch (error: any) {
    // If index error, fall back to fetching all and filtering client-side
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      if (__DEV__) {
        console.warn('Firestore index required. Falling back to client-side filtering.');
      }
      
      // Fallback: fetch without filters, filter client-side
      try {
        const questionsRef = collection(db, QUESTIONS_COLLECTION);
        let q: Query<DocumentData> = query(
          questionsRef,
          orderBy('createdAt', 'desc'),
          limit(pageSize * 3)
        );
        
        if (lastDocument) {
          q = query(q, startAfter(lastDocument));
        }
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          return {
            questions: [],
            lastDoc: null,
            hasMore: false,
          };
        }
        
        // Filter client-side
        let visibleDocs = snapshot.docs.filter(isQuestionVisible);
        
        if (topics && topics.length > 0) {
          visibleDocs = visibleDocs.filter(doc => topics.includes(doc.data().topic));
        }
        if (difficulties && difficulties.length > 0) {
          visibleDocs = visibleDocs.filter(doc => difficulties.includes(doc.data().difficulty));
        }
        if (category && category !== 'all') {
          visibleDocs = visibleDocs.filter(doc => (doc.data().category || 'general') === category);
        }
        
        let questions = visibleDocs.map(convertDocToQuestion).slice(0, pageSize);
        const lastDoc = snapshot.docs.length === pageSize * 3 ? snapshot.docs[snapshot.docs.length - 1] : null;
        const hasMore = snapshot.docs.length === pageSize * 3 && questions.length > 0;
        
        return {
          questions,
          lastDoc,
          hasMore,
        };
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
      }
    }
    
    console.error('Error fetching filtered questions:', error);
    return {
      questions: [],
      lastDoc: null,
      hasMore: false,
    };
  }
};

// Fetch a single question by ID
export const fetchQuestionById = async (questionId: string): Promise<Question | null> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertDocToQuestion(docSnap as QueryDocumentSnapshot<DocumentData>);
    }
    
    // Fallback to mock data
    return mockQuestions.find(q => q.id === questionId) || null;
  } catch (error) {
    console.error('Error fetching question:', error);
    return mockQuestions.find(q => q.id === questionId) || null;
  }
};

// Add a new question
export const addQuestion = async (question: Omit<Question, 'id'>): Promise<string> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const docRef = await addDoc(questionsRef, {
      ...question,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
};

// Update a question
export const updateQuestion = async (
  questionId: string,
  updates: Partial<Question>
): Promise<void> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

// Delete a question
export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

// Seed Firebase with mock questions (useful for initial setup)
export const seedQuestionsToFirebase = async (): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    
    // Check if questions already exist
    const existingDocs = await getDocs(questionsRef);
    if (!existingDocs.empty) {
      console.log('Questions already exist in Firebase, skipping seed');
      return;
    }
    
    // Add each mock question
    for (const question of mockQuestions) {
      const { id, ...questionData } = question;
      const docRef = doc(questionsRef, id);
      batch.set(docRef, {
        ...questionData,
        createdAt: new Date().toISOString(),
      });
    }
    
    await batch.commit();
    console.log('Successfully seeded questions to Firebase');
  } catch (error) {
    console.error('Error seeding questions:', error);
    throw error;
  }
};

