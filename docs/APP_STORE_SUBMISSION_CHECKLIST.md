# App Store Submission Checklist for flashbits

**App Name:** flashbits  
**Bundle ID:** com.flashbits.app  
**Version:** 1.0.0  
**Review Date:** 2025-01-16

This checklist covers all requirements Apple reviews during App Store submission.

---

## 🔴 CRITICAL - Must Fix Before Submission

### 1. Privacy Manifest (iOS 17+ Requirement)
**Status:** ❌ **MISSING**  
**Priority:** CRITICAL - App will be rejected without this

**Issue:** Apple requires a Privacy Manifest file (`PrivacyInfo.xcprivacy`) for apps using certain APIs or SDKs.

**Required Actions:**
- [ ] Create `ios/PrivacyInfo.xcprivacy` file
- [ ] Declare all required privacy reasons for:
  - User tracking (if applicable)
  - Required reason API usage
  - Data collection types

**Fix:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeUserID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <!-- Add if using file timestamps, user defaults, etc. -->
    </array>
</dict>
</plist>
```

**Location:** Add to `app.json`:
```json
"ios": {
  "privacyManifests": ["./ios/PrivacyInfo.xcprivacy"]
}
```

---

### 2. Privacy Policy URL Verification
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] Verify `https://flashbits.co/privacy` is accessible and live
- [ ] Privacy policy must be comprehensive and cover:
  - What data is collected
  - How data is used
  - Third-party services (Firebase, RevenueCat, etc.)
  - User rights (GDPR, CCPA)
  - Contact information
- [ ] Privacy policy must be accessible without login
- [ ] Link must work in App Store Connect

**Current Status:** Link exists in code (`app/index.tsx`, `app/onboarding.tsx`, `app/settings.tsx`)

---

### 3. Terms of Service URL Verification
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] Verify `https://flashbits.co/terms` is accessible and live
- [ ] Terms must cover:
  - User responsibilities
  - Subscription terms and cancellation
  - Intellectual property
  - Limitation of liability
  - Dispute resolution
- [ ] Link must work in App Store Connect

**Current Status:** Link exists in code

---

### 4. App Store Connect Metadata
**Status:** ⚠️ **NEEDS COMPLETION**

**Required in App Store Connect:**
- [ ] **App Name:** "flashbits" (30 characters max) ✅
- [ ] **Subtitle:** "Master coding interviews with style" (30 characters max) ✅
- [ ] **Description:** Use content from `APP_STORE_DESCRIPTION.md` ✅
- [ ] **Keywords:** "coding interview,leetcode,programming,algorithms,data structures,tech interview,software engineer,FAANG,preparation" (100 characters max) ✅
- [ ] **Support URL:** `https://flashbits.co/support` ✅
- [ ] **Marketing URL:** `https://flashbits.co` (optional) ✅
- [ ] **Privacy Policy URL:** `https://flashbits.co/privacy` ✅
- [ ] **Category:** Primary: Education, Secondary: Productivity ✅
- [ ] **Age Rating:** 4+ ✅
- [ ] **App Icon:** 1024x1024px PNG (no transparency, no rounded corners) - Upload to App Store Connect

---

### 5. Screenshots (Required for All Device Sizes)
**Status:** ❌ **MISSING**

**Required Screenshots:**
- [ ] **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max, 16 Pro Max)
  - Minimum 3 screenshots (up to 10 allowed)
  - Recommended: Main feed, Progress screen, Settings screen
- [ ] **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max)
  - Minimum 3 screenshots
- [ ] **iPhone 5.5" Display** (iPhone 8 Plus)
  - Minimum 3 screenshots (if supporting)

**Screenshot Requirements:**
- PNG or JPEG format
- No device frames (Apple adds them automatically)
- No status bar text overlays
- No placeholder text
- Show actual app functionality
- Use phrases from `APP_STORE_SCREENSHOT_PHRASES.md` for text overlays

**Current Status:** Screenshots need to be created and uploaded

---

### 6. App Preview Video (Optional but Recommended)
**Status:** ⚠️ **OPTIONAL**

**If Creating:**
- [ ] 15-30 second video showing key features
- [ ] Show swipe-based question feed
- [ ] Demonstrate XP earning and rank progression
- [ ] Highlight offline mode
- [ ] Upload for each device size (optional)

