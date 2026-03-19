const admin = require('../config/firebase');
const { parseLegacyMockToken, verifySignedToken } = require('../lib/tokens');

const isFirebaseConfigured = Boolean(
  admin.__hasAdminCredentials && process.env.FIREBASE_PROJECT_ID
);

const useMockAuth = process.env.NODE_ENV !== 'production' || !isFirebaseConfigured;
const allowDemoAuth = process.env.ALLOW_DEMO_AUTH !== 'false';

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const signedPayload = verifySignedToken(token);

    if (signedPayload && (signedPayload.kind === 'local' || (signedPayload.kind === 'demo' && allowDemoAuth))) {
      req.user = {
        uid: signedPayload.uid || 'dev-user',
        email: signedPayload.email || 'dev@example.com',
        displayName: signedPayload.displayName || signedPayload.email || 'Reader',
      };
      return next();
    }

    if (allowDemoAuth) {
      const legacyPayload = parseLegacyMockToken(token);

      if (legacyPayload) {
        req.user = {
          uid: legacyPayload.uid || 'dev-user',
          email: legacyPayload.email || 'dev@example.com',
          displayName: legacyPayload.displayName || legacyPayload.email || 'Reader',
        };
        return next();
      }
    }

    if (useMockAuth) {
      const legacyPayload = parseLegacyMockToken(token);

      if (legacyPayload) {
        req.user = {
          uid: legacyPayload.uid || 'dev-user',
          email: legacyPayload.email || 'dev@example.com',
          displayName: legacyPayload.displayName || legacyPayload.email || 'Reader',
        };
        return next();
      }

      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Verify the Firebase ID token
    // Note: This requires Firebase Admin SDK to be properly initialized
    // For development without service account, you may need to mock this
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
      next();
    } catch (authError) {
      throw authError;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed', details: error.message });
  }
};

module.exports = authenticate;
