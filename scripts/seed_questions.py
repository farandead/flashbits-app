#!/usr/bin/env python3
"""
FlashPrep - Firebase Question Seeder

This script seeds questions to your Firebase Firestore database.
You can run this to populate questions in bulk.

Setup:
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as 'serviceAccountKey.json' in the scripts folder
4. Install dependencies: pip install firebase-admin
5. Run: python seed_questions.py

Usage:
  python seed_questions.py                    # Seed default questions
  python seed_questions.py --file questions.json  # Seed from JSON file
  python seed_questions.py --clear            # Clear all questions first
"""

import json
import os
import argparse
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed!")
    print("Run: pip install firebase-admin")
    exit(1)

# Path to your service account key
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(SCRIPT_DIR, "serviceAccountKey.json")

# Default questions (same as in data/questions.ts)
DEFAULT_QUESTIONS = [
    {
        "id": "1",
        "topic": "Arrays",
        "difficulty": "easy",
        "type": "mcq",
        "question": "What is the time complexity of accessing an element in an array by index?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correctAnswer": 0,
        "explanation": "Array access by index is O(1) because arrays use contiguous memory locations, allowing direct calculation of the memory address.",
        "timeLimit": 30
    },
    {
        "id": "2",
        "topic": "Hashmaps",
        "difficulty": "easy",
        "type": "mcq",
        "question": "What is the average time complexity for insertion in a HashMap?",
        "options": ["O(n)", "O(1)", "O(log n)", "O(n log n)"],
        "correctAnswer": 1,
        "explanation": "HashMap insertion is O(1) on average due to direct hash computation. Worst case is O(n) when all keys hash to the same bucket.",
        "timeLimit": 30
    },
    {
        "id": "3",
        "topic": "Arrays",
        "difficulty": "medium",
        "type": "mcq",
        "question": "Given an array [2, 7, 11, 15] and target 9, which indices sum to the target?",
        "code": "nums = [2, 7, 11, 15]\ntarget = 9",
        "options": ["[0, 1]", "[1, 2]", "[0, 2]", "[0, 3]"],
        "correctAnswer": 0,
        "explanation": "nums[0] + nums[1] = 2 + 7 = 9. This is the classic 'Two Sum' problem, optimally solved with a HashMap in O(n) time.",
        "timeLimit": 45
    },
    {
        "id": "4",
        "topic": "Strings",
        "difficulty": "easy",
        "type": "mcq",
        "question": "Which method checks if a string is a palindrome?",
        "options": ["s == s.reverse()", "s == s[::-1]", "s.isPalindrome()", "s.reverse() == s.length"],
        "correctAnswer": 1,
        "explanation": "In Python, s[::-1] creates a reversed copy of the string. Comparing it to the original string checks if it reads the same forwards and backwards.",
        "timeLimit": 30
    },
    {
        "id": "5",
        "topic": "Trees",
        "difficulty": "medium",
        "type": "mcq",
        "question": "What is the maximum number of nodes at level L in a binary tree?",
        "options": ["L", "2^L", "2^(L-1)", "L²"],
        "correctAnswer": 1,
        "explanation": "At level L, a binary tree can have at most 2^L nodes. Level 0 (root) has 1 node, level 1 has 2 nodes, level 2 has 4 nodes, and so on.",
        "timeLimit": 45
    },
    {
        "id": "6",
        "topic": "LinkedList",
        "difficulty": "easy",
        "type": "mcq",
        "question": "What is the time complexity to insert at the beginning of a singly linked list?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correctAnswer": 0,
        "explanation": "Inserting at the head of a linked list is O(1) - just create a new node and point it to the current head.",
        "timeLimit": 30
    },
    {
        "id": "7",
        "topic": "DP",
        "difficulty": "medium",
        "type": "mcq",
        "question": "What is the time complexity of the naive recursive Fibonacci solution?",
        "options": ["O(n)", "O(n²)", "O(2^n)", "O(log n)"],
        "correctAnswer": 2,
        "explanation": "Naive recursive Fibonacci has O(2^n) time complexity due to overlapping subproblems. Each call branches into two more calls.",
        "timeLimit": 45
    },
    {
        "id": "8",
        "topic": "Graphs",
        "difficulty": "medium",
        "type": "mcq",
        "question": "Which algorithm finds the shortest path in an unweighted graph?",
        "options": ["DFS", "BFS", "Dijkstra", "Bellman-Ford"],
        "correctAnswer": 1,
        "explanation": "BFS finds the shortest path in unweighted graphs because it explores all nodes at distance k before nodes at distance k+1.",
        "timeLimit": 45
    },
    {
        "id": "9",
        "topic": "Hashmaps",
        "difficulty": "medium",
        "type": "mcq",
        "question": "What happens when two different keys hash to the same index?",
        "options": ["Error is thrown", "Second key overwrites first", "Collision handling (chaining/probing)", "HashMap automatically resizes"],
        "correctAnswer": 2,
        "explanation": "Hash collisions are resolved using techniques like chaining (linked lists at each bucket) or open addressing (probing for empty slots).",
        "timeLimit": 45
    },
    {
        "id": "10",
        "topic": "Recursion",
        "difficulty": "easy",
        "type": "mcq",
        "question": "What are the two essential parts of a recursive function?",
        "options": ["Loop and condition", "Base case and recursive case", "Input and output", "Stack and heap"],
        "correctAnswer": 1,
        "explanation": "Every recursive function needs a base case (stopping condition) and a recursive case (function calling itself with modified parameters).",
        "timeLimit": 30
    },
    {
        "id": "11",
        "topic": "Arrays",
        "difficulty": "hard",
        "type": "mcq",
        "question": "What is the best time complexity for finding the kth largest element in an unsorted array?",
        "options": ["O(n log n)", "O(n)", "O(k log n)", "O(n log k)"],
        "correctAnswer": 1,
        "explanation": "QuickSelect algorithm achieves O(n) average time complexity using partitioning, similar to QuickSort but only recursing into one partition.",
        "timeLimit": 60
    },
    {
        "id": "12",
        "topic": "Trees",
        "difficulty": "easy",
        "type": "mcq",
        "question": "In a BST, where is the smallest element located?",
        "options": ["Root node", "Leftmost node", "Rightmost node", "Random position"],
        "correctAnswer": 1,
        "explanation": "In a Binary Search Tree, smaller elements go left. The smallest element is at the leftmost node - keep going left until you cannot anymore.",
        "timeLimit": 30
    },
    {
        "id": "13",
        "topic": "Strings",
        "difficulty": "medium",
        "type": "mcq",
        "question": "What is the time complexity of checking if two strings are anagrams using sorting?",
        "options": ["O(n)", "O(n log n)", "O(n²)", "O(1)"],
        "correctAnswer": 1,
        "explanation": "Sorting both strings takes O(n log n). After sorting, comparing them is O(n). Total is O(n log n). Note: Using a hashmap can achieve O(n).",
        "timeLimit": 45
    },
    {
        "id": "14",
        "topic": "Graphs",
        "difficulty": "easy",
        "type": "mcq",
        "question": "Which data structure is typically used for BFS traversal?",
        "options": ["Stack", "Queue", "Heap", "Tree"],
        "correctAnswer": 1,
        "explanation": "BFS uses a Queue (FIFO) to explore nodes level by level. DFS uses a Stack (or recursion, which uses the call stack).",
        "timeLimit": 30
    },
    {
        "id": "15",
        "topic": "DP",
        "difficulty": "hard",
        "type": "mcq",
        "question": "What is the space complexity of bottom-up DP for the 0/1 Knapsack problem?",
        "options": ["O(n)", "O(W)", "O(nW)", "O(n + W)"],
        "correctAnswer": 2,
        "explanation": "Standard bottom-up 0/1 Knapsack uses a 2D table of size n × W, where n is items and W is capacity. Can be optimized to O(W) with 1D array.",
        "timeLimit": 60
    }
]


