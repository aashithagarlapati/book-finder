const express = require('express');
const admin = require('../config/firebase');

const router = express.Router();

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY && process.env.FIREBASE_PROJECT_ID
);

const useMockAuth = process.env.NODE_ENV !== 'production' || !isFirebaseConfigured;

// Mock token generator for development (replace with real Firebase auth in production)
const generateMockToken = (uid, email) => {
  const payload = { uid, email, iat: Math.floor(Date.now() / 1000) };
  const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.mock-signature`;
};

// Signup endpoint
router.post('/signup', async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    if (useMockAuth) {
      const uid = `user-${Date.now()}`;
      const mockToken = generateMockToken(uid, email);
      return res.status(201).json({
        message: 'User created (mock auth)',
        user: {
          uid,
          email,
          displayName: displayName || email.split('@')[0],
        },
        token: mockToken,
      });
    }

    // Try to create user with Firebase
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
      });

      // Return token
      const token = await admin.auth().createCustomToken(userRecord.uid);
      return res.status(201).json({
        message: 'User created successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
        token,
      });
    } catch (firebaseError) {
      // If Firebase fails, use mock implementation for local/demo environments
      if (useMockAuth) {
        const uid = `user-${Date.now()}`;
        const mockToken = generateMockToken(uid, email);
        return res.status(201).json({
          message: 'User created (mock auth fallback)',
          user: {
            uid,
            email,
            displayName: displayName || email.split('@')[0],
          },
          token: mockToken,
        });
      }
      throw firebaseError;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(400).json({
      error: error.message || 'Failed to create user',
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Note: Firebase Admin SDK doesn't have a direct login method.
    // Use mock auth for local/demo environments.
    if (useMockAuth) {
      const uid = `user-${email}`;
      const mockToken = generateMockToken(uid, email);
      return res.status(200).json({
        message: 'Login successful (mock auth)',
        user: {
          uid,
          email,
          displayName: email.split('@')[0],
        },
        token: mockToken,
      });
    }

    // In production, frontend should handle login with Firebase SDK
    return res.status(400).json({
      error: 'Use Firebase SDK on frontend for secure login',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(400).json({ error: error.message || 'Login failed' });
  }
});

// Verify token endpoint (for frontend to verify stored tokens)
router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    if (useMockAuth) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return res.status(200).json({
          valid: true,
          user: {
            uid: payload.uid,
            email: payload.email,
          },
        });
      } catch (parseError) {
        return res.status(401).json({ valid: false, error: 'Invalid token' });
      }
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return res.status(200).json({
        valid: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      });
    } catch (firebaseError) {
      // For local/demo mode, verify mock token structure
      if (useMockAuth) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return res.status(200).json({
            valid: true,
            user: {
              uid: payload.uid,
              email: payload.email,
            },
          });
        } catch (parseError) {
          return res.status(401).json({ valid: false, error: 'Invalid token' });
        }
      }
      throw firebaseError;
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(401).json({ valid: false, error: 'Token verification failed' });
  }
});

module.exports = router;
