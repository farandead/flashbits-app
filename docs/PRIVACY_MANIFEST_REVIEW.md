# Privacy Manifest Review & Corrections

**Date:** 2025-01-16  
**File:** `ios/PrivacyInfo.xcprivacy`  
**Status:** ✅ **UPDATED** - Now matches app functionality

---

## 📋 Review Summary

I reviewed your Privacy Manifest against your actual app code and made corrections to ensure it accurately reflects what data you collect and which APIs you use.

---

## ✅ What Was Correct

1. **No User Tracking** - Correctly set to `false` ✅
   - Your app doesn't track users across apps/websites
   - Privacy-first design with no userId in public activities

2. **User ID Collection** - Correctly declared ✅
   - Firebase Auth user IDs collected for authentication
   - Purpose: App Functionality

3. **Email Address Collection** - Correctly declared ✅
   - Collected for authentication (email/password, OAuth)
   - Purpose: App Functionality

4. **Purchase History** - Correctly declared ✅
   - RevenueCat subscription data
   - Purpose: App Functionality

5. **UserDefaults API** - Correctly declared ✅
   - Used by AsyncStorage for local data storage
   - Reason: CA92.1 (Access user defaults for app functionality)

6. **File Timestamp API** - Correctly declared ✅
   - Used by AsyncStorage, Firebase, and dependencies
   - Reason: DDA9.1 (Access file timestamps for app functionality)

---

## 🔧 What I Fixed

### 1. Added Name Data Collection
**Issue:** Your app collects user names (first name) for:
- User profiles (`services/userService.ts`)
- Activity display names (`services/activityService.ts`)
- Onboarding flow (`app/onboarding.tsx`)

**Fix:** Added `NSPrivacyCollectedDataTypeName` declaration

### 2. Added Other User Content
**Issue:** Your app collects country/region data derived from timezone:
- Used in activities for social proof (`services/activityService.ts`)
- Derived from `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Stored as `country` and `countryCode` in activities

**Fix:** Added `NSPrivacyCollectedDataTypeOtherUserContent` declaration

### 3. Removed Analytics Purpose from Product Interaction
**Issue:** Product Interaction was declared with both Analytics and App Functionality purposes, but:
- Firebase Analytics is disabled in `GoogleService-Info.plist` (`IS_ANALYTICS_ENABLED: false`)
- Product interaction data (XP, streaks, questions) is used for app functionality, not analytics

**Fix:** Removed `NSPrivacyCollectedDataTypePurposeAnalytics` from Product Interaction
- Now only declares `NSPrivacyCollectedDataTypePurposeAppFunctionality`

### 4. Added Comments for Clarity
**Issue:** API usage reasons lacked context

**Fix:** Added comments explaining:
- File timestamps: Used by AsyncStorage, Firebase, and dependencies
- UserDefaults: Used by AsyncStorage for local data storage

---

## 📊 Data Collection Summary

Based on code review, your app collects:

| Data Type | Where Used | Purpose | Linked | Tracking |
|-----------|------------|---------|--------|----------|
| User ID | Firebase Auth | Authentication | No | No |
| Email Address | Firebase Auth | Authentication | No | No |
| Name | User profiles, Activities | App functionality | No | No |
| Product Interaction | XP, streaks, questions | App functionality | No | No |
| Purchase History | RevenueCat subscriptions | Subscription management | No | No |
| Other User Content | Country/region (from timezone) | Activities/social proof | No | No |

**All data is:**
- ✅ Not linked to user identity (Linked: false)
- ✅ Not used for tracking (Tracking: false)
- ✅ Used only for app functionality

---

## 🔍 Code Evidence

### Data Collection Found:

1. **User ID & Email** (`config/firebase.ts`, `context/AuthContext.tsx`)
   - Firebase Authentication
   - Stored in Firestore user profiles

2. **Name** (`services/userService.ts`, `app/onboarding.tsx`)
   - Collected during onboarding
   - Stored in user profile
   - Used for activity display names

3. **Product Interaction** (`services/statsService.ts`, `hooks/useStreak.ts`)
   - XP tracking
   - Streak tracking
   - Questions answered
   - Progress tracking

4. **Purchase History** (`services/revenueCatService.ts`)
   - Subscription status
   - Entitlement checking
   - RevenueCat integration

5. **Country/Region** (`services/activityService.ts:61-118`)
   - Derived from timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Stored in activities for social proof
   - Not GPS-based location

### API Usage Found:

1. **UserDefaults** (`context/SettingsContext.tsx`, `services/notificationService.ts`, etc.)
   - AsyncStorage uses UserDefaults on iOS
   - Used extensively for:
     - Settings storage
     - Notification preferences
     - Streak data
     - Offline question storage
     - Profile caching

2. **File Timestamps** (Dependencies)
   - AsyncStorage uses file timestamps
   - Firebase SDK may use file timestamps
   - Used for caching and offline storage

---

## ✅ Verification Checklist

- [x] All data types collected are declared
- [x] All API usage is declared with correct reasons
- [x] Tracking is correctly set to `false`
- [x] Data linking is correctly set to `false`
- [x] Purposes match actual usage
- [x] Comments added for clarity

---

## 🚨 Important Notes

### 1. Firebase Analytics
Your `GoogleService-Info.plist` shows:
```xml
<key>IS_ANALYTICS_ENABLED</key>
<false></false>
```

**This means:**
- Firebase Analytics is **disabled**
- You're **not** collecting analytics data
- Product Interaction is for app functionality only (XP, streaks, progress)

**If you enable Firebase Analytics in the future:**
- Add `NSPrivacyCollectedDataTypePurposeAnalytics` to Product Interaction
- Or create a separate data type declaration for analytics

### 2. Country/Region Data
Your app derives country from timezone, not GPS:
- Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`
- No location permissions required
- Declared as "Other User Content" (not Location data)

### 3. Privacy-First Design
Your app has excellent privacy practices:
- No userId in public activities
- No user tracking
- Data not linked to identity
- Privacy-first architecture

---

## 📝 Next Steps

1. ✅ **Privacy Manifest Updated** - File is now accurate
2. ⚠️ **Verify in Build** - Ensure the file is included in your EAS build
3. ⚠️ **Test Submission** - Test that App Store accepts the manifest
4. ⚠️ **Monitor for Updates** - If you add new data collection, update the manifest

---

## 🔗 References

- [Apple Privacy Manifest Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Required Reason API Usage](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)
- [Data Collection Types](https://developer.apple.com/app-store/app-privacy-details/)

---

**Last Updated:** 2025-01-16  
**Status:** ✅ Ready for App Store submission

