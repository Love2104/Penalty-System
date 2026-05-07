import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const isFirebaseEmailLinkConfigured = requiredFirebaseConfig.every(Boolean);

const firebaseApp = isFirebaseEmailLinkConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export const ensureFirebaseAuthPersistence = async () => {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured yet.');
  }

  await setPersistence(firebaseAuth, browserLocalPersistence);
  return firebaseAuth;
};

export const signOutFromFirebaseClient = async () => {
  if (!firebaseAuth) {
    return;
  }

  await signOut(firebaseAuth);
};

export const getFirebaseEmailLinkUrl = () => {
  if (process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_URL) {
    return process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_URL;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:3000/finish-sign-in';
  }

  return `${window.location.origin}/finish-sign-in`;
};

export const firebaseEmailLinkDomain = process.env.NEXT_PUBLIC_FIREBASE_EMAIL_LINK_DOMAIN || undefined;
