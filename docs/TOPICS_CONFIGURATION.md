# Topics Configuration Guide

Topics are now stored in Firestore and can be managed from the admin panel. This allows you to add, remove, reorder, and customize topics without code changes.

## Firestore Collection Structure

**Collection:** `topics`  
**Document ID:** The topic ID (e.g., `Arrays`, `LinkedLists`, etc.)

### Document Schema

```typescript
{
  id: string;           // Topic ID (must match Topic type from data/questions.ts)
  name: string;        // Display name (e.g., "Arrays", "Linked Lists")
  icon: string;        // Ionicons icon name (e.g., "grid-outline")
  color: string;       // Hex color code (e.g., "#FF6B6B")
  order: number;       // Display order (lower numbers appear first)
  enabled: boolean;    // Whether topic is active (default: true)
  createdAt?: string;  // ISO timestamp (optional)
  updatedAt?: string;  // ISO timestamp (optional)
}
```

## Default Topics

Here's the default topics configuration that should be seeded initially:

```json
[
  {
    "id": "Arrays",
    "name": "Arrays",
    "icon": "grid-outline",
    "color": "#FF6B6B",
    "order": 1,
    "enabled": true
  },
  {
    "id": "LinkedLists",
    "name": "Linked Lists",
    "icon": "link-outline",
    "color": "#AA96DA",
    "order": 2,
    "enabled": true
  },
  {
    "id": "StacksQueues",
    "name": "Stacks & Queues",
    "icon": "layers-outline",
    "color": "#4ECDC4",
    "order": 3,
    "enabled": true
  },
  {
    "id": "Hashing",
    "name": "Hashing",
    "icon": "key-outline",
    "color": "#FFE66D",
    "order": 4,
    "enabled": true
  },
  {
    "id": "Trees",
    "name": "Trees",
    "icon": "git-branch-outline",
    "color": "#95E1D3",
    "order": 5,
    "enabled": true
  },
  {
    "id": "Graphs",
    "name": "Graphs",
    "icon": "git-network-outline",
    "color": "#DDA0DD",
    "order": 6,
    "enabled": true
  },
  {
    "id": "Sorting",
    "name": "Sorting & Searching",
    "icon": "funnel-outline",
    "color": "#FF9F43",
    "order": 7,
    "enabled": true
  },
  {
    "id": "Recursion",
    "name": "Recursion & Backtracking",
    "icon": "repeat-outline",
    "color": "#FCE38A",
    "order": 8,
    "enabled": true
  },
  {
    "id": "Greedy",
    "name": "Greedy Algorithms",
    "icon": "flash-outline",
    "color": "#5F27CD",
    "order": 9,
    "enabled": true
  },
  {
    "id": "DP",
    "name": "Dynamic Programming",
    "icon": "calculator-outline",
    "color": "#F38181",
    "order": 10,
    "enabled": true
  },
  {
    "id": "BitManipulation",
    "name": "Bit Manipulation",
    "icon": "code-slash-outline",
    "color": "#00D2D3",
    "order": 11,
    "enabled": true
  },
  {
    "id": "Math",
    "name": "Math & Number Theory",
    "icon": "calculator-outline",
    "color": "#FD79A8",
    "order": 12,
    "enabled": true
  },
  {
    "id": "AdvancedDS",
    "name": "Advanced Data Structures",
    "icon": "cube-outline",
    "color": "#6C5CE7",
    "order": 13,
    "enabled": true
  },
  {
    "id": "AdvancedAlgo",
    "name": "Advanced Algorithms",
    "icon": "trending-up-outline",
    "color": "#A29BFE",
    "order": 14,
    "enabled": true
  }
]
```

## Seeding Topics via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Click **Start collection**
5. Collection ID: `topics`
6. For each topic:
   - Click **Add document**
   - Document ID: Use the topic `id` (e.g., `Arrays`)
   - Add fields:
     - `id` (string): Topic ID
     - `name` (string): Display name
     - `icon` (string): Icon name
     - `color` (string): Hex color
     - `order` (number): Display order
     - `enabled` (boolean): true
   - Click **Save**

## Seeding Topics via Admin Script

You can also create a script to seed topics programmatically. Example:

```javascript
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const defaultTopics = [
  { id: 'Arrays', name: 'Arrays', icon: 'grid-outline', color: '#FF6B6B', order: 1, enabled: true },
  // ... add all topics
];

async function seedTopics() {
  for (const topic of defaultTopics) {
    await setDoc(doc(db, 'topics', topic.id), topic);
    console.log(`Seeded topic: ${topic.name}`);
  }
}
```

## Managing Topics

### Adding a New Topic

1. Create a new document in the `topics` collection
2. Use the topic ID as the document ID
3. Set all required fields
4. Set `order` to control display position
5. Set `enabled: true` to make it visible

### Disabling a Topic

Set `enabled: false` on the topic document. It will be hidden from the UI but data remains in Firestore.

### Reordering Topics

Update the `order` field on each topic. Lower numbers appear first.

### Changing Topic Appearance

Update `name`, `icon`, or `color` fields as needed. Changes will reflect immediately in the app.

## Fallback Behavior

If Firestore is unavailable or empty, the app will fall back to the default hardcoded topics defined in `services/topicsService.ts`. This ensures the app always has topics to display.

## Security Rules

Topics are publicly readable (needed for the settings page) but only authenticated users can write. Admin panel should handle authentication before allowing topic modifications.

