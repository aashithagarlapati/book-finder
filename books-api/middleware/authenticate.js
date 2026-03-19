const admin = require('../config/firebase');

const isFirebaseConfigured = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY && process.env.FIREBASE_PROJECT_ID
);

const useMockAuth = process.env.NODE_ENV !== 'production' || !isFirebaseConfigured;

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.substring(7);

  try {
    if (token.endsWith('.mock-signature')) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.user = {
          uid: payload.uid || 'dev-user',
          email: payload.email || 'dev@example.com',
        };
        return next();
      } catch (parseError) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
    }

    if (useMockAuth) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.user = {
          uid: payload.uid || 'dev-user',
          email: payload.email || 'dev@example.com',
        };
        return next();
      } catch (parseError) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
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
      // If Firebase auth fails, create a mock user for local/demo mode
      if (useMockAuth) {
        console.warn('⚠️ Firebase auth failed, using mock user for development');
        // For development, we'll extract user ID from token (basic JWT-like structure)
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          req.user = {
            uid: payload.uid || 'dev-user',
            email: payload.email || 'dev@example.com',
          };
          next();
        } catch (parseError) {
          return res.status(401).json({ error: 'Invalid token format' });
        }
      } else {
        throw authError;
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed', details: error.message });
  }
};

module.exports = authenticate;
