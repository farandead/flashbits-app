# Detox E2E Testing Setup

This guide explains how to set up and run Detox E2E tests for the flashbits app, focusing on the index (login) page.

## What is Detox?

Detox is a gray-box end-to-end testing framework for React Native apps. It runs tests on real devices/simulators and provides reliable, fast E2E tests.

## Setup

### 1. Dependencies

Already installed:
- `detox` - E2E testing framework
- `jest-circus` - Jest test runner for Detox

### 2. Configuration Files

- `.detoxrc.js` - Detox configuration (build commands, device settings)
- `e2e/jest.config.js` - Jest configuration for E2E tests
- `e2e/init.ts` - Detox initialization and cleanup

### 3. Test Files

- `e2e/index.e2e.ts` - E2E tests for login screen (index page)

## Running Tests

### iOS

```bash
# Build the app first
npm run test:e2e:ios:build

# Run tests
npm run test:e2e:ios
```

### Android

```bash
# Build the app first
npm run test:e2e:android:build

# Run tests
npm run test:e2e:android
```

## Prerequisites

### iOS

1. **Xcode** installed
2. **CocoaPods** dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```
3. **iOS Simulator** available (iPhone 15 Pro with iOS 17.0)

### Android

1. **Android SDK** installed
2. **Android Emulator** created:
   - AVD Name: `Pixel_5_API_33` (or update `.detoxrc.js`)
   - API Level 33 recommended
3. **Java Development Kit (JDK)** installed

## Test Structure

### Current Tests (Index Page)

1. **Initial Render**
   - Verifies login screen displays correctly
   - Checks app branding
   - Verifies authentication options

2. **Guest User Flow**
   - Tests navigation when "Continue as Guest" is tapped
   - Verifies home screen appears

3. **Authentication Buttons**
   - Tests button accessibility
   - Verifies button text

4. **Terms and Conditions**
   - Verifies terms links are displayed

## Writing New Tests

### Example

```typescript
import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('My Feature', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should do something', async () => {
    // Wait for element
    await waitFor(element(by.id('my-button')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Interact
    await element(by.id('my-button')).tap();
    
    // Assert
    await detoxExpect(element(by.text('Expected Text'))).toBeVisible();
  });
});
```

## Element Selection

### Best Practices

1. **Use accessibility identifiers** (preferred):
   ```typescript
   element(by.id('login-button-guest'))
   ```

2. **Use accessibility labels**:
   ```typescript
   element(by.label('Continue as Guest'))
   ```

3. **Use text** (when necessary):
   ```typescript
   element(by.text('flashbits'))
   ```

4. **Avoid layout-based selectors** - Don't use coordinates or visual structure

## Troubleshooting

### Build Fails

- **iOS**: Ensure Xcode workspace is properly configured
- **Android**: Check that Gradle build completes successfully
- Clean build: `cd ios && xcodebuild clean && cd ..`

### Tests Timeout

- Increase timeout in test: `.withTimeout(10000)`
- Check device/simulator is running
- Verify app builds correctly

### Element Not Found

- Ensure `accessibilityIdentifier` is set in component
- Check element is actually visible (may need scrolling)
- Verify element isn't covered by another view

## Next Steps

1. Add more tests for other screens (home, feed, settings)
2. Add tests for critical user flows
3. Set up CI/CD integration
4. Add visual regression testing (optional)

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox API Reference](https://wix.github.io/Detox/docs/api/actions)
- [Detox Matchers](https://wix.github.io/Detox/docs/api/matchers)


