# Input Sanitization Implementation

## Overview

Input sanitization has been implemented across the application to prevent XSS (Cross-Site Scripting) attacks and ensure data integrity. This protects both the React Native mobile app and the Web version.

## Implementation Details

### React Native App (`utils/sanitize.ts`)

**Location:** `utils/sanitize.ts`

**Functions:**
- `sanitizeString()` - General string sanitization
- `sanitizeName()` - Name sanitization (more restrictive)
- `sanitizeEmail()` - Email validation and sanitization
- `sanitizeUrl()` - URL validation and sanitization
- `sanitizeUserProfile()` - Complete user profile sanitization

**Features:**
- Removes HTML tags
- Removes control characters
- Removes zero-width characters
- Removes dangerous JavaScript schemes
- Length limiting
- Email format validation

### Web Version (`Web/src/utils/sanitize.js`)

**Location:** `Web/src/utils/sanitize.js`

**Dependencies:**
- `dompurify` - HTML sanitization library
- `isomorphic-dompurify` - Server-side rendering support

**Functions:**
- `sanitizeHtml()` - HTML sanitization using DOMPurify
- `sanitizeString()` - Text sanitization
- `sanitizeName()` - Name sanitization
- `sanitizeUrl()` - URL sanitization

**DOMPurify Configuration:**
- Only allows safe HTML tags: `b`, `i`, `em`, `strong`, `a`, `p`, `br`
- Only allows safe attributes: `href`, `target`, `rel`
- Blocks all data attributes
- Prevents XSS attacks

### Integration Points

#### 1. User Profile Service (`services/userService.ts`)

**Sanitization Applied:**
- `saveUserProfile()` - Sanitizes profile before saving to Firestore
- `updateUserProfile()` - Sanitizes updates before applying

**Protected Fields:**
- `name` - User's display name
- `email` - User's email address
- `occupation` - User's occupation

#### 2. OAuth Callback Page (`public/auth/callback.html`)

**Sanitization Applied:**
- Error messages are escaped before rendering
- URLs are sanitized before use
- Uses `escapeHtml()` function to prevent XSS

**Example:**
```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

## Usage Examples

### React Native

```typescript
import { sanitizeName, sanitizeEmail, sanitizeUserProfile } from '@/utils/sanitize';

// Sanitize user input
const cleanName = sanitizeName(userInput);
const cleanEmail = sanitizeEmail(userInput);

// Sanitize entire profile
const cleanProfile = sanitizeUserProfile({
  name: userInput.name,
  email: userInput.email,
  occupation: userInput.occupation
});
```

### Web

```javascript
import { sanitizeHtml, sanitizeName } from '@/utils/sanitize';

// Sanitize HTML for rendering
const cleanHtml = sanitizeHtml(userInput);

// Use with dangerouslySetInnerHTML (if needed)
<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />

// Sanitize text
const cleanName = sanitizeName(userInput);
```

## Security Considerations

### What's Protected

1. **User Profile Data:**
   - Names from onboarding
   - Display names from OAuth providers (GitHub, Google)
   - Email addresses
   - Occupation fields

2. **OAuth Callback:**
   - Error messages
   - Redirect URLs
   - Token parameters

3. **All User Input:**
   - Text inputs
   - Form submissions
   - Data stored in Firestore

### What's NOT Protected (and why)

1. **Question Content:**
   - Questions are stored in Firestore by admins
   - Not user-generated content
   - Admin-controlled

2. **Firebase Auth Data:**
   - Managed by Firebase
   - Already sanitized by Firebase SDK

### XSS Attack Prevention

**Prevented Attack Vectors:**
- `<script>` tag injection
- `javascript:` URL schemes
- Event handler attributes (`onclick`, `onerror`, etc.)
- HTML entity encoding bypasses
- Control character injection
- Zero-width character injection

**Example Attack Prevented:**
```javascript
// Malicious input
const maliciousName = '<script>alert("XSS")</script>';

// After sanitization
const safeName = sanitizeName(maliciousName);
// Result: "" (empty string or sanitized text)
```

## Best Practices

### 1. Always Sanitize Before Storing

```typescript
// ❌ Bad
await saveUserProfile(userId, { name: userInput });

// ✅ Good
const sanitized = sanitizeUserProfile({ name: userInput });
await saveUserProfile(userId, sanitized);
```

### 2. Sanitize on Display (Defense in Depth)

Even though React Native's `Text` component escapes content, sanitize before storing:

```typescript
// ✅ Good - Sanitize before storing
const cleanName = sanitizeName(userInput);
<Text>{cleanName}</Text>
```

### 3. Use DOMPurify for HTML (Web Only)

```javascript
// ✅ Good - For HTML content
import { sanitizeHtml } from '@/utils/sanitize';
const cleanHtml = sanitizeHtml(userHtml);
```

### 4. Validate Email Format

```typescript
// ✅ Good - Validate and sanitize
const email = sanitizeEmail(userInput);
if (!email) {
  // Show error: invalid email
}
```

## Testing

### Test Cases

1. **HTML Tag Injection:**
   ```typescript
   sanitizeName('<script>alert("XSS")</script>')
   // Expected: "" or sanitized text
   ```

2. **JavaScript URL:**
   ```typescript
   sanitizeUrl('javascript:alert("XSS")')
   // Expected: ""
   ```

3. **Event Handler:**
   ```typescript
   sanitizeName('John<img src=x onerror=alert(1)>')
   // Expected: "John" (HTML removed)
   ```

4. **Control Characters:**
   ```typescript
   sanitizeString('Hello\x00World')
   // Expected: "HelloWorld" (control char removed)
   ```

## Future Improvements

1. **Server-Side Validation:**
   - Add Firestore security rules to validate data format
   - Implement Cloud Functions to validate on write

2. **Content Security Policy (CSP):**
   - Add CSP headers to web version
   - Restrict inline scripts and styles

3. **Input Validation:**
   - Add more strict validation for specific fields
   - Implement regex patterns for names, emails, etc.

4. **Rate Limiting on Input:**
   - Prevent rapid input submission
   - Detect and block suspicious patterns

## Dependencies

### React Native
- No external dependencies (pure TypeScript)

### Web
- `dompurify@^3.0.6` - HTML sanitization
- `isomorphic-dompurify@^2.11.0` - SSR support

## Installation

For Web version, install dependencies:

```bash
cd Web
npm install dompurify isomorphic-dompurify
```

## References

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

