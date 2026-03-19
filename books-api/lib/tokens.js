const crypto = require('crypto');

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'bookfinder-local-dev-secret';

const encodeJson = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decodeJson = (value) => JSON.parse(Buffer.from(value, 'base64url').toString());

const sign = (value) => crypto.createHmac('sha256', TOKEN_SECRET).update(value).digest('base64url');

const createSignedToken = (payload) => {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson(payload);
  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
};

const verifySignedToken = (token) => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  if (sign(`${header}.${body}`) !== signature) {
    return null;
  }

  try {
    return decodeJson(body);
  } catch {
    return null;
  }
};

const parseLegacyMockToken = (token) => {
  if (!token || !token.endsWith('.mock-signature')) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
};

const createLocalAuthToken = (user) => createSignedToken({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  kind: 'local',
  iat: Math.floor(Date.now() / 1000),
});

const createDemoToken = ({ uid, email, displayName }) => createSignedToken({
  uid,
  email,
  displayName,
  kind: 'demo',
  iat: Math.floor(Date.now() / 1000),
});

module.exports = {
  createDemoToken,
  createLocalAuthToken,
  parseLegacyMockToken,
  verifySignedToken,
};