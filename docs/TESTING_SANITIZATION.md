# Testing Input Sanitization

## Quick Testing Guide

### Method 1: Using Test Utilities (Recommended)

1. **Import the test function in your app:**

```typescript
// In any component or test file
import { runSanitizationTests } from '@/utils/testSanitization';

// Run all tests
runSanitizationTests();
```

2. **Run in development:**
   - Add this to a component's `useEffect` in development mode
   - Or create a test screen/button to trigger it

### Method 2: Manual Testing in React Native App

#### Test User Profile Sanitization

1. **Open the app and go to onboarding**
2. **Try entering malicious input in the name field:**

```
<script>alert("XSS")</script>John
```

**Expected Result:** The script tags should be removed, only "John" should be saved.

3. **Check Firestore:**
   - Go to Firebase Console → Firestore
   - Check the `users` collection
   - Verify the name field doesn't contain HTML tags

#### Test via Onboarding Screen

1. Navigate to `/onboarding`
2. Enter these test cases in the name field:

**Test Cases:**
```
Test 1: <script>alert("XSS")</script>
Test 2: John<img src=x onerror=alert(1)>
Test 3: javascript:alert("XSS")
Test 4: John' OR '1'='1
Test 5: <img src="x" onerror="alert(1)">
```

**Expected:** All HTML/script content should be stripped, only safe text remains.

### Method 3: Test via User Profile Update

1. **Go to Settings or Progress screen**
2. **Try to update profile with malicious data:**

```typescript
// In your code or via a test button
import { updateUserProfile } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();

// Test malicious input
await updateUserProfile(user.uid, {
  name: '<script>alert("XSS")</script>Test User',
  occupation: 'Developer<script>alert(1)</script>'
});
```

3. **Check the result:**
   - Profile should be updated with sanitized values
   - No script tags should appear in Firestore

### Method 4: Test OAuth Callback Page (Web)

1. **Open `public/auth/callback.html` in a browser**
2. **Manually test with malicious URL parameters:**

```
http://localhost/auth/callback.html?error=<script>alert("XSS")</script>
```

**Expected:** Error message should be escaped and displayed as plain text, not executed.

3. **Test with malicious token:**

```
http://localhost/auth/callback.html?id_token=<script>alert("XSS")</script>
```

**Expected:** Token should be URL-encoded and not executed.

### Method 5: Test in Web Version

1. **Install dependencies:**
```bash
cd Web
npm install
```

2. **Create a test component:**

```javascript
// Web/src/components/TestSanitization.jsx
import { sanitizeHtml, sanitizeName } from '@/utils/sanitize';
import { useState } from 'react';

export default function TestSanitization() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const testSanitization = () => {
    const sanitized = sanitizeName(input);
    setOutput(sanitized);
  };

  return (
    <div>
      <h2>Sanitization Test</h2>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter malicious input"
      />
      <button onClick={testSanitization}>Test</button>
      <div>
        <h3>Output:</h3>
        <p>{output}</p>
      </div>
      <div>
        <h3>Raw HTML (for comparison):</h3>
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(input) }} />
      </div>
    </div>
  );
}
```

3. **Add route and test:**
   - Add the component to a route
   - Enter malicious input and verify it's sanitized

## Test Cases to Try

### XSS Attack Vectors

```javascript
// Basic script injection
'<script>alert("XSS")</script>'

// Image with error handler
'<img src=x onerror=alert(1)>'

// JavaScript URL
'javascript:alert("XSS")'

// Event handlers
'<div onclick="alert(1)">Click</div>'

// SVG with script
'<svg><script>alert("XSS")</script></svg>'

// Data URI
'data:text/html,<script>alert("XSS")</script>'

// HTML entities
'&lt;script&gt;alert("XSS")&lt;/script&gt;'

// Mixed case
'<ScRiPt>alert("XSS")</ScRiPt>'
```

### SQL Injection (Should be handled by Firestore, but good to test)

```
' OR '1'='1
'; DROP TABLE users; --
admin'--
```

### Control Characters

```
'Hello\x00World'
'Test\x1F\x7F'
```

### Zero-Width Characters

```
'Hello\u200B\u200C\u200DWorld'
```

## Verification Steps

### 1. Check Firestore Database

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `users` collection
4. Verify user profile fields don't contain:
   - HTML tags
   - Script tags
   - JavaScript code
   - Control characters

### 2. Check App Display

1. View user profile in the app
2. Check that names/emails display correctly
3. Verify no script execution occurs
4. Check browser console for errors (Web version)

### 3. Check Network Requests

1. Open browser DevTools (Web) or React Native Debugger
2. Monitor network requests
3. Check that sanitized data is sent to Firestore
4. Verify no raw malicious input is transmitted

## Automated Testing

### Create a Test Screen (React Native)

```typescript
// app/test-sanitization.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { sanitizeName, sanitizeEmail, sanitizeUserProfile } from '@/utils/sanitize';
import { updateUserProfile } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

export default function TestSanitizationScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');

  const testSanitization = async () => {
    const sanitized = sanitizeUserProfile({ name, email });
    setResult(JSON.stringify(sanitized, null, 2));
    
    if (user) {
      await updateUserProfile(user.uid, sanitized);
    }
  };

  return (
    <ScrollView>
      <Text>Test Input Sanitization</Text>
      
      <TextInput
        placeholder="Enter malicious name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
      />
      
      <Button title="Test & Save" onPress={testSanitization} />
      
      <Text>Result:</Text>
      <Text>{result}</Text>
    </ScrollView>
  );
}
```

### Add Test Route

```typescript
// In your router
<Route path="/test-sanitization" element={<TestSanitizationScreen />} />
```

## Expected Results

### ✅ Success Indicators

- HTML tags are removed from user input
- Script tags are stripped
- JavaScript URLs are blocked
- Control characters are removed
- Length limits are enforced
- Email format is validated
- No script execution in browser/app
- Clean data in Firestore

### ❌ Failure Indicators

- HTML tags appear in Firestore
- Scripts execute in browser
- Malicious URLs are accepted
- Control characters persist
- Length limits are exceeded
- Invalid emails are accepted

## Quick Test Script

Run this in your browser console (Web version) or React Native debugger:

```javascript
// Test sanitization functions
import { sanitizeName, sanitizeEmail } from '@/utils/sanitize';

// Test cases
const tests = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert("XSS")',
  'John<script>alert(1)</script>Doe'
];

tests.forEach(test => {
  console.log(`Input: ${test}`);
  console.log(`Output: ${sanitizeName(test)}`);
  console.log('---');
});
```

## Production Verification

Before deploying:

1. ✅ Run all test cases
2. ✅ Check Firestore for clean data
3. ✅ Verify no console errors
4. ✅ Test with real OAuth providers
5. ✅ Verify callback page security
6. ✅ Check that user profiles display correctly

## Troubleshooting

### Issue: Sanitization not working

**Check:**
- Is `sanitizeUserProfile` being called in `userService.ts`?
- Are you importing from the correct path?
- Is the function being called before saving to Firestore?

### Issue: Data still contains HTML

**Check:**
- Verify the sanitization function is being called
- Check that updates go through `updateUserProfile` not direct Firestore writes
- Verify the sanitization logic is correct

### Issue: Valid data being removed

**Check:**
- Review the sanitization rules
- Adjust max length if needed
- Check email validation regex

