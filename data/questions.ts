export type QuestionType = 'mcq' | 'input';
export type QuestionCategory = 'general' | 'blind75' | 'neetcode150' | 'leetcode75';
export type Topic = 
  | 'Arrays'
  | 'LinkedLists'
  | 'StacksQueues'
  | 'Hashing'
  | 'Trees'
  | 'Graphs'
  | 'Sorting'
  | 'Recursion'
  | 'Greedy'
  | 'DP'
  | 'BitManipulation'
  | 'Math'
  | 'AdvancedDS'
  | 'AdvancedAlgo';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'cracked';
export type Company = 
  | 'Google' 
  | 'Meta' 
  | 'Amazon' 
  | 'Apple' 
  | 'Microsoft' 
  | 'Netflix' 
  | 'Tesla' 
  | 'Uber' 
  | 'Airbnb' 
  | 'LinkedIn' 
  | 'Twitter' 
  | 'Spotify' 
  | 'Adobe' 
  | 'Salesforce'
  | 'Bloomberg'
  | 'Oracle'
  | 'Nvidia'
  | 'Intel';

export interface Question {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  code?: string;
  options?: string[];
  correctAnswer: string | number; // index for MCQ, string for input
  explanation: string;
  timeLimit?: number; // in seconds
  companies?: Company[]; // Companies that have asked this question
  category?: QuestionCategory; // Question collection/category (defaults to 'general')
  problemNumber?: number; // LeetCode problem number (for blind75, neetcode150, etc.)
  problemName?: string; // Problem name (e.g., "Two Sum", "Best Time to Buy Stock")
}

