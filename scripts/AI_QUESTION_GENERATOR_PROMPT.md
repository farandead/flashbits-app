# AI Question Generator Prompt for Flashbits

Copy and paste this prompt to any AI (ChatGPT, Claude, etc.) to generate questions for your Flashbits app.

---

## 🎯 THE PROMPT (General DSA Questions)

```
You are a coding interview question writer for a mobile flashcard app called Flashbits. The app helps developers prepare for technical interviews with TikTok-style swipeable question cards.

Generate [NUMBER] multiple choice questions about [TOPIC] at [DIFFICULTY] level.

## OUTPUT FORMAT

Return ONLY valid JSON array. No markdown, no explanation, just the JSON:

[
  {
    "id": "[unique-id]",
    "topic": "[Topic]",
    "difficulty": "[easy|medium|hard|cracked]",
    "type": "mcq",
    "category": "general",
    "question": "[Question text]",
    "code": "[Optional code snippet - use \\n for newlines]",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": [0-3 index of correct option],
    "explanation": "[1-2 sentence explanation of why the answer is correct]",
    "timeLimit": [30|45|60|90 based on difficulty],
    "companies": ["Optional array of companies that have asked this question, e.g. Google, Meta, Amazon"]
  }
]

## VALID CATEGORIES
- general (Default - DSA concept questions)
- blind75 (Blind 75 LeetCode problems as MCQs)
- neetcode150 (NeetCode 150 problems as MCQs)
- leetcode75 (LeetCode 75 Study Plan problems as MCQs)

## VALID TOPICS
- Arrays
- LinkedLists (Linked Lists)
- StacksQueues (Stacks & Queues)
- Hashing
- Trees
- Graphs
- Sorting (Sorting & Searching)
- Recursion (Recursion & Backtracking)
- Greedy (Greedy Algorithms)
- DP (Dynamic Programming)
- BitManipulation (Bit Manipulation)
- Math (Math & Number Theory)
- AdvancedDS (Advanced Data Structures)
- AdvancedAlgo (Advanced Algorithms)

## VALID COMPANIES (Optional)
Add companies that have asked similar questions in real interviews:
- Google
- Meta
- Amazon
- Apple
- Microsoft
- Netflix
- Tesla
- Uber
- Airbnb
- LinkedIn
- Twitter
- Spotify
- Adobe
- Salesforce
- Bloomberg
- Oracle
- Nvidia
- Intel

## DIFFICULTY GUIDELINES

**Easy (timeLimit: 30)**
- Basic concept recall
- Single-step reasoning
- Fundamental operations
- Example: "What is the time complexity of array access by index?"

**Medium (timeLimit: 45)**
- Apply concepts to scenarios
- Multi-step reasoning
- Common interview patterns
- Example: "Given array [2,7,11,15] and target 9, which indices sum to target?"

**Hard (timeLimit: 60)**
- Complex algorithms
- Edge cases and optimizations
- Advanced data structures
- Example: "What's the time complexity of QuickSelect for finding kth largest?"

**Cracked Dev (timeLimit: 90)**
- Elite-level mastery questions
- System design concepts
- Advanced optimization techniques
- Combination of multiple complex patterns
- Example: "Design a distributed cache with O(1) eviction and eventual consistency"

## QUESTION GUIDELINES

1. Questions should be clear and concise (mobile-friendly)
2. Options should be plausible (no obviously wrong answers)
3. Only ONE option should be correct
4. Explanations should teach, not just state the answer
5. Include code snippets when it helps clarify the question
6. Avoid questions that require writing long code
7. Focus on concepts, time/space complexity, and understanding
8. Make questions practical for real interview prep

## CODE SNIPPET FORMAT
Use \\n for newlines in code:
"code": "def example():\\n    return True"

## EXAMPLE OUTPUT (General)

[
  {
    "id": "arrays-easy-001",
    "topic": "Arrays",
    "difficulty": "easy",
    "type": "mcq",
    "category": "general",
    "question": "What is the time complexity of accessing an element in an array by index?",
    "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    "correctAnswer": 0,
    "explanation": "Array access by index is O(1) because arrays use contiguous memory, allowing direct address calculation.",
    "timeLimit": 30
  },
  {
    "id": "arrays-medium-001",
    "topic": "Arrays",
    "difficulty": "medium",
    "type": "mcq",
    "category": "general",
    "question": "What is the time complexity of finding an element in an unsorted array?",
    "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    "correctAnswer": 2,
    "explanation": "Without sorting, we must check each element sequentially, resulting in O(n) linear search.",
    "timeLimit": 45
  }
]

Now generate the questions.
```

