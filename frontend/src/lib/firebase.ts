// Firebase is no longer used for authentication.
// Auth is handled entirely via backend Email OTP + Brevo SMTP.
// This file is kept as a stub so existing imports don't break.

export const isFirebaseEmailLinkConfigured = false;

export const firebaseAuth = null;

export const ensureFirebaseAuthPersistence = async () => {
  throw new Error('Firebase Auth is no longer used. Use Email OTP instead.');
};

export const signOutFromFirebaseClient = async () => {
  // No-op — Firebase is no longer used
};

export const getFirebaseEmailLinkUrl = () => '';

export const firebaseEmailLinkDomain = undefined;
