# Apple Developer & App Store Connect Setup Guide

Complete guide for setting up flashbits on Apple Developer and App Store Connect for Expo + React Native + Firebase.

## Prerequisites

- Apple ID (personal or business)
- Credit card for Apple Developer Program enrollment ($99/year)
- Your app ready to build (this guide assumes you're using Expo/EAS)

## Step 1: Enroll in Apple Developer Program

### 1.1 Create/Use Apple ID

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in or create an Apple ID
3. Complete two-factor authentication setup

### 1.2 Enroll in Developer Program

1. Visit [developer.apple.com/programs](https://developer.apple.com/programs)
2. Click **"Enroll"**
3. Sign in with your Apple ID
4. Choose enrollment type:
   - **Individual**: $99/year, uses your personal name
   - **Organization**: $99/year, uses company name (requires D-U-N-S number)
5. Complete enrollment:
   - Enter personal/company information
   - Add payment method
   - Agree to license agreement
   - Wait for approval (usually instant, can take up to 48 hours)

### 1.3 Verify Enrollment

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Verify you see "Apple Developer Program" status: **Active**
3. Note your **Team ID** (found in Membership section)

## Step 2: Create App in App Store Connect

### 2.1 Access App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Accept terms if prompted

### 2.2 Create New App

1. Click **"My Apps"** → **"+"** → **"New App"**
2. Fill in app information:

   **Platform**: iOS
   
   **Name**: flashbits (or your preferred name)
   - Must be unique in App Store
   - Can be changed later
   
   **Primary Language**: English (or your choice)
   
   **Bundle ID**: 
   - Select **"Register a new Bundle ID"** or use existing
   - Format: `com.flashbits.app` (matches your `app.json`)
   - Must match exactly what's in your `app.json`:
     ```json
     "ios": {
       "bundleIdentifier": "com.flashbits.app"
     }
     ```
   
   **SKU**: 
   - Unique identifier (e.g., `flashbits-001`)
   - Not visible to users
   - Cannot be changed later
   
   **User Access**: 
   - **Full Access** (recommended for solo developers)
   - **App Manager** (for team members)

3. Click **"Create"**

### 2.3 Configure App Information

After creating the app, configure these sections:

#### App Information
- **Name**: flashbits
- **Subtitle**: (optional) Brief description
- **Category**: 
  - Primary: Education (or appropriate category)
  - Secondary: (optional)
- **Privacy Policy URL**: Required for App Store submission
  - Example: `https://flashprep-11c85.web.app/privacy`

#### Pricing and Availability
- **Price**: Free or Paid
- **Availability**: Select countries (or all)

#### App Privacy
- **Privacy Policy**: Required
- **Data Collection**: Declare what data you collect
  - For Firebase: User authentication, usage analytics
  - Be transparent about data collection

## Step 3: Configure EAS Build for iOS

### 3.1 Update eas.json

Your `eas.json` should already have iOS configuration. Verify it matches:

```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-email@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 3.2 Get Your App Store Connect App ID

1. In App Store Connect, go to your app
2. Click **"App Information"**
3. Find **"Apple ID"** (numeric ID like `1234567890`)
4. Copy this ID

### 3.3 Update eas.json with Your Information

Update the submit section in `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890",  // Your App Store Connect App ID
      "appleTeamId": "ABC123XYZ"  // Your Team ID from Apple Developer
    }
  }
}
```

## Step 4: Configure Required Capabilities

Before building, you need to enable the required capabilities in Apple Developer Portal.

**Your app needs**:
- ✅ **Sign In with Apple** (for Apple authentication)
- ✅ **Push Notifications** (for remote notifications)
- ✅ **Background Modes** (for remote notifications in background)

**Quick Setup**:
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Select or create your App ID (`com.flashbits.app`)
4. Enable the three capabilities listed above
5. Click **"Save"**

**📖 For detailed setup instructions**, see [IOS_CAPABILITIES_SETUP.md](./IOS_CAPABILITIES_SETUP.md)

## Step 5: Set Up Credentials with EAS

### 4.1 Configure Credentials

EAS can automatically manage certificates and provisioning profiles:

```bash
eas credentials
```

Choose:
- **Platform**: iOS
- **Project**: Select your project
- **Action**: 
  - **"Set up credentials"** (first time)
  - **"Manage credentials"** (later)

### 4.2 Let EAS Manage Credentials (Recommended)

When prompted:
1. Select **"Let EAS handle it"** (automatic)
2. Provide your Apple ID when asked
3. EAS will:
   - Generate distribution certificate
   - Create provisioning profile
   - Configure everything automatically

### 4.3 Manual Credential Setup (Optional)

If you prefer manual setup:
1. Select **"Set up manually"**
2. You'll need to:
   - Create certificates in Apple Developer
   - Generate provisioning profiles
   - Upload to EAS

**Recommendation**: Use automatic setup unless you have specific requirements.

## Step 6: Build Your iOS App

### 5.1 First Build

```bash
# Build for App Store
npm run build:ios

# Or directly
eas build --platform ios --profile production
```

### 5.2 During First Build

EAS will prompt you:
1. **Apple ID**: Enter your Apple Developer email
2. **Team Selection**: Choose your team (if multiple)
3. **Distribution Certificate**: EAS will create one
4. **Provisioning Profile**: EAS will generate automatically

### 5.3 Monitor Build

```bash
# Check build status
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

Build typically takes **15-20 minutes**.

## Step 7: Prepare App Store Listing

While the build is running, prepare your App Store listing:

### 6.1 App Store Information

In App Store Connect → Your App → **"App Store"** tab:

#### App Preview and Screenshots
- **Required**: Screenshots for all device sizes
  - iPhone 6.7" (iPhone 14 Pro Max, etc.)
  - iPhone 6.5" (iPhone 11 Pro Max, etc.)
  - iPhone 5.5" (iPhone 8 Plus, etc.)
  - iPad Pro 12.9" (if supporting iPad)
- **Optional**: App Preview videos

#### Description
- **Subtitle**: Short tagline (30 characters)
- **Description**: Full app description (up to 4,000 characters)
- **Keywords**: Search keywords (100 characters, comma-separated)
- **Support URL**: Your support website
- **Marketing URL**: (optional) Marketing site

#### Version Information
- **Version**: 1.0.0 (matches your `app.json`)
- **Copyright**: © 2024 Your Name/Company
- **Age Rating**: Complete questionnaire
  - For flashbits: Likely 4+ (no objectionable content)

### 6.2 App Privacy Details

Required for submission:

1. **Data Collection**: Declare what you collect
   - Firebase Authentication: User identifiers
   - Firebase Analytics: Usage data
   - Firebase Crashlytics: Crash reports (if used)

2. **Privacy Policy**: Must be accessible URL
   - Host on your website or Firebase Hosting
   - Example: `https://flashprep-11c85.web.app/privacy`

### 6.3 App Review Information

- **Contact Information**: Your contact details
- **Demo Account**: (if app requires login)
  - Provide test credentials for reviewers
- **Notes**: Any special instructions for reviewers

## Step 8: Submit Build to App Store

### 7.1 Wait for Build to Complete

1. Check build status: `eas build:list`
2. Wait for status: **"finished"**
3. Note the build number

### 7.2 Submit Using EAS

```bash
npm run submit:ios

# Or directly
eas submit --platform ios --latest
```

EAS will:
- Upload the build to App Store Connect
- Link it to your app
- Make it available for submission

### 7.3 Alternative: Manual Submission

1. In App Store Connect → Your App
2. Go to **"TestFlight"** tab (build appears here first)
3. Wait for processing (10-30 minutes)
4. Go to **"App Store"** tab
5. Select **"Build"** → Choose your build
6. Click **"Submit for Review"**

## Step 9: Complete App Store Submission

### 8.1 Final Checklist

Before submitting, ensure:

- ✅ Build uploaded and processed
- ✅ All screenshots uploaded
- ✅ Description complete
- ✅ Privacy policy URL set
- ✅ Age rating completed
- ✅ App review information filled
- ✅ Test account provided (if needed)
- ✅ Export compliance answered

### 8.2 Export Compliance

Apple will ask about encryption:
- **Does your app use encryption?**
  - Firebase uses HTTPS (standard encryption)
  - Answer: **"Yes"** → **"My app uses standard encryption"**
  - This is usually automatic for most apps

### 8.3 Submit for Review

1. In App Store Connect → Your App
2. Click **"Submit for Review"**
3. Review all information
4. Click **"Submit"**

## Step 10: App Review Process

### 9.1 Review Timeline

- **Initial Review**: 24-48 hours typically
- **Status Updates**: Check App Store Connect
- **Possible Outcomes**:
  - ✅ **Approved**: App goes live
  - ⚠️ **Rejected**: Fix issues and resubmit
  - 📝 **In Review**: Still being reviewed

### 9.2 Common Rejection Reasons

- Missing privacy policy
- Incomplete app information
- App crashes during review
- Missing test account (if login required)
- Violation of App Store guidelines

### 9.3 If Rejected

1. Read rejection reason carefully
2. Fix the issue
3. Resubmit with explanation
4. Usually faster review on resubmission

## Step 11: Post-Submission

### 10.1 App Goes Live

Once approved:
- App appears in App Store within 24 hours
- You'll receive email notification
- Share your App Store link!

### 10.2 App Store Link Format

```
https://apps.apple.com/app/id[YOUR_APP_ID]
```

### 10.3 Monitor Performance

- **App Store Connect**: Analytics, reviews, ratings
- **Sales and Trends**: Download statistics
- **Reviews**: Respond to user reviews

## Important Notes for Firebase Integration

### Firebase Configuration

Your Firebase config is already set in `eas.json`. Ensure:

1. **Firebase iOS App**: 
   - In Firebase Console, ensure iOS app is added
   - Bundle ID matches: `com.flashprep.app`
   - Download `GoogleService-Info.plist` (EAS handles this automatically)

2. **OAuth Redirect URLs**:
   - Update GitHub OAuth: Add your app's URL scheme
   - Update Google OAuth: Add bundle ID
   - Format: `flashbits://` (matches your `app.json` scheme)

3. **Environment Variables**:
   - Already configured in `eas.json`
   - All `EXPO_PUBLIC_*` variables are set

### App Store Connect App ID vs Bundle ID

- **Bundle ID**: `com.flashbits.app` (in your code)
- **App Store Connect App ID**: Numeric ID (1234567890)
- **Apple ID**: Your developer account email

## Troubleshooting

### Build Fails

1. **Check credentials**: `eas credentials`
2. **Verify Team ID**: Matches Apple Developer
3. **Check bundle ID**: Matches App Store Connect
4. **Review build logs**: `eas build:view [BUILD_ID]`

### Submission Fails

1. **Verify App Store Connect App ID**: Correct in `eas.json`
2. **Check Apple ID**: Matches developer account
3. **Ensure build processed**: Wait for "Ready to Submit" status

### App Rejected

1. **Read rejection reason**: Usually specific
2. **Common fixes**:
   - Add privacy policy
   - Fix crashes
   - Provide test account
   - Complete missing information

## Quick Reference Commands

```bash
# Configure credentials
eas credentials

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]
```

## Next Steps

1. ✅ Enroll in Apple Developer Program
2. ✅ Create app in App Store Connect
3. ✅ Configure EAS credentials
4. ✅ Build your app
5. ✅ Prepare App Store listing
6. ✅ Submit for review
7. ✅ Monitor review process
8. ✅ App goes live!

## Resources

- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Good luck with your App Store submission! 🚀

