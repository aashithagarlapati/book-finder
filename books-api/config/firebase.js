const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;
let initialized = false;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const getServiceAccount = () => {
  if (serviceAccountPath) {
    return require(path.resolve(serviceAccountPath));
  }

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  return null;
};

const hasAdminCredentials = Boolean(serviceAccountPath || serviceAccountJson);

// Initialize Firebase Admin SDK
try {
  serviceAccount = getServiceAccount();

  if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    initialized = true;
  } else if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    initialized = true;
  }
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('⚠️ Firebase initialization warning:', error.message);
  console.log('   (This is OK for local development without a service account file)');
}

admin.__hasAdminCredentials = hasAdminCredentials;
admin.__isInitialized = initialized;

module.exports = admin;