---

## 🎯 BLIND 75 / LEETCODE STYLE PROMPT

Use this prompt to generate MCQ questions based on famous LeetCode problems (Blind 75, NeetCode 150, etc.)

```
You are a coding interview question writer for a mobile flashcard app called Flashbits. Generate MCQ questions based on LeetCode problems from the Blind 75 list.

Generate [NUMBER] multiple choice questions based on these Blind 75 problems:
- Two Sum
- Best Time to Buy and Sell Stock
- Contains Duplicate
- Product of Array Except Self
- Maximum Subarray
[Add more problems as needed]

## IMPORTANT GUIDELINES FOR LEETCODE-STYLE MCQs

1. Each question should test understanding of the SOLUTION APPROACH, not just the answer
2. Ask about: optimal time/space complexity, which data structure to use, edge cases, algorithm choice
3. Include the problem setup in the question
4. Options should include plausible wrong approaches

## OUTPUT FORMAT

Return ONLY valid JSON array:

[
  {
    "id": "blind75-[topic]-[number]",
    "topic": "[Topic]",
    "difficulty": "[easy|medium|hard]",
    "type": "mcq",
    "category": "blind75",
    "problemNumber": [LeetCode problem number],
    "problemName": "[Problem name e.g. Two Sum]",
    "question": "[Question about the problem]",
    "code": "[Optional - problem example or code snippet]",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": [0-3],
    "explanation": "[Why this approach/answer is correct]",
    "timeLimit": [45|60|90],
    "companies": ["Companies that ask this"]
  }
]

## EXAMPLE BLIND 75 QUESTIONS

[
  {
    "id": "blind75-arrays-001",
    "topic": "Arrays",
    "difficulty": "easy",
    "type": "mcq",
    "category": "blind75",
    "problemNumber": 1,
    "problemName": "Two Sum",
    "question": "Given nums = [2,7,11,15] and target = 9, what is the optimal time complexity to find two numbers that add up to target?",
    "code": "nums = [2, 7, 11, 15]\\ntarget = 9",
    "options": ["O(n²) - nested loops", "O(n) - using hashmap", "O(n log n) - sorting first", "O(1) - constant time lookup"],
    "correctAnswer": 1,
    "explanation": "Using a hashmap allows O(1) lookup for complement (target - num), giving O(n) overall. We store each number and check if its complement exists.",
    "timeLimit": 45,
    "companies": ["Google", "Amazon", "Meta", "Microsoft"]
  },
  {
    "id": "blind75-arrays-002",
    "topic": "Arrays",
    "difficulty": "easy",
    "type": "mcq",
    "category": "blind75",
    "problemNumber": 121,
    "problemName": "Best Time to Buy and Sell Stock",
    "question": "For the stock prices [7,1,5,3,6,4], what approach gives the maximum profit in O(n) time?",
    "code": "prices = [7, 1, 5, 3, 6, 4]",
    "options": [
      "Compare every pair of days (buy, sell)",
      "Track minimum price so far, update max profit",
      "Sort and pick lowest and highest",
      "Use dynamic programming with 2D table"
    ],
    "correctAnswer": 1,
    "explanation": "Track the minimum price seen so far. At each day, calculate profit if sold today (price - minPrice) and update maxProfit. This is O(n) time, O(1) space.",
    "timeLimit": 45,
    "companies": ["Amazon", "Meta", "Goldman Sachs"]
  },
  {
    "id": "blind75-dp-001",
    "topic": "DP",
    "difficulty": "medium",
    "type": "mcq",
    "category": "blind75",
    "problemNumber": 53,
    "problemName": "Maximum Subarray",
    "question": "Which algorithm solves Maximum Subarray in O(n) time?",
    "options": ["Merge Sort", "Kadane's Algorithm", "Binary Search", "Floyd-Warshall"],
    "correctAnswer": 1,
    "explanation": "Kadane's Algorithm maintains current_sum and max_sum. At each element, decide whether to extend the current subarray or start fresh. This gives O(n) time complexity.",
    "timeLimit": 60,
    "companies": ["Microsoft", "Apple", "LinkedIn"]
  }
]

Now generate the questions.
```

---

## 📝 EXAMPLE USAGE

### Generate 10 Easy Array Questions
```
Generate 10 multiple choice questions about Arrays at easy level.
```

### Generate 5 Medium Tree Questions
```
Generate 5 multiple choice questions about Trees at medium level.
```

### Generate Mixed Difficulty
```
Generate 15 multiple choice questions about Hashmaps:
- 5 easy
- 7 medium  
- 3 hard
```

