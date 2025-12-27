/**
 * Test Utilities for Input Sanitization
 * 
 * Use these test cases to verify sanitization is working correctly
 */

import { 
  sanitizeString, 
  sanitizeName, 
  sanitizeEmail, 
  sanitizeUrl,
  sanitizeUserProfile 
} from './sanitize';

/**
 * Run all sanitization tests and log results
 */
export const runSanitizationTests = () => {
  console.log('🧪 Running Input Sanitization Tests...\n');

  // Test 1: HTML Tag Injection
  console.log('Test 1: HTML Tag Injection');
  const htmlAttack = '<script>alert("XSS")</script>John';
  const sanitizedHtml = sanitizeName(htmlAttack);
  console.log(`Input: ${htmlAttack}`);
  console.log(`Output: ${sanitizedHtml}`);
  console.log(`✅ Pass: ${sanitizedHtml === 'John' || sanitizedHtml === ''}\n`);

  // Test 2: JavaScript URL
  console.log('Test 2: JavaScript URL');
  const jsUrl = 'javascript:alert("XSS")';
  const sanitizedJsUrl = sanitizeUrl(jsUrl);
  console.log(`Input: ${jsUrl}`);
  console.log(`Output: ${sanitizedJsUrl}`);
  console.log(`✅ Pass: ${sanitizedJsUrl === ''}\n`);

  // Test 3: Event Handler
  console.log('Test 3: Event Handler Injection');
  const eventHandler = 'John<img src=x onerror=alert(1)>';
  const sanitizedEvent = sanitizeName(eventHandler);
  console.log(`Input: ${eventHandler}`);
  console.log(`Output: ${sanitizedEvent}`);
  console.log(`✅ Pass: ${!sanitizedEvent.includes('onerror')}\n`);

  // Test 4: Control Characters
  console.log('Test 4: Control Characters');
  const controlChars = 'Hello\x00World\x1F';
  const sanitizedControl = sanitizeString(controlChars);
  console.log(`Input: ${JSON.stringify(controlChars)}`);
  console.log(`Output: ${sanitizedControl}`);
  console.log(`✅ Pass: ${sanitizedControl === 'HelloWorld'}\n`);

  // Test 5: Email Validation
  console.log('Test 5: Email Validation');
  const invalidEmail = 'not-an-email';
  const validEmail = 'test@example.com';
  const sanitizedInvalid = sanitizeEmail(invalidEmail);
  const sanitizedValid = sanitizeEmail(validEmail);
  console.log(`Invalid Input: ${invalidEmail}`);
  console.log(`Invalid Output: ${sanitizedInvalid}`);
  console.log(`Valid Input: ${validEmail}`);
  console.log(`Valid Output: ${sanitizedValid}`);
  console.log(`✅ Pass: ${sanitizedInvalid === '' && sanitizedValid === validEmail}\n`);

  // Test 6: User Profile Sanitization
  console.log('Test 6: User Profile Sanitization');
  const maliciousProfile = {
    name: '<script>alert("XSS")</script>John',
    email: 'test@example.com',
    occupation: 'Developer<script>alert(1)</script>',
    goals: ['Goal 1', '<script>alert(2)</script>', 'Goal 3'],
    codingLevel: 'Intermediate'
  };
  const sanitizedProfile = sanitizeUserProfile(maliciousProfile);
  console.log('Input:', maliciousProfile);
  console.log('Output:', sanitizedProfile);
  const nameSafe = !sanitizedProfile.name?.includes('<script>');
  const occupationSafe = !sanitizedProfile.occupation?.includes('<script>');
  const goalsSafe = sanitizedProfile.goals?.every(g => !g.includes('<script>'));
  console.log(`✅ Pass: ${nameSafe && occupationSafe && goalsSafe}\n`);

  // Test 7: Length Limiting
  console.log('Test 7: Length Limiting');
  const longString = 'a'.repeat(200);
  const sanitizedLong = sanitizeName(longString, 50);
  console.log(`Input Length: ${longString.length}`);
  console.log(`Output Length: ${sanitizedLong.length}`);
  console.log(`✅ Pass: ${sanitizedLong.length <= 50}\n`);

  // Test 8: Zero-Width Characters
  console.log('Test 8: Zero-Width Characters');
  const zeroWidth = 'Hello\u200B\u200C\u200DWorld';
  const sanitizedZero = sanitizeString(zeroWidth);
  console.log(`Input: ${JSON.stringify(zeroWidth)}`);
  console.log(`Output: ${sanitizedZero}`);
  console.log(`✅ Pass: ${sanitizedZero === 'HelloWorld'}\n`);

  console.log('✅ All tests completed!');
};

/**
 * Test specific sanitization function
 */
export const testSanitizeName = (input: string) => {
  const result = sanitizeName(input);
  console.log(`Input: ${input}`);
  console.log(`Sanitized: ${result}`);
  return result;
};

/**
 * Test specific sanitization function
 */
export const testSanitizeEmail = (input: string) => {
  const result = sanitizeEmail(input);
  console.log(`Input: ${input}`);
  console.log(`Sanitized: ${result}`);
  return result;
};

