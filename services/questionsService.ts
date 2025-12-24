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
  DocumentData,
  QueryDocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Question, Topic, Difficulty, QuestionCategory, questions as mockQuestions } from '@/data/questions';

const QUESTIONS_COLLECTION = 'questions';

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

// Fetch all questions (excludes hidden questions)
export const fetchAllQuestions = async (): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.empty) {
      console.log('No questions in Firebase, returning mock data');
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

// Fetch questions with filters
export const fetchQuestionsWithFilters = async (
  topics?: Topic[],
  difficulties?: Difficulty[],
  category?: QuestionCategory | 'all'
): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    let snapshot = await getDocs(questionsRef);
    
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
    let questions = snapshot.docs
      .filter(isQuestionVisible)
      .map(convertDocToQuestion);
    
    // Apply filters client-side for complex queries
    if (topics && topics.length > 0) {
      questions = questions.filter(q => topics.includes(q.topic));
    }
    if (difficulties && difficulties.length > 0) {
      questions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    // Filter by category (treat undefined/null as 'general')
    if (category && category !== 'all') {
      questions = questions.filter(q => (q.category || 'general') === category);
    }
    
    return questions;
  } catch (error) {
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