---

## 🟡 HIGH PRIORITY - Fix Before Submission

### 7. In-App Purchase Configuration
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required in App Store Connect:**
- [ ] **Subscription Group:** "Flashbits Pro" created
- [ ] **Monthly Subscription:** `com.flashbits.pro.monthly`
  - [ ] Product ID matches code exactly
  - [ ] Display name: "Flashbits Pro Monthly"
  - [ ] Description: "Unlimited access to all coding interview questions and features"
  - [ ] Pricing set for all territories
  - [ ] Subscription duration: 1 month
  - [ ] Free trial configured (if applicable)
- [ ] **Yearly Subscription:** `com.flashbits.pro.yearly`
  - [ ] Product ID matches code exactly
  - [ ] Display name: "Flashbits Pro Yearly"
  - [ ] Description: "Unlimited access to all coding interview questions and features"
  - [ ] Pricing set for all territories
  - [ ] Subscription duration: 1 year
  - [ ] Free trial configured (if applicable)
- [ ] **Subscription Terms:**
  - [ ] Privacy policy URL linked
  - [ ] Terms of service URL linked
  - [ ] Subscription management info provided

**Code Verification:**
- [x] Product IDs match: `com.flashbits.pro.monthly`, `com.flashbits.pro.yearly` ✅
- [x] RevenueCat integration configured ✅
- [ ] Test purchases with sandbox account
- [ ] Verify restore purchases works
- [ ] Verify subscription cancellation flow

---

### 8. App Store Connect App Information
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **App Store Connect App Created:**
  - [ ] Bundle ID: `com.flashbits.app` matches
  - [ ] App name: "flashbits"
  - [ ] Primary language: English (or your language)
- [ ] **Version Information:**
  - [ ] Version: 1.0.0
  - [ ] Build number: 1 (or increment for each submission)
- [ ] **Pricing and Availability:**
  - [ ] Price tier selected (Free with in-app purchases)
  - [ ] Availability countries selected
- [ ] **App Review Information:**
  - [ ] Contact information (name, phone, email)
  - [ ] Demo account credentials (if app requires login)
  - [ ] Notes for reviewer (explain any special features)
- [ ] **Version Release:**
  - [ ] Automatic release after approval
  - [ ] Or manual release

**Current Status:** `eas.json` has `ascAppId: "6756982859"` - verify this matches App Store Connect

---

### 9. Apple Developer Account Setup
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **Apple Developer Program:** Active membership ($99/year)
- [ ] **App ID Registered:**
  - [ ] Bundle ID: `com.flashbits.app`
  - [ ] Capabilities enabled:
    - [ ] Sign In with Apple ✅ (configured in app.json)
    - [ ] Push Notifications ✅ (configured in app.json)
    - [ ] Background Modes ✅ (configured in app.json)
- [ ] **Certificates:**
  - [ ] Distribution certificate (EAS can manage this)
  - [ ] Push notification certificate (if using APNs directly)
- [ ] **Provisioning Profiles:**
  - [ ] App Store distribution profile (EAS can manage this)
- [ ] **Team ID Verification:**
  - [ ] `app.json`: `appleTeamId: "8D4VX8MVPN"` ✅
  - [ ] `eas.json`: `appleTeamId: "8D4VX8MVPN"` ✅
  - [ ] Verify this matches Apple Developer Portal

---

### 10. Encryption Compliance (ITSAppUsesNonExemptEncryption)
**Status:** ✅ **CONFIGURED**

**Current Configuration:**
```json
"ITSAppUsesNonExemptEncryption": false
```

**Verification:**
- [x] Set to `false` (app uses standard encryption only) ✅
- [ ] If using custom encryption, may need to set to `true` and file export compliance

**Note:** Standard HTTPS/TLS encryption doesn't require export compliance documentation.

---

### 11. App Icons and Assets
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **App Icon:** 1024x1024px PNG
  - [ ] No transparency
  - [ ] No rounded corners (Apple adds them)
  - [ ] No alpha channel
  - [ ] Matches app design
  - [ ] Upload to App Store Connect (not just in app.json)
- [ ] **Splash Screen:** Configured in app.json ✅
- [ ] **Notification Icon:** Configured in app.json ✅

**Current Status:** Icons exist in `assets/icons/` - verify 1024x1024 icon is ready