def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Service account key not found at: {SERVICE_ACCOUNT_PATH}")
        print("\nTo fix this:")
        print("1. Go to Firebase Console > Project Settings > Service Accounts")
        print("2. Click 'Generate new private key'")
        print("3. Save the file as 'serviceAccountKey.json' in the scripts folder")
        exit(1)
    
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized successfully")
        return firestore.client()
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        exit(1)


def clear_questions(db):
    """Delete all questions from the collection"""
    print("🗑️  Clearing existing questions...")
    questions_ref = db.collection("questions")
    docs = questions_ref.stream()
    
    count = 0
    for doc in docs:
        doc.reference.delete()
        count += 1
    
    print(f"   Deleted {count} questions")


def seed_questions(db, questions, clear_first=False):
    """Seed questions to Firestore"""
    if clear_first:
        clear_questions(db)
    
    print(f"\n🌱 Seeding {len(questions)} questions to Firebase...")
    
    questions_ref = db.collection("questions")
    success_count = 0
    
    for question in questions:
        try:
            doc_id = question.get("id", None)
            question_data = {
                **question,
                "createdAt": datetime.now().isoformat(),
            }
            
            if doc_id:
                # Use the ID as document ID
                del question_data["id"]  # Don't store id in the document
                questions_ref.document(doc_id).set(question_data)
            else:
                # Auto-generate ID
                questions_ref.add(question_data)
            
            success_count += 1
            print(f"   ✅ Added: {question.get('topic', 'Unknown')} - {question.get('question', '')[:50]}...")
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
    
    print(f"\n🎉 Successfully seeded {success_count}/{len(questions)} questions!")


def load_questions_from_file(filepath):
    """Load questions from a JSON file"""
    try:
        with open(filepath, 'r') as f:
            questions = json.load(f)
        print(f"📁 Loaded {len(questions)} questions from {filepath}")
        return questions
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        exit(1)


def main():
    parser = argparse.ArgumentParser(description="Seed questions to Firebase")
    parser.add_argument("--file", "-f", help="Path to JSON file with questions")
    parser.add_argument("--clear", "-c", action="store_true", help="Clear existing questions first")
    args = parser.parse_args()
    
    print("\n" + "="*50)
    print("🔥 FlashPrep Firebase Seeder")
    print("="*50 + "\n")
    
    # Initialize Firebase
    db = init_firebase()
    
    # Load questions
    if args.file:
        questions = load_questions_from_file(args.file)
    else:
        questions = DEFAULT_QUESTIONS
        print(f"📦 Using {len(questions)} default questions")
    
    # Seed questions
    seed_questions(db, questions, clear_first=args.clear)
    
    print("\n✨ Done! Check your Firebase Console to verify.")
    print("   https://console.firebase.google.com/project/flashprep-11c85/firestore")


if __name__ == "__main__":
    main()

