# Authentication Rate Limiting

This document explains the rate limiting implementation for authentication endpoints to prevent brute force attacks.

## Overview

Rate limiting is implemented at the application level to protect login and signup endpoints from brute force attacks. This works in addition to Firebase's built-in rate limiting.

## Implementation

### Mobile App (React Native)

**Location:** `utils/rateLimit.ts`

- Uses `AsyncStorage` for persistence
- Tracks failed attempts per email address
- Sliding window algorithm

### Admin Panel (Web)

**Location:** `admin/src/utils/rateLimit.js`

- Uses `localStorage` for persistence
- Same algorithm as mobile app
- Web-compatible implementation

## Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,        // Max attempts before blocking
  TIME_WINDOW_MS: 15 * 60 * 1000, // 15 minutes window
  BLOCK_DURATION_MS: 30 * 60 * 1000, // 30 minutes block
};
```

## How It Works

### 1. Failed Attempt Tracking

- Each failed login/signup attempt is recorded
- Attempts are tracked per email address (normalized to lowercase)
- Uses sliding window: resets after 15 minutes of inactivity

### 2. Rate Limit Check

Before each authentication attempt:
1. Check if email is currently blocked
2. If blocked, return error with remaining time
3. If not blocked, proceed with authentication

### 3. Blocking Logic

- After 5 failed attempts within 15 minutes:
  - User is blocked for 30 minutes
  - All subsequent attempts are rejected
  - Clear error message shows remaining time

### 4. Success Handling

- On successful authentication:
  - Rate limit is cleared for that email
  - User can immediately try again if needed

## User Experience

### Warning Messages

When approaching the limit:
- After 3 failed attempts: Shows remaining attempts
- Example: "Incorrect password. Please try again. (2 attempts remaining)"

### Block Messages

When blocked:
- Shows clear message with remaining time
- Example: "Too many failed attempts. Please try again in 25 minutes."

## Protected Endpoints

### Mobile App

1. **Email Sign In** (`signInWithEmail`)
   - Checks rate limit before attempt
   - Records failed attempts
   - Clears on success

2. **Email Sign Up** (`signUpWithEmail`)
   - Same rate limiting as sign in
   - Prevents account enumeration attacks

### Admin Panel

1. **Admin Login** (`loginAdmin`)
   - Same rate limiting as mobile app
   - Protects admin panel from brute force

## Security Features

### 1. Email Normalization

- All emails are normalized (lowercase, trimmed)
- Prevents bypassing rate limits with case variations

### 2. Persistent Storage

- Rate limit data persists across app restarts
- Prevents clearing limits by restarting app

### 3. Sliding Window

- Time window resets after expiration
- Prevents permanent blocking
- Fair to legitimate users

### 4. Fail-Open Design

- On errors, allows authentication (better UX)
- Logs errors for monitoring
- Doesn't break auth flow

## Testing

### Test Rate Limiting

1. **Attempt multiple failed logins:**
   ```typescript
   // Try 5 failed attempts
   for (let i = 0; i < 5; i++) {
     await signInWithEmail('test@example.com', 'wrongpassword');
   }
   // 6th attempt should be blocked
   ```

2. **Verify blocking:**
   - Check error message shows remaining time
   - Verify attempts are rejected

3. **Test reset:**
   - Wait 15 minutes (or modify config for testing)
   - Verify rate limit resets

4. **Test success:**
   - After blocking, use correct password
   - Verify rate limit is cleared
   - Verify immediate access

## Configuration Tuning

### Adjust Limits

Edit `RATE_LIMIT_CONFIG` in:
- `utils/rateLimit.ts` (mobile)
- `admin/src/utils/rateLimit.js` (web)

### Recommended Values

- **Development:** Lower limits for faster testing
  ```typescript
  MAX_FAILED_ATTEMPTS: 10,
  TIME_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  BLOCK_DURATION_MS: 10 * 60 * 1000, // 10 minutes
  ```

- **Production:** Current values (balanced security/UX)
  ```typescript
  MAX_FAILED_ATTEMPTS: 5,
  TIME_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BLOCK_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  ```

- **High Security:** Stricter limits
  ```typescript
  MAX_FAILED_ATTEMPTS: 3,
  TIME_WINDOW_MS: 10 * 60 * 1000, // 10 minutes
  BLOCK_DURATION_MS: 60 * 60 * 1000, // 1 hour
  ```

## Monitoring

### Check Rate Limit Status

```typescript
import { checkRateLimit, getRemainingBlockTime } from '@/utils/rateLimit';

const status = await checkRateLimit('user@example.com');
if (status.isBlocked) {
  const remaining = await getRemainingBlockTime('user@example.com');
  console.log(`Blocked for ${remaining} more seconds`);
}
```

### Clear Rate Limit (Admin Only)

```typescript
import { clearRateLimit } from '@/utils/rateLimit';

// Clear rate limit for a user (admin function)
await clearRateLimit('user@example.com');
```

## Limitations

1. **Client-Side Only:** Rate limiting is enforced client-side
   - Can be bypassed by modifying app code
   - Firebase also provides server-side rate limiting
   - Combined approach provides defense in depth

2. **Per-Email Tracking:** Tracks by email address
   - Attacker can try different emails
   - Consider IP-based limiting for additional protection

3. **Storage-Based:** Uses local storage
   - Can be cleared by user
   - Persists across sessions for legitimate protection

## Best Practices

1. **Combine with Firebase:** Use both app-level and Firebase rate limiting
2. **Monitor Logs:** Watch for patterns of failed attempts
3. **User Education:** Inform users about rate limiting
4. **Support Access:** Provide way for legitimate users to get unblocked
5. **Regular Review:** Adjust limits based on attack patterns

## Future Improvements

1. **IP-Based Limiting:** Track by IP address in addition to email
2. **Server-Side Enforcement:** Move to Cloud Function for stronger protection
3. **Adaptive Limits:** Adjust limits based on attack patterns
4. **CAPTCHA Integration:** Add CAPTCHA after 3 failed attempts
5. **Email Notifications:** Notify users of suspicious activity

## Related Documentation

- [Firebase Auth Security](https://firebase.google.com/docs/auth/security)
- [Brute Force Protection](https://firebase.google.com/docs/auth/admin/manage-users#block_users)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

