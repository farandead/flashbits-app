# Testing Guide

This document provides information about the testing setup for the flashbits project.

## Setup

The project uses:
- **Jest** - Test runner
- **React Native Testing Library** - Component testing utilities
- **jest-expo** - Expo-specific Jest preset

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are located in `__tests__` directories next to the files they test:

```
app/
  __tests__/
    index.test.tsx
    passwordStrength.test.ts
  index.tsx
```

## Writing Tests

### Example Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
```

## Mocking

Common mocks are set up in `jest.setup.js`:

- React Native modules (Platform, Dimensions, Alert, etc.)
- Expo modules (expo-router, expo-haptics, etc.)
- Firebase Auth
- AuthContext
- User services

### Custom Mocks

To create custom mocks for your tests:

```typescript
jest.mock('@/services/myService', () => ({
  myFunction: jest.fn(() => Promise.resolve('result')),
}));
```

## Testing Best Practices

1. **Test user interactions, not implementation details**
   - Test what users see and do, not internal state

2. **Use queries that users would use**
   - Prefer `getByText`, `getByRole` over `getByTestId`

3. **Test error states**
   - Ensure error messages are displayed correctly

4. **Test loading states**
   - Verify loading indicators appear when appropriate

5. **Mock external dependencies**
   - Mock API calls, navigation, and platform-specific code

## Coverage

Aim for:
- **80%+ coverage** for critical paths (auth, payments, data sync)
- **60%+ coverage** for UI components
- **90%+ coverage** for utility functions

View coverage report:
```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in your browser.

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that module paths in `jest.config.js` match your project structure

### Mock not working
- Check that mocks are defined before imports
- Verify mock is in `jest.setup.js` or at the top of your test file

### Async test issues
- Use `waitFor` for async operations:
  ```typescript
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeTruthy();
  });
  ```

## Resources

- [React Native Testing Library Docs](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)

