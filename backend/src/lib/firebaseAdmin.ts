// Firebase Admin SDK is no longer used.
// Authentication is handled entirely via backend Email OTP + Brevo SMTP.
// This file is kept as a stub so existing imports don't break during cleanup.

export const getFirebaseAdminStatus = () => ({
  ready: false,
  source: null as null,
  missing: ['Firebase removed — using Brevo SMTP OTP instead'],
});

export const getFirebaseAdminAuth = (): never => {
  throw new Error('Firebase Admin is no longer used. Authentication is handled via Email OTP.');
};