// Mock questions for MVP
export const questions: Question[] = [
  {
    id: '1',
    topic: 'Arrays',
    difficulty: 'easy',
    type: 'mcq',
    question: 'What is the time complexity of accessing an element in an array by index?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    correctAnswer: 0,
    explanation: 'Array access by index is O(1) because arrays use contiguous memory locations, allowing direct calculation of the memory address.',
    timeLimit: 30,
  },
  {
    id: '2',
    topic: 'Hashing',
    difficulty: 'easy',
    type: 'mcq',
    question: 'What is the average time complexity for insertion in a HashMap?',
    options: ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'],
    correctAnswer: 1,
    explanation: 'HashMap insertion is O(1) on average due to direct hash computation. Worst case is O(n) when all keys hash to the same bucket.',
    timeLimit: 30,
  },
  {
    id: '3',
    topic: 'Arrays',
    difficulty: 'medium',
    type: 'mcq',
    question: 'Given an array [2, 7, 11, 15] and target 9, which indices sum to the target?',
    code: 'nums = [2, 7, 11, 15]\ntarget = 9',
    options: ['[0, 1]', '[1, 2]', '[0, 2]', '[0, 3]'],
    correctAnswer: 0,
    explanation: 'nums[0] + nums[1] = 2 + 7 = 9. This is the classic "Two Sum" problem, optimally solved with a HashMap in O(n) time.',
    timeLimit: 45,
  },
  {
    id: '4',
    topic: 'Arrays',
    difficulty: 'easy',
    type: 'mcq',
    question: 'Which method checks if a string is a palindrome?',
    options: [
      's == s.reverse()',
      's == s[::-1]',
      's.isPalindrome()',
      's.reverse() == s.length'
    ],
    correctAnswer: 1,
    explanation: 'In Python, s[::-1] creates a reversed copy of the string. Comparing it to the original string checks if it reads the same forwards and backwards.',
    timeLimit: 30,
  },
  {
    id: '5',
    topic: 'Trees',
    difficulty: 'medium',
    type: 'mcq',
    question: 'What is the maximum number of nodes at level L in a binary tree?',
    options: ['L', '2^L', '2^(L-1)', 'L²'],
    correctAnswer: 1,
    explanation: 'At level L, a binary tree can have at most 2^L nodes. Level 0 (root) has 1 node, level 1 has 2 nodes, level 2 has 4 nodes, and so on.',
    timeLimit: 45,
  },
  {
    id: '6',
    topic: 'LinkedLists',
    difficulty: 'easy',
    type: 'mcq',
    question: 'What is the time complexity to insert at the beginning of a singly linked list?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    correctAnswer: 0,
    explanation: 'Inserting at the head of a linked list is O(1) - just create a new node and point it to the current head.',
    timeLimit: 30,
  },
  {
    id: '7',
    topic: 'DP',
    difficulty: 'medium',
    type: 'mcq',
    question: 'What is the time complexity of the naive recursive Fibonacci solution?',
    options: ['O(n)', 'O(n²)', 'O(2^n)', 'O(log n)'],
    correctAnswer: 2,
    explanation: 'Naive recursive Fibonacci has O(2^n) time complexity due to overlapping subproblems. Each call branches into two more calls.',
    timeLimit: 45,
  },
  {
    id: '8',
    topic: 'Graphs',
    difficulty: 'medium',
    type: 'mcq',
    question: 'Which algorithm finds the shortest path in an unweighted graph?',
    options: ['DFS', 'BFS', 'Dijkstra', 'Bellman-Ford'],
    correctAnswer: 1,
    explanation: 'BFS finds the shortest path in unweighted graphs because it explores all nodes at distance k before nodes at distance k+1.',
    timeLimit: 45,
  },
  {
    id: '9',
    topic: 'Hashing',
    difficulty: 'medium',
    type: 'mcq',
    question: 'What happens when two different keys hash to the same index?',
    options: [
      'Error is thrown',
      'Second key overwrites first',
      'Collision handling (chaining/probing)',
      'HashMap automatically resizes'
    ],
    correctAnswer: 2,
    explanation: 'Hash collisions are resolved using techniques like chaining (linked lists at each bucket) or open addressing (probing for empty slots).',
    timeLimit: 45,
  },
  {
    id: '10',
    topic: 'Recursion',
    difficulty: 'easy',
    type: 'mcq',
    question: 'What are the two essential parts of a recursive function?',
    options: [
      'Loop and condition',
      'Base case and recursive case',
      'Input and output',
      'Stack and heap'
    ],
    correctAnswer: 1,
    explanation: 'Every recursive function needs a base case (stopping condition) and a recursive case (function calling itself with modified parameters).',
    timeLimit: 30,
  },
  {
    id: '11',
    topic: 'Arrays',
    difficulty: 'hard',
    type: 'mcq',
    question: 'What is the best time complexity for finding the kth largest element in an unsorted array?',
    options: ['O(n log n)', 'O(n)', 'O(k log n)', 'O(n log k)'],
    correctAnswer: 1,
    explanation: 'QuickSelect algorithm achieves O(n) average time complexity using partitioning, similar to QuickSort but only recursing into one partition.',
    timeLimit: 60,
  },
  {
    id: '12',
    topic: 'Trees',
    difficulty: 'easy',
    type: 'mcq',
    question: 'In a BST, where is the smallest element located?',
    options: [
      'Root node',
      'Leftmost node',
      'Rightmost node',
      'Random position'
    ],
    correctAnswer: 1,
    explanation: 'In a Binary Search Tree, smaller elements go left. The smallest element is at the leftmost node - keep going left until you cannot anymore.',
    timeLimit: 30,
  },
  {
    id: '13',
    topic: 'Arrays',
    difficulty: 'medium',
    type: 'mcq',
    question: 'What is the time complexity of checking if two strings are anagrams using sorting?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
    correctAnswer: 1,
    explanation: 'Sorting both strings takes O(n log n). After sorting, comparing them is O(n). Total is O(n log n). Note: Using a hashmap can achieve O(n).',
    timeLimit: 45,
  },
  {
    id: '14',
    topic: 'Graphs',
    difficulty: 'easy',
    type: 'mcq',
    question: 'Which data structure is typically used for BFS traversal?',
    options: ['Stack', 'Queue', 'Heap', 'Tree'],
    correctAnswer: 1,
    explanation: 'BFS uses a Queue (FIFO) to explore nodes level by level. DFS uses a Stack (or recursion, which uses the call stack).',
    timeLimit: 30,
  },
  {
    id: '15',
    topic: 'DP',
    difficulty: 'hard',
    type: 'mcq',
    question: 'What is the space complexity of bottom-up DP for the 0/1 Knapsack problem?',
    options: ['O(n)', 'O(W)', 'O(nW)', 'O(n + W)'],
    correctAnswer: 2,
    explanation: 'Standard bottom-up 0/1 Knapsack uses a 2D table of size n × W, where n is items and W is capacity. Can be optimized to O(W) with 1D array.',
    timeLimit: 60,
  },
];

// Topic color mapping
export const topicColors: Record<Topic, string> = {
  Arrays: '#FF6B6B',
  LinkedLists: '#AA96DA',
  StacksQueues: '#4ECDC4',
  Hashing: '#FFE66D',
  Trees: '#95E1D3',
  Graphs: '#DDA0DD',
  Sorting: '#FF9F43',
  Recursion: '#FCE38A',
  Greedy: '#5F27CD',
  DP: '#F38181',
  BitManipulation: '#00D2D3',
  Math: '#FD79A8',
  AdvancedDS: '#6C5CE7',
  AdvancedAlgo: '#A29BFE',
};

// Difficulty color mapping
export const difficultyColors: Record<Difficulty, string> = {
  easy: '#00FF94',
  medium: '#FFB800',
  hard: '#FF4D6A',
  cracked: '#9D4EDD',
};

// Company color/logo mapping
export const companyColors: Record<Company, string> = {
  Google: '#4285F4',
  Meta: '#1877F2',
  Amazon: '#FF9900',
  Apple: '#A2AAAD',
  Microsoft: '#00A4EF',
  Netflix: '#E50914',
  Tesla: '#E82127',
  Uber: '#000000',
  Airbnb: '#FF5A5F',
  LinkedIn: '#0A66C2',
  Twitter: '#1DA1F2',
  Spotify: '#1DB954',
  Adobe: '#FF0000',
  Salesforce: '#00A1E0',
  Bloomberg: '#F56300',
  Oracle: '#F80000',
  Nvidia: '#76B900',
  Intel: '#0071C5',
};