### Generate for Multiple Topics
```
Generate 20 multiple choice questions covering:
- 5 Arrays (mixed difficulty)
- 5 Strings (mixed difficulty)
- 5 Trees (mixed difficulty)
- 5 Graphs (mixed difficulty)
```

### Generate with Specific Focus
```
Generate 10 medium difficulty questions about Arrays focusing on:
- Two pointer technique
- Sliding window
- Prefix sums
```

---

## 🔄 AFTER GENERATING

1. Copy the JSON output
2. Save it as a `.json` file (e.g., `new_questions.json`)
3. Put it in the `scripts/` folder
4. Run: `python seed_questions.py --file new_questions.json`

---

## ⚠️ TIPS

1. **Validate JSON**: Use jsonlint.com to check for syntax errors
2. **Unique IDs**: Use format like `topic-difficulty-001`
3. **Review answers**: Double-check correctAnswer indices (0-3)
4. **Test a few first**: Seed 5 questions first to test the flow
5. **Batch size**: Generate 10-20 at a time for best quality

---

## 🎯 QUICK COPY-PASTE TEMPLATES

### Template 1: Specific Topic & Difficulty
```
You are a coding interview question writer. Generate 10 multiple choice questions about [TOPIC] at [DIFFICULTY] level.

Return ONLY valid JSON array with this structure:
[{"id": "unique-id", "topic": "[Topic]", "difficulty": "[easy|medium|hard|cracked]", "type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "timeLimit": 30}]

Make questions practical for technical interviews. One correct answer only.
```

### Template 2: Bulk Generation
```
Generate 50 coding interview MCQ questions in JSON format:
- 10 Arrays (3 easy, 5 medium, 2 hard)
- 10 Hashmaps (3 easy, 5 medium, 2 hard)
- 10 Strings (3 easy, 5 medium, 2 hard)
- 10 Trees (3 easy, 5 medium, 2 hard)
- 10 Graphs (3 easy, 5 medium, 2 hard)

JSON format: [{"id", "topic", "difficulty", "type": "mcq", "question", "options": [...], "correctAnswer": 0-3, "explanation", "timeLimit": 30|45|60}]
```

### Template 3: Company-Specific
```
Generate 15 medium/hard coding interview questions that are commonly asked at FAANG companies, covering Arrays, Trees, and Dynamic Programming.

Focus on:
- LeetCode-style problems
- Time/space complexity analysis
- Common patterns (two pointers, BFS/DFS, memoization)

Return as JSON array only.
```

### Template 4: Blind 75 - Arrays & Hashing
```
Generate MCQ questions for these Blind 75 problems. Each question should test the optimal approach, time complexity, or key insight:

1. Two Sum (#1)
2. Contains Duplicate (#217)
3. Valid Anagram (#242)
4. Group Anagrams (#49)
5. Top K Frequent Elements (#347)
6. Product of Array Except Self (#238)
7. Encode and Decode Strings (#271)
8. Longest Consecutive Sequence (#128)

JSON format with category: "blind75", problemNumber, and problemName fields.
```

### Template 5: Blind 75 - Two Pointers
```
Generate MCQ questions for these Blind 75 Two Pointers problems:

1. Valid Palindrome (#125)
2. Two Sum II (#167)
3. 3Sum (#15)
4. Container With Most Water (#11)
5. Trapping Rain Water (#42)

Focus on: when to use two pointers, time complexity, edge cases.
JSON format with category: "blind75".
```

### Template 6: Blind 75 - Sliding Window
```
Generate MCQ questions for these Blind 75 Sliding Window problems:

1. Best Time to Buy and Sell Stock (#121)
2. Longest Substring Without Repeating (#3)
3. Longest Repeating Character Replacement (#424)
4. Minimum Window Substring (#76)

Focus on: window expansion/contraction logic, data structures used.
JSON format with category: "blind75".
```

### Template 7: Blind 75 - Trees
```
Generate MCQ questions for these Blind 75 Tree problems:

1. Invert Binary Tree (#226)
2. Maximum Depth of Binary Tree (#104)
3. Same Tree (#100)
4. Subtree of Another Tree (#572)
5. Lowest Common Ancestor (#236)
6. Binary Tree Level Order Traversal (#102)
7. Validate Binary Search Tree (#98)

Focus on: DFS vs BFS, recursion patterns, tree properties.
JSON format with category: "blind75".
```

