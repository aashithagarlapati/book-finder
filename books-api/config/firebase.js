const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountPath) {
    serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    // Fallback for development without service account
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('⚠️ Firebase initialization warning:', error.message);
  console.log('   (This is OK for local development without a service account file)');
}

module.exports = admin;
