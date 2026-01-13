# App Store EULA Fix - Guideline 3.1.2

## Issue
Apple rejected the app because the metadata is missing a functional link to the Terms of Use (EULA) when using Apple's standard EULA.

## Solution

### 1. App Binary (Already Fixed ✅)
The Paywall component has been updated to link to Apple's standard EULA:
- **Link**: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- **Location**: Paywall component footer (same screen as purchase CTA)
- **Status**: ✅ Fixed in code

### 2. App Store Connect Metadata (ACTION REQUIRED ⚠️)

You need to add the EULA link to your App Description in App Store Connect:

#### Steps:
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → Select your **Flashbits** app
3. Go to the **App Information** tab
4. Scroll to **App Description** field
5. Add the following text at the end of your app description:

```
By using this app, you agree to Apple's standard End User License Agreement: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

#### Alternative Option:
If you prefer not to modify the App Description, you can:
1. Go to **App Information** → **License Agreement**
2. Ensure **"Standard Apple EULA"** is selected
3. However, Apple still requires the link in the App Description when using standard EULA

### 3. Verify License Agreement Setting

1. In App Store Connect, go to **App Information**
2. Check the **License Agreement** field
3. Ensure it's set to **"Standard Apple EULA"** (not a custom EULA)

### 4. What Was Changed in Code

**File**: `components/Paywall.tsx`

- Updated Terms of Use link from `https://flashbits.co/terms` to Apple's standard EULA
- Link now points to: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- Label updated to "Terms of Use (EULA)" for clarity

### 5. Testing

After updating App Store Connect:
1. Submit a new build
2. Verify the App Description includes the EULA link
3. Test that the link in the app opens correctly (should open Apple's EULA page)

### Important Notes

- The EULA link must be functional and accessible
- The link should be in the App Description, not just in the binary
- Both the app binary AND metadata must include the EULA link
- Privacy Policy link should remain in the Privacy Policy field in App Store Connect

### Reference

- Apple's Standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- App Store Review Guidelines 3.1.2: https://developer.apple.com/app-store/review/guidelines/#subscriptions

