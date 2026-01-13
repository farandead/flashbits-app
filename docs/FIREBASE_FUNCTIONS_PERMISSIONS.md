# Firebase Functions Permissions Fix

## Problem

The Cloud Function is getting `InsufficientPermissionError` when trying to manage Firebase Auth users. This happens because the Cloud Functions service account doesn't have the necessary IAM permissions.

## Solution

Grant the Cloud Functions service account the required IAM role.

### Step 1: Find Your Cloud Functions Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `flashprep-11c85`
3. Go to **IAM & Admin** → **IAM**
4. Find the service account that looks like:
   ```
   flashprep-11c85@appspot.gserviceaccount.com
   ```
   Or:
   ```
   PROJECT_NUMBER-compute@developer.gserviceaccount.com
   ```

### Step 2: Grant Required Role

1. Click **Edit** (pencil icon) next to the service account
2. Click **ADD ANOTHER ROLE**
3. Add this role:
   ```
   Firebase Admin SDK Administrator Service Agent
   ```
   Or the role ID:
   ```
   roles/firebase.adminsdk.admin
   ```
4. Click **SAVE**

### Alternative: Using gcloud CLI

```bash
# Set your project
gcloud config set project flashprep-11c85

# Find the service account email
gcloud iam service-accounts list

# Grant the role (replace SERVICE_ACCOUNT_EMAIL with actual email)
gcloud projects add-iam-policy-binding flashprep-11c85 \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/firebase.adminsdk.admin"
```

### Step 3: Verify

After granting the role, wait a few minutes for permissions to propagate, then test the function again.

## Required Permissions

The Cloud Functions service account needs these permissions to:
- Create Firebase Auth users
- Update Firebase Auth users
- Get user information by email/UID
- Create custom tokens

The `Firebase Admin SDK Administrator Service Agent` role provides all of these.

## Troubleshooting

### Still Getting Permission Errors?

1. **Wait a few minutes** - IAM changes can take 1-5 minutes to propagate
2. **Check the service account** - Make sure you granted the role to the correct service account
3. **Check the project** - Ensure you're working in the correct GCP project
4. **Redeploy the function** - Sometimes a redeploy helps:
   ```bash
   firebase deploy --only functions
   ```

### Alternative: Use Service Account Key (Not Recommended)

If you can't grant IAM roles, you can use a service account key file:

1. Go to **IAM & Admin** → **Service Accounts**
2. Create or select a service account
3. Create a key (JSON)
4. Update `functions/main.py`:
   ```python
   from firebase_admin import credentials
   
   # Load service account key
   cred = credentials.Certificate('path/to/service-account-key.json')
   initialize_app(cred)
   ```

**⚠️ Warning**: Service account keys should NOT be committed to git. Use IAM roles instead for production.

---

**Last Updated**: 2025-01-16