---

### 12. Build Configuration
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **Build Number:** Increment for each submission (currently "1")
- [ ] **Version:** 1.0.0 (appropriate for first release)
- [ ] **Production Build:**
  - [ ] Built with `eas build --platform ios --profile production`
  - [ ] Distribution: "store"
  - [ ] No debug code included
  - [ ] No test accounts hardcoded
- [ ] **Environment Variables:**
  - [ ] All production API keys configured
  - [ ] No development/test keys in production build

**Current Status:** Production profile configured in `eas.json` ✅

---

## 🟢 MEDIUM PRIORITY - Review Before Submission

### 13. Content Guidelines Compliance
**Status:** ⚠️ **NEEDS REVIEW**

**Apple Reviews:**
- [ ] **No Objectionable Content:** App is educational (coding interview prep) ✅
- [ ] **No Misleading Claims:** Description is accurate ✅
- [ ] **No Spam/Repetitive Content:** App provides unique value ✅
- [ ] **Age Rating Appropriate:** 4+ rating is correct ✅
- [ ] **No Copyright Violations:** All content is original or properly licensed
- [ ] **No Trademark Violations:** App name doesn't infringe on trademarks

---

### 14. Functionality Requirements
**Status:** ⚠️ **NEEDS TESTING**

**Apple Tests:**
- [ ] **App Launches:** App opens without crashing
- [ ] **Core Features Work:**
  - [ ] Authentication (Email, Apple, Google, GitHub)
  - [ ] Question feed loads
  - [ ] Swipe functionality works
  - [ ] XP/streak system works
  - [ ] Offline mode works
  - [ ] Subscription purchase flow works
  - [ ] Restore purchases works
- [ ] **No Broken Links:** All links in app work
- [ ] **No Placeholder Content:** All content is real
- [ ] **Performance:** App is responsive, no excessive loading times
- [ ] **Error Handling:** App handles errors gracefully

---

### 15. User Interface Guidelines
**Status:** ⚠️ **NEEDS REVIEW**

**Apple Reviews:**
- [ ] **Design Quality:** App follows iOS design guidelines
- [ ] **Navigation:** Intuitive navigation
- [ ] **Accessibility:** Basic accessibility support
- [ ] **Dark Mode:** Supports dark mode (configured in app.json) ✅
- [ ] **Safe Areas:** Content respects safe areas
- [ ] **Status Bar:** Properly configured

---

### 16. Subscription Management
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **Restore Purchases:** Implemented and working ✅ (in code)
- [ ] **Subscription Management:**
  - [ ] Users can view active subscriptions
  - [ ] Users can cancel subscriptions (via Settings app or Customer Center)
  - [ ] Customer Center implemented ✅ (in code)
- [ ] **Subscription Terms:**
  - [ ] Clear pricing displayed
  - [ ] Subscription duration clearly stated
  - [ ] Auto-renewal terms explained
  - [ ] Cancellation instructions provided

**Current Status:** RevenueCat Customer Center implemented ✅

---

### 17. Privacy & Data Collection
**Status:** ⚠️ **NEEDS REVIEW**

**Apple Reviews:**
- [ ] **Data Collection Disclosure:**
  - [ ] Privacy policy explains all data collection
  - [ ] App doesn't collect unnecessary data
  - [ ] Third-party SDKs disclosed (Firebase, RevenueCat)
- [ ] **User Tracking:**
  - [ ] If tracking users, ATT (App Tracking Transparency) implemented
  - [ ] Current status: No tracking declared ✅
- [ ] **Data Usage:**
  - [ ] Data used only for stated purposes
  - [ ] No data sold to third parties
  - [ ] User data deletion available

**Current Status:** Privacy-first design implemented ✅

---

### 18. Support & Contact Information
**Status:** ⚠️ **NEEDS VERIFICATION**

**Required:**
- [ ] **Support URL:** `https://flashbits.co/support` is live and functional
- [ ] **Support Response Time:** Plan to respond to user inquiries
- [ ] **Contact Information:** Available in App Store Connect
- [ ] **In-App Support:** Consider adding support/contact option in app

**Current Status:** Support URL configured ✅

---

### 19. App Review Notes
**Status:** ⚠️ **NEEDS PREPARATION**

