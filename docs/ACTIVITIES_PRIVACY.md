# Activities Privacy Implementation

This document explains how user activities are handled to protect user privacy while maintaining social proof functionality.

## Privacy Problem

Previously, public activities contained `userId` (Firebase Auth UID), which could be used to:
- Track individual users across activities
- Correlate activities to specific user accounts
- Build user profiles from public data

## Solution

We've implemented a **privacy-first approach** that removes `userId` from public activities entirely.

## Architecture

### Public Activities Collection (`activities`)

**Purpose:** Social proof on landing page  
**Privacy:** No `userId` stored  
**Access:** Public read (anyone can read `isPublic == true`)

**Data Structure:**
```typescript
{
  type: ActivityType;
  displayName: string;        // First name or anonymous
  country?: string;
  countryCode?: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  isPublic: true;
  // NO userId field
}
```

### Internal Activities Collection (`activitiesInternal`) - Optional

**Purpose:** Analytics and user tracking (if needed)  
**Privacy:** Contains `userId`  
**Access:** Private (only user can read their own)

**Data Structure:**
```typescript
{
  ...publicActivityFields,
  userId: string;  // Only in internal collection
}
```

**Note:** Currently disabled by default. Uncomment in `activityService.ts` if you need user-level analytics.

## Security Rules

### Public Activities

```javascript
match /activities/{activityId} {
  // Only allow read if isPublic and NO userId present
  allow read: if resource.data.isPublic == true
              && !('userId' in resource.data);
  
  // Only allow create if NO userId in request
  allow create: if request.auth != null
                && !('userId' in request.resource.data);
}
```

### Internal Activities (if enabled)

```javascript
match /activitiesInternal/{activityId} {
  // Only user can read their own activities
  allow read: if request.auth != null 
              && request.auth.uid == resource.data.userId;
  
  // Only user can create their own activities
  allow create: if request.auth != null 
                && request.resource.data.userId == request.auth.uid;
}
```

## Benefits

### 1. **Privacy Protection**
- Users cannot be tracked across activities
- No correlation between activities and user accounts
- Complies with privacy regulations (GDPR, CCPA)

### 2. **Social Proof Maintained**
- Landing page still shows real-time activities
- Display names and locations provide social proof
- No functionality lost

### 3. **Security**
- Firestore rules enforce no `userId` in public activities
- Prevents accidental exposure of user IDs
- Defense in depth

## Migration

### Existing Activities

If you have existing activities with `userId`:

1. **Option 1: Clean Migration (Recommended)**
   ```javascript
   // Cloud Function to remove userId from existing activities
   const activitiesRef = collection(db, 'activities');
   const snapshot = await getDocs(activitiesRef);
   
   const batch = writeBatch(db);
   snapshot.docs.forEach(doc => {
     if (doc.data().userId) {
       const { userId, ...publicData } = doc.data();
       batch.update(doc.ref, publicData);
     }
   });
   await batch.commit();
   ```

2. **Option 2: Firestore Rules**
   - Rules already prevent reading activities with `userId`
   - Old activities will be filtered out automatically
   - New activities won't have `userId`

## Usage

### Logging Activities

```typescript
import { logActivity } from '@/services/activityService';

// Automatically excludes userId from public activities
await logActivity(
  'rank_up',
  userId,
  userName,
  'reached Expert rank'
);
```

### Fetching Activities

```typescript
import { getRecentActivities } from '@/services/activityService';

// Returns activities WITHOUT userId
const activities = await getRecentActivities(20);
// activities[0].userId // undefined (not present)
```

## Analytics (If Needed)

If you need user-level analytics, you can:

1. **Enable Internal Collection**
   - Uncomment the internal activity storage in `activityService.ts`
   - Activities will be stored in both collections

2. **Query Internal Activities**
   ```typescript
   // Only accessible by the user themselves
   const userActivities = await getDocs(
     query(
       collection(db, 'activitiesInternal'),
       where('userId', '==', currentUser.uid)
     )
   );
   ```

3. **Aggregate Analytics**
   - Use Cloud Functions to aggregate data
   - Store aggregated stats (not individual activities)
   - Maintain user privacy

## Best Practices

1. **Never Store userId in Public Activities**
   - Firestore rules enforce this
   - Code review should catch any attempts

2. **Use Display Names**
   - Use first name or anonymous names
   - Don't use full names or emails

3. **Limit Data Exposure**
   - Only include necessary fields
   - Don't include sensitive metadata

4. **Regular Audits**
   - Check Firestore rules regularly
   - Verify no userId in public activities
   - Review activity structure

## Compliance

This implementation helps with:

- **GDPR:** No personal identifiers in public data
- **CCPA:** User tracking prevention
- **Privacy by Design:** Privacy built into architecture

## Future Improvements

1. **Activity Expiration**
   - Auto-delete old activities
   - Reduce data retention

2. **Opt-Out Option**
   - Allow users to opt-out of public activities
   - Store preference in user profile

3. **Aggregated Stats**
   - Show "X users completed Y questions" instead of individual activities
   - Even more privacy-friendly

4. **Rate Limiting**
   - Limit activities per user per time period
   - Prevent activity spam

## Testing

### Verify Privacy

```typescript
// Test that public activities don't have userId
const activities = await getRecentActivities(10);
activities.forEach(activity => {
  console.assert(!('userId' in activity), 'Activity should not have userId');
});
```

### Verify Security Rules

1. Try to create activity with userId → Should fail
2. Try to read activity with userId → Should be filtered out
3. Verify public activities are readable → Should work

## Related Documentation

- [Firestore Security Rules](./firestore.rules)
- [Activity Service](../services/activityService.ts)
- [Privacy Policy](../docs/PRIVACY_POLICY.md)

