# Rate Limiting Implementation

## Overview

Rate limiting has been implemented on all public endpoints to prevent abuse, DDoS attacks, and ensure fair resource usage.

## Implementation Details

### Current Implementation

**Location:** `functions/main.py` - GitHub OAuth Exchange Function

**Rate Limit Configuration:**
- **Window:** 60 seconds (1 minute)
- **Max Requests:** 10 requests per IP per window
- **Algorithm:** Sliding window with in-memory storage

### How It Works

1. **IP Detection:** Extracts client IP from `X-Forwarded-For` header (set by Firebase/Cloud Load Balancer) or falls back to `X-Real-IP`
2. **Request Tracking:** Stores request timestamps per IP address in memory
3. **Rate Check:** Before processing each request, checks if IP has exceeded the limit
4. **Response:**
   - **Allowed:** Processes request and includes rate limit headers
   - **Blocked:** Returns `429 Too Many Requests` with retry information

### Rate Limit Headers

All responses include rate limit information:

**Success Response (200):**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1234567890
```

**Rate Limited Response (429):**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 45
```

### Error Response Format

When rate limited, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retry_after": 45
}
```

## Configuration

Rate limit settings can be adjusted in `functions/main.py`:

```python
RATE_LIMIT_WINDOW = 60  # Time window in seconds
RATE_LIMIT_MAX_REQUESTS = 10  # Maximum requests per window per IP
RATE_LIMIT_CLEANUP_INTERVAL = 300  # Clean up old entries every 5 minutes
```

## Limitations & Future Improvements

### Current Limitations

1. **In-Memory Storage:** Rate limiting is per-instance, not shared across function instances
   - **Impact:** Users could potentially make more requests if they hit different instances
   - **Mitigation:** Firebase Functions typically reuse instances, so this is less of an issue

2. **No Persistent Storage:** Rate limit data is lost when function instance restarts
   - **Impact:** Rate limits reset on cold starts
   - **Mitigation:** Acceptable for most use cases, as cold starts are infrequent

### Recommended Improvements for Production

1. **Use Firestore for Distributed Rate Limiting:**
   ```python
   from firebase_admin import firestore
   
   db = firestore.client()
   rate_limit_ref = db.collection('rate_limits').document(ip)
   ```

2. **Use Redis for High-Performance Rate Limiting:**
   - Better for high-traffic scenarios
   - Requires additional infrastructure

3. **Implement Different Limits for Different Endpoints:**
   - More restrictive for authentication endpoints
   - More lenient for read-only endpoints

4. **Add User-Based Rate Limiting:**
   - Track by authenticated user ID in addition to IP
   - Prevents authenticated users from bypassing limits

5. **Implement Exponential Backoff:**
   - Increase rate limit window for repeated violations
   - Temporarily ban IPs that repeatedly exceed limits

## Testing Rate Limits

### Test with cURL

```bash
# Make 11 requests rapidly (10 allowed + 1 blocked)
for i in {1..11}; do
  curl -X POST https://us-central1-flashprep-11c85.cloudfunctions.net/exchangeGitHubCode \
    -H "Content-Type: application/json" \
    -d '{"code":"test"}' \
    -v
  echo ""
done
```

### Expected Behavior

- First 10 requests: Process normally (may fail due to invalid code, but not rate limited)
- 11th request: Returns `429 Too Many Requests`

## Monitoring

Rate limit violations are logged in Cloud Functions logs. Monitor for:
- High frequency of 429 responses
- Patterns indicating abuse
- Need to adjust rate limit thresholds

## Security Considerations

1. **IP Spoofing:** Rate limiting by IP can be bypassed by using proxies/VPNs
   - **Mitigation:** Consider user-based rate limiting for authenticated endpoints

2. **Distributed Attacks:** Multiple IPs can still overwhelm the service
   - **Mitigation:** Implement global rate limits and DDoS protection at infrastructure level

3. **Legitimate High Usage:** Some users may legitimately need higher limits
   - **Mitigation:** Implement tiered rate limits based on user subscription level

