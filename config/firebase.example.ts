/**
 * Firebase Configuration Example
 * 
 * To set up Firebase:
 * 
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing one
 * 3. Go to Project Settings > General
 * 4. Scroll down to "Your apps" and click the web icon (</>)
 * 5. Register your app and copy the config values
 * 6. Create a .env file in the project root with:
 * 
 * EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
 * EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 * EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
 * EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
 * EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
 * EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
 * 
 * 7. Set up Firestore:
 *    - Go to Build > Firestore Database
 *    - Create database (start in test mode for development)
 *    - The 'questions' collection will be created automatically
 * 
 * Firestore Structure:
 * 
 * questions/
 *   {questionId}/
 *     topic: string (e.g., "Arrays", "Hashmaps")
 *     difficulty: string ("easy" | "medium" | "hard")
 *     type: string ("mcq" | "input")
 *     question: string
 *     code?: string (optional code snippet)
 *     options?: string[] (for MCQ type)
 *     correctAnswer: number | string
 *     explanation: string
 *     timeLimit?: number (optional, in seconds)
 *     createdAt: string (ISO date)
 */

export const firebaseConfigExample = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

