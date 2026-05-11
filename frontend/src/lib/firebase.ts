import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = [
  ['NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
] as const;

const missingFirebaseConfig = requiredFirebaseConfig
  .filter(([, value]) => !value)
  .map(([key]) => key);

const app = missingFirebaseConfig.length === 0
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

const auth = app ? getAuth(app) : null;

const appVerificationDisabledForTesting =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_VERIFICATION_DISABLED === 'true';

if (auth && appVerificationDisabledForTesting) {
  auth.settings.appVerificationDisabledForTesting = true;
}

export const getFirebaseSetupError = () =>
  missingFirebaseConfig.length === 0
    ? null
    : `Missing Firebase web config: ${missingFirebaseConfig.join(', ')}`;

export const getPhoneAuthTestingConfig = () => ({
  appVerificationDisabledForTesting,
  demoOtpCode: process.env.NODE_ENV !== 'production'
    ? process.env.NEXT_PUBLIC_FIREBASE_TEST_OTP || ''
    : '',
  demoPhoneNumber: process.env.NODE_ENV !== 'production'
    ? process.env.NEXT_PUBLIC_FIREBASE_TEST_PHONE_NUMBER || ''
    : '',
});

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult };
