# Admin Authentication Setup

This document explains how to set up and use admin authentication for the FlashPrep admin panel.

## Overview

The admin panel now requires authentication with admin privileges. Only users with the `admin` custom claim can access the panel and modify questions/topics in Firestore.

## Security Changes

### Firestore Rules

The Firestore security rules have been updated to restrict write access:

```javascript
// Questions - only admins can write
match /questions/{questionId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}

// Topics - only admins can write
match /topics/{topicId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}
```

## Setting Up Admin Users

### Step 1: Create a User Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Users**
3. Click **Add user**
4. Enter an email and password
5. Click **Add user**

### Step 2: Set Admin Custom Claim

Use the provided script to set the admin custom claim:

```bash
node scripts/setAdminClaim.js <user-email>
```

**Example:**
```bash
node scripts/setAdminClaim.js admin@flashbits.co
```

**Requirements:**
- Firebase Admin SDK service account key must be in `functions/flashprep-11c85-firebase-adminsdk-fbsvc-fe4af16e3b.json`
- The user must exist in Firebase Authentication

**What the script does:**
1. Finds the user by email
2. Sets the `admin: true` custom claim
3. Revokes refresh tokens (forces user to sign in again)

### Step 3: Sign In to Admin Panel

1. Open the admin panel
2. Enter the admin email and password
3. Click **Sign In**

The panel will verify that the user has admin privileges before allowing access.

## Admin Panel Features

### Authentication Flow

1. **Initial Load**: Checks if user is already authenticated
2. **Login Screen**: Shows if user is not authenticated or doesn't have admin privileges
3. **Admin Check**: Verifies `admin` custom claim on every authentication state change
4. **Auto Logout**: Logs out users who don't have admin privileges

### Header

The header now displays:
- User email
- Logout button

## Troubleshooting

### "This account does not have admin privileges"

**Cause:** The user doesn't have the `admin` custom claim set.

**Solution:**
1. Run the `setAdminClaim.js` script for the user's email
2. Have the user sign out and sign back in

### "Failed to login"

**Possible causes:**
- Incorrect email or password
- User doesn't exist in Firebase Auth
- Network issues

**Solution:**
- Verify credentials in Firebase Console
- Check network connection
- Ensure Firebase Auth is properly configured

### Custom Claims Not Working

**Cause:** Custom claims are cached in the ID token. Users need to sign out and sign back in.

**Solution:**
1. The script automatically revokes refresh tokens
2. User must sign out completely
3. Sign back in to get a fresh token with the new claims

## Security Best Practices

1. **Limit Admin Users**: Only grant admin access to trusted users
2. **Use Strong Passwords**: Enforce strong password policies
3. **Monitor Access**: Regularly review admin user list in Firebase Console
4. **Rotate Credentials**: Change passwords periodically
5. **Remove Access**: Immediately remove admin claims when users no longer need access

## Removing Admin Access

To remove admin access from a user:

```javascript
// Using Firebase Admin SDK
await admin.auth().setCustomUserClaims(user.uid, { admin: false });
// Or remove the claim entirely
await admin.auth().setCustomUserClaims(user.uid, {});
```

## Alternative: Cloud Function

You can also create a Cloud Function to set admin claims:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdmin = functions.https.onCall(async (data, context) => {
  // Verify the caller is an admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin');
  }
  
  const { uid, admin: isAdmin } = data;
  await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
  return { success: true };
});
```

## Testing

1. **Create a test admin user** in Firebase Console
2. **Set admin claim** using the script
3. **Sign in** to the admin panel
4. **Verify** you can add/edit/delete questions
5. **Test logout** and sign in again
6. **Test non-admin user** - should be denied access

## Files Modified

- `firestore.rules` - Updated security rules
- `admin/src/firebase.js` - Added auth functions
- `admin/src/components/Login.jsx` - New login component
- `admin/src/components/Header.jsx` - Added logout button
- `admin/src/App.jsx` - Added authentication check
- `admin/src/styles/index.css` - Added login styles
- `scripts/setAdminClaim.js` - Script to set admin claims

