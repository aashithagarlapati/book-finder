const express = require('express');
const crypto = require('crypto');
const admin = require('../config/firebase');
const { readStore, updateStore } = require('../lib/store');
const {
  createDemoToken,
  createLocalAuthToken,
  parseLegacyMockToken,
  verifySignedToken,
} = require('../lib/tokens');

const router = express.Router();

const isFirebaseConfigured = Boolean(
  admin.__hasAdminCredentials && process.env.FIREBASE_PROJECT_ID
);

const useMockAuth = process.env.NODE_ENV !== 'production' || !isFirebaseConfigured;
const allowDemoAuth = process.env.ALLOW_DEMO_AUTH !== 'false';

const shouldUseDemoMode = (mode) => allowDemoAuth && mode === 'demo';
const shouldUseLocalMode = (mode) => mode === 'local' || mode === 'account' || (!mode && !isFirebaseConfigured);

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, passwordHash) => {
  const [salt, expectedHash] = (passwordHash || '').split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

const sanitizeUser = (user) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
});

const ADMIN_PANEL_KEY = process.env.ADMIN_PANEL_KEY || 'bookfinder-admin-dev';

const isAdminRequest = (req) => {
  const incomingKey = req.headers['x-admin-key'];
  return typeof incomingKey === 'string' && incomingKey.length > 0 && incomingKey === ADMIN_PANEL_KEY;
};

const findUserByEmail = (email) => {
  const store = readStore();
  return store.users.find((user) => user.email === normalizeEmail(email)) || null;
};

// Signup endpoint
router.post('/signup', async (req, res) => {
  const { email, password, displayName, mode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    if (shouldUseDemoMode(mode)) {
      const uid = `user-${Date.now()}`;
      const demoToken = createDemoToken({
        uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
      });

      return res.status(201).json({
        message: 'User created (demo auth)',
        user: {
          uid,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
        },
        token: demoToken,
        mode: 'demo',
      });
    }

    if (shouldUseLocalMode(mode) || useMockAuth) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const existingUser = findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const user = updateStore((store) => {
        const newUser = {
          uid: `user-${Date.now()}`,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail.split('@')[0],
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        store.users.push(newUser);
        return newUser;
      });

      return res.status(201).json({
        message: 'User created successfully',
        user: sanitizeUser(user),
        token: createLocalAuthToken(user),
        mode: 'local',
      });
    }

    return res.status(400).json({
      error: 'Use Firebase client authentication for live sign up, or switch to demo mode.',
      code: 'FIREBASE_CLIENT_REQUIRED',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(400).json({
      error: error.message || 'Failed to create user',
    });
  }
});

router.post('/session', async (req, res) => {
  const { token, mode } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const signedPayload = verifySignedToken(token);

    if (signedPayload && (signedPayload.kind === 'local' || (signedPayload.kind === 'demo' && allowDemoAuth))) {
      return res.status(200).json({
        valid: true,
        mode: signedPayload.kind,
        user: {
          uid: signedPayload.uid,
          email: signedPayload.email,
          displayName: signedPayload.displayName || signedPayload.email?.split('@')[0],
        },
      });
    }

    if (allowDemoAuth) {
      const payload = parseLegacyMockToken(token);

      if (payload) {
        return res.status(200).json({
          valid: true,
          mode: 'demo',
          user: {
            uid: payload.uid,
            email: payload.email,
            displayName: payload.displayName || payload.email?.split('@')[0],
          },
        });
      }
    }

    if (mode === 'demo' && allowDemoAuth) {
      return res.status(401).json({ valid: false, error: 'Invalid demo token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    return res.status(200).json({
      valid: true,
      mode: 'firebase',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email?.split('@')[0],
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(401).json({ valid: false, error: 'Token verification failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password, mode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    if (shouldUseDemoMode(mode)) {
      const uid = `user-${normalizedEmail}`;
      const demoToken = createDemoToken({
        uid,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
      });

      return res.status(200).json({
        message: 'Login successful (demo auth)',
        mode: 'demo',
        user: {
          uid,
          email: normalizedEmail,
          displayName: normalizedEmail.split('@')[0],
        },
        token: demoToken,
      });
    }

    if (shouldUseLocalMode(mode) || useMockAuth) {
      const user = findUserByEmail(normalizedEmail);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.status(200).json({
        message: 'Login successful',
        mode: 'local',
        user: sanitizeUser(user),
        token: createLocalAuthToken(user),
      });
    }

    return res.status(400).json({
      error: 'Use Firebase client authentication for live sign in, or switch to demo mode.',
      code: 'FIREBASE_CLIENT_REQUIRED',
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
    const signedPayload = verifySignedToken(token);

    if (signedPayload && (signedPayload.kind === 'local' || (signedPayload.kind === 'demo' && allowDemoAuth))) {
      return res.status(200).json({
        valid: true,
        mode: signedPayload.kind,
        user: {
          uid: signedPayload.uid,
          email: signedPayload.email,
          displayName: signedPayload.displayName || signedPayload.email?.split('@')[0],
        },
      });
    }

    if (allowDemoAuth) {
      const payload = parseLegacyMockToken(token);

      if (payload) {
        return res.status(200).json({
          valid: true,
          mode: 'demo',
          user: {
            uid: payload.uid,
            email: payload.email,
            displayName: payload.displayName || payload.email?.split('@')[0],
          },
        });
      }
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return res.status(200).json({
        valid: true,
        mode: 'firebase',
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      });
    } catch (firebaseError) {
      throw firebaseError;
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(401).json({ valid: false, error: 'Token verification failed' });
  }
});

// Admin: List signed up accounts
router.get('/admin/accounts', (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access denied' });
  }

  const store = readStore();
  const users = (store.users || []).map((user) => ({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt || null,
  }));

  return res.json({
    count: users.length,
    users,
  });
});

// Admin: Delete account and associated app data
router.delete('/admin/accounts/:uid', (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access denied' });
  }

  const { uid } = req.params;
  if (!uid) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const deleted = updateStore((store) => {
    const index = (store.users || []).findIndex((user) => user.uid === uid);
    if (index === -1) {
      return null;
    }

    const [user] = store.users.splice(index, 1);
    if (store.readingLists && store.readingLists[uid]) {
      delete store.readingLists[uid];
    }
    if (store.recommendations && store.recommendations[uid]) {
      delete store.recommendations[uid];
    }
    if (store.publicLists) {
      Object.keys(store.publicLists).forEach((listId) => {
        if (store.publicLists[listId]?.userId === uid) {
          delete store.publicLists[listId];
        }
      });
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  });

  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    message: 'Account deleted successfully',
    user: deleted,
  });
});

module.exports = router;