### Template 8: Blind 75 - Dynamic Programming
```
Generate MCQ questions for these Blind 75 DP problems:

1. Climbing Stairs (#70)
2. House Robber (#198)
3. House Robber II (#213)
4. Longest Palindromic Substring (#5)
5. Coin Change (#322)
6. Maximum Product Subarray (#152)
7. Word Break (#139)
8. Longest Increasing Subsequence (#300)

Focus on: state definition, recurrence relation, optimization.
JSON format with category: "blind75".
```

---

## 📋 COMPLETE BLIND 75 LIST BY CATEGORY

Use this reference when generating questions:

### Arrays & Hashing (9)
- Two Sum (#1) - Easy
- Contains Duplicate (#217) - Easy
- Valid Anagram (#242) - Easy
- Group Anagrams (#49) - Medium
- Top K Frequent Elements (#347) - Medium
- Product of Array Except Self (#238) - Medium
- Valid Sudoku (#36) - Medium
- Encode and Decode Strings (#271) - Medium
- Longest Consecutive Sequence (#128) - Medium

### Two Pointers (5)
- Valid Palindrome (#125) - Easy
- Two Sum II (#167) - Medium
- 3Sum (#15) - Medium
- Container With Most Water (#11) - Medium
- Trapping Rain Water (#42) - Hard

### Sliding Window (4)
- Best Time to Buy and Sell Stock (#121) - Easy
- Longest Substring Without Repeating (#3) - Medium
- Longest Repeating Character Replacement (#424) - Medium
- Minimum Window Substring (#76) - Hard

### Stack (1)
- Valid Parentheses (#20) - Easy

### Binary Search (2)
- Find Minimum in Rotated Sorted Array (#153) - Medium
- Search in Rotated Sorted Array (#33) - Medium

### Linked List (6)
- Reverse Linked List (#206) - Easy
- Merge Two Sorted Lists (#21) - Easy
- Linked List Cycle (#141) - Easy
- Reorder List (#143) - Medium
- Remove Nth Node From End (#19) - Medium
- Merge k Sorted Lists (#23) - Hard

### Trees (11)
- Invert Binary Tree (#226) - Easy
- Maximum Depth of Binary Tree (#104) - Easy
- Same Tree (#100) - Easy
- Subtree of Another Tree (#572) - Easy
- Lowest Common Ancestor of BST (#235) - Medium
- Binary Tree Level Order Traversal (#102) - Medium
- Validate Binary Search Tree (#98) - Medium
- Kth Smallest Element in BST (#230) - Medium
- Construct Binary Tree (#105) - Medium
- Binary Tree Max Path Sum (#124) - Hard
- Serialize and Deserialize Binary Tree (#297) - Hard

### Tries (3)
- Implement Trie (#208) - Medium
- Design Add and Search Words (#211) - Medium
- Word Search II (#212) - Hard

### Heap / Priority Queue (1)
- Find Median from Data Stream (#295) - Hard

### Backtracking (2)
- Combination Sum (#39) - Medium
- Word Search (#79) - Medium

### Graphs (6)
- Number of Islands (#200) - Medium
- Clone Graph (#133) - Medium
- Pacific Atlantic Water Flow (#417) - Medium
- Course Schedule (#207) - Medium
- Number of Connected Components (#323) - Medium
- Graph Valid Tree (#261) - Medium

### Advanced Graphs (1)
- Alien Dictionary (#269) - Hard

### 1-D Dynamic Programming (10)
- Climbing Stairs (#70) - Easy
- House Robber (#198) - Medium
- House Robber II (#213) - Medium
- Longest Palindromic Substring (#5) - Medium
- Palindromic Substrings (#647) - Medium
- Decode Ways (#91) - Medium
- Coin Change (#322) - Medium
- Maximum Product Subarray (#152) - Medium
- Word Break (#139) - Medium
- Longest Increasing Subsequence (#300) - Medium

### 2-D Dynamic Programming (2)
- Unique Paths (#62) - Medium
- Longest Common Subsequence (#1143) - Medium

### Greedy (2)
- Maximum Subarray (#53) - Medium
- Jump Game (#55) - Medium

### Intervals (4)
- Insert Interval (#57) - Medium
- Merge Intervals (#56) - Medium
- Non-overlapping Intervals (#435) - Medium
- Meeting Rooms II (#253) - Medium

### Math & Geometry (3)
- Rotate Image (#48) - Medium
- Spiral Matrix (#54) - Medium
- Set Matrix Zeroes (#73) - Medium

### Bit Manipulation (5)
- Number of 1 Bits (#191) - Easy
- Counting Bits (#338) - Easy
- Reverse Bits (#190) - Easy
- Missing Number (#268) - Easy
- Sum of Two Integers (#371) - Medium

