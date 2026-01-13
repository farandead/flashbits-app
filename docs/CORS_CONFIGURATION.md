# CORS Configuration Guide

This document explains the CORS (Cross-Origin Resource Sharing) configuration for the flashbits app.

## Overview

CORS is configured for:
1. **Firebase Cloud Functions** - GitHub OAuth token exchange
2. **Firebase Hosting** - Web assets and authentication callbacks

## Security Principles

✅ **Restrictive by Default**: Only specific allowed origins are permitted  
✅ **No Wildcards in Production**: Specific domains only (except for static assets)  
✅ **Credentials Support**: Enabled for authenticated requests  
✅ **Proper Headers**: All necessary CORS headers included

---

## Cloud Functions CORS

### Allowed Origins

The Cloud Function (`exchangeGitHubCode`) allows requests from:

- `https://flashbits.co` - Production domain
- `https://www.flashbits.co` - Production domain (www)
- `https://flashprep-11c85.web.app` - Firebase Hosting
- `https://flashprep-11c85.firebaseapp.com` - Firebase Hosting (legacy)
- `flashbits://` - Mobile app custom scheme
- `exp://` - Expo development

### Configuration

**Location**: `functions/main.py`

```python
@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=[
            "https://flashbits.co",
            "https://www.flashbits.co",
            "https://flashprep-11c85.web.app",
            "https://flashprep-11c85.firebaseapp.com",
        ],
        cors_methods=["GET", "POST", "OPTIONS"],
        cors_allow_headers=["Content-Type", "Authorization"],
        cors_max_age=3600
    ),
    ...
)
```

### Dynamic Origin Detection

The function includes a helper `_get_allowed_origin()` that:
- Checks the `Origin` header against allowed origins
- Handles mobile app custom schemes via `Referer` header
- Returns the origin if allowed, `None` otherwise

### CORS Headers in Responses

All responses include appropriate CORS headers:
- `Access-Control-Allow-Origin`: Set to the request origin if allowed
- `Access-Control-Allow-Credentials`: `true` for authenticated requests
- `Access-Control-Allow-Methods`: `GET, POST, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`
- `Access-Control-Max-Age`: `3600` (1 hour)

---

## Firebase Hosting CORS

### Configuration

**Location**: `firebase.json`

```json
{
  "headers": [
    {
      "source": "**",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    },
    {
      "source": "/auth/**",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        }
      ]
    }
  ]
}
```

### Static Assets

- **Source**: `**/*.@(js|css|jpg|jpeg|gif|png|svg|webp|woff|woff2|ttf|eot)`
- **CORS**: Wildcard (`*`) allowed for static assets
- **Reason**: Static assets are public and don't contain sensitive data

### Authentication Callbacks

- **Source**: `/auth/**`
- **CORS**: Wildcard with credentials support
- **Reason**: OAuth callbacks need to work from various origins

---

## Testing CORS

### Test from Browser Console

```javascript
// Test from flashbits.co
fetch('https://us-central1-flashprep-11c85.cloudfunctions.net/exchangeGitHubCode', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://flashbits.co'
  }
})
.then(r => console.log('CORS Headers:', r.headers))
.catch(e => console.error('CORS Error:', e));
```

### Expected Response Headers

```
Access-Control-Allow-Origin: https://flashbits.co
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 3600
Access-Control-Allow-Credentials: true
```

### Test from Mobile App

Mobile apps using custom schemes (`flashbits://`) are handled via the `Referer` header check in `_get_allowed_origin()`.

---

## Security Considerations

### ✅ What's Secure

1. **Specific Origins**: Only known domains are allowed
2. **No Wildcards in Functions**: Cloud Functions use specific origin list
3. **Credentials Protected**: Only allowed origins can use credentials
4. **Rate Limiting**: Functions have rate limiting to prevent abuse

### ⚠️ Considerations

1. **Static Assets**: Use wildcard (`*`) - acceptable for public assets
2. **Auth Callbacks**: Use wildcard with credentials - needed for OAuth flow
3. **Mobile Apps**: Custom schemes handled via Referer header

---

## Adding New Origins

### For Cloud Functions

1. Add to `ALLOWED_ORIGINS` list in `functions/main.py`:
```python
ALLOWED_ORIGINS = [
    "https://flashbits.co",
    "https://www.flashbits.co",
    "https://flashprep-11c85.web.app",
    "https://flashprep-11c85.firebaseapp.com",
    "https://your-new-domain.com",  # Add here
    "flashbits://",
    "exp://",
]
```

2. Add to `cors_origins` in function decorator:
```python
@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=[
            "https://flashbits.co",
            "https://www.flashbits.co",
            "https://flashprep-11c85.web.app",
            "https://flashprep-11c85.firebaseapp.com",
            "https://your-new-domain.com",  # Add here
        ],
        ...
    ),
    ...
)
```

3. Deploy the function:
```bash
firebase deploy --only functions
```

### For Firebase Hosting

No changes needed - wildcard is used for static assets and auth callbacks.

---

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Problem**: Origin not in allowed list

**Solution**:
1. Check if origin is in `ALLOWED_ORIGINS`
2. Verify origin matches exactly (case-sensitive, no trailing slashes)
3. Check function logs for origin validation

### CORS Error: "Credentials flag is true, but Access-Control-Allow-Credentials is not 'true'"

**Problem**: Credentials not enabled for origin

**Solution**:
1. Ensure origin is in allowed list
2. Check `_get_cors_headers()` sets `Access-Control-Allow-Credentials: true`
3. Verify function CORS options include credentials support

### Mobile App CORS Issues

**Problem**: Custom scheme requests rejected

**Solution**:
1. Check `Referer` header contains `flashbits://` or `exp://`
2. Verify `_get_allowed_origin()` handles custom schemes
3. Check function logs for origin detection

---

## Best Practices

1. **Always Use Specific Origins**: Avoid wildcards in production functions
2. **Test CORS Changes**: Test from all allowed origins after changes
3. **Monitor Function Logs**: Check for CORS-related errors
4. **Keep Origins Updated**: Remove unused origins, add new ones as needed
5. **Document Changes**: Update this file when adding/removing origins

---

## References

- [Firebase Functions CORS](https://firebase.google.com/docs/functions/http-events#cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Firebase Hosting Headers](https://firebase.google.com/docs/hosting/full-config#headers)

---

**Last Updated**: 2025-01-16  
**Version**: 1.0