**Prepare for App Store Connect:**
- [ ] **Demo Account:** Create test account for reviewers
  - [ ] Email: (provide in App Store Connect)
  - [ ] Password: (provide in App Store Connect)
  - [ ] Account has sample data
- [ ] **Review Notes:** Explain any special features
  - [ ] How to test subscription flow
  - [ ] Any special setup required
  - [ ] Key features to test

---

### 20. Code Quality & Security
**Status:** ⚠️ **NEEDS CLEANUP**

**Before Submission:**
- [ ] **Remove Debug Code:**
  - [ ] Remove or wrap `console.log` statements in `__DEV__` checks
  - [ ] Remove test/debug code
  - [ ] Remove TODO comments
- [ ] **Security:**
  - [ ] No hardcoded API keys in production build
  - [ ] Environment variables properly configured
  - [ ] No sensitive data in code
- [ ] **Error Handling:**
  - [ ] Graceful error handling throughout app
  - [ ] No crash logs in production

**Current Status:** Some console.log statements found - needs cleanup

---

## ✅ ALREADY CONFIGURED

### What's Already Good:
- ✅ Bundle ID: `com.flashbits.app`
- ✅ App name: "flashbits"
- ✅ Sign In with Apple configured
- ✅ Push notifications configured
- ✅ Background modes configured
- ✅ Privacy policy and Terms links in app
- ✅ RevenueCat integration
- ✅ Subscription products configured in code
- ✅ Customer Center implemented
- ✅ App Store description prepared
- ✅ Keywords prepared
- ✅ Support URL configured
- ✅ Marketing URL configured
- ✅ Age rating: 4+
- ✅ Categories: Education, Productivity
- ✅ Encryption compliance set
- ✅ Dark mode support
- ✅ EAS build configuration

---

## 📋 Pre-Submission Final Checklist

### Before Building Production Build:
1. [ ] Create Privacy Manifest file
2. [ ] Verify all URLs are live and accessible
3. [ ] Clean up console.log statements
4. [ ] Test on physical iOS device
5. [ ] Test all authentication flows
6. [ ] Test subscription purchase flow
7. [ ] Test restore purchases
8. [ ] Verify app works offline
9. [ ] Check for any crashes or errors

### Before Submitting to App Store:
1. [ ] Complete App Store Connect metadata
2. [ ] Upload app icon (1024x1024)
3. [ ] Upload screenshots for all device sizes
4. [ ] Configure in-app purchases in App Store Connect
5. [ ] Set up subscription groups
6. [ ] Add demo account credentials
7. [ ] Write review notes
8. [ ] Build production version
9. [ ] Upload build to App Store Connect
10. [ ] Submit for review

---

## 🚨 Common Rejection Reasons to Avoid

1. **Missing Privacy Manifest** - Will be rejected for iOS 17+
2. **Broken Links** - Privacy policy, terms, or support URL not accessible
3. **Incomplete Metadata** - Missing description, screenshots, or app icon
4. **Subscription Issues** - Products not configured correctly in App Store Connect
5. **Demo Account Issues** - Can't log in or test features
6. **Crashes** - App crashes during review
7. **Placeholder Content** - App contains placeholder text or images
8. **Misleading Claims** - Description doesn't match app functionality
9. **Missing Functionality** - Core features don't work
10. **Guideline Violations** - Content or design violates guidelines

---

## 📝 Submission Steps

1. **Prepare:**
   - Complete all critical items above
   - Test thoroughly on device
   - Prepare screenshots and metadata

2. **Build:**
   ```bash
   eas build --platform ios --profile production
   ```

3. **Submit:**
   ```bash
   eas submit --platform ios --latest
   ```
   Or manually upload via App Store Connect

4. **Monitor:**
   - Check App Store Connect for review status
   - Respond to any reviewer questions
   - Fix any issues if rejected

---

## ⏱️ Estimated Timeline

- **Critical Fixes:** 2-4 hours
- **Screenshot Creation:** 2-4 hours
- **App Store Connect Setup:** 1-2 hours
- **Testing:** 2-4 hours
- **Review Time:** 24-48 hours (typically)

**Total:** ~1-2 days for preparation + 1-2 days for review

---

## 📞 Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Privacy Manifest Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)

---

**Last Updated:** 2025-01-16  
**Next Review:** Before submission

