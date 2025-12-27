/**
 * Script to set admin custom claim on a Firebase user
 * 
 * Usage:
 *   node scripts/setAdminClaim.js <user-email>
 * 
 * Requirements:
 *   - Firebase Admin SDK service account key in functions/ directory
 *   - User must exist in Firebase Auth
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Find service account key
const serviceAccountPath = path.join(__dirname, '../functions/flashprep-11c85-firebase-adminsdk-fbsvc-fe4af16e3b.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key not found at:', serviceAccountPath);
  console.error('   Please ensure the Firebase Admin SDK key is in the functions/ directory');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✅ Successfully set admin claim for user: ${email} (${user.uid})`);
    console.log('   The user will need to sign out and sign back in for the claim to take effect.');
    
    // Revoke refresh tokens to force re-authentication
    await admin.auth().revokeRefreshTokens(user.uid);
    console.log('   Refresh tokens revoked. User must sign in again.');
    
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`   User with email "${email}" not found in Firebase Auth.`);
    }
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide a user email');
  console.error('   Usage: node scripts/setAdminClaim.js <user-email>');
  process.exit(1);
}

setAdminClaim(email)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

