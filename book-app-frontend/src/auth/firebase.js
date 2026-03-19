import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseClientConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

let firebaseAuthInstance = null;

export const getFirebaseAuthInstance = async () => {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase client auth is not configured');
  }

  if (!firebaseAuthInstance) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    firebaseAuthInstance = auth;
  }

  return firebaseAuthInstance;
};

export const signUpWithFirebase = async ({ email, password, displayName }) => {
  const auth = await getFirebaseAuthInstance();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  const token = await credential.user.getIdToken(true);

  return {
    token,
    user: {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: displayName || credential.user.displayName || email.split('@')[0],
    },
  };
};

export const signInWithFirebase = async ({ email, password }) => {
  const auth = await getFirebaseAuthInstance();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken(true);

  return {
    token,
    user: {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || email.split('@')[0],
    },
  };
};

export const signOutFirebase = async () => {
  if (!isFirebaseClientConfigured()) {
    return;
  }

  const auth = await getFirebaseAuthInstance();
  await signOut(auth);
};
