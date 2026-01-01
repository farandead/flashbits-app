# Maestro E2E Tests

This directory contains end-to-end test flows for the flashbits app using Maestro.

## Test Flows

### `login.yml`
Tests the login screen to ensure:
- App launches correctly
- Login screen displays with all authentication options
- Branding elements are visible

### `home.yml`
Tests the home screen to ensure:
- Home screen loads after authentication
- Key features are displayed
- UI elements are visible

### `guest_flow.yml`
Tests the guest user flow:
- User can continue as guest
- App navigates to home screen
- Content loads correctly

### `home_guest.yml`
Tests the home screen for guest users:
- Verifies all UI elements are displayed
- Checks feature cards are visible
- Verifies Start Practice button
- Checks quick action buttons

### `home_authenticated.yml`
Tests the home screen for authenticated users:
- Verifies welcome message
- Checks authenticated user UI elements
- Verifies header buttons (settings, progress)

### `home_navigation.yml`
Tests navigation from home screen:
- Navigation to Settings screen
- Navigation to Progress screen
- Navigation to Feed (Start Practice)
- Back navigation works correctly

### `home_features.yml`
Tests all feature cards on home screen:
- Verifies all 4 feature cards are displayed
- Checks feature descriptions are visible
- Scrolls to ensure all features are accessible

## Running Tests Locally

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Build and install the app on a simulator/emulator:
   ```bash
   # For iOS
   npx expo run:ios
   
   # For Android
   npx expo run:android
   ```

3. Run a specific test:
   ```bash
   maestro test .maestro/login.yml
   maestro test .maestro/home.yml
   maestro test .maestro/guest_flow.yml
   ```

4. Run all tests:
   ```bash
   maestro test .maestro/
   ```

## Running Tests on EAS

Tests run automatically on pull requests via EAS Workflows:
- `.eas/workflows/e2e-test-android.yml` - Android tests
- `.eas/workflows/e2e-test-ios.yml` - iOS tests

You can also trigger them manually:
```bash
npx eas-cli@latest workflow:run .eas/workflows/e2e-test-android.yml
npx eas-cli@latest workflow:run .eas/workflows/e2e-test-ios.yml
```

## Writing New Tests

1. Create a new `.yml` file in `.maestro/`
2. Start with `appId: com.flashbits.app`
3. Add test steps using Maestro commands
4. Add the flow to the workflow files in `.eas/workflows/`

## Maestro Documentation

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Commands](https://maestro.mobile.dev/reference/commands)

