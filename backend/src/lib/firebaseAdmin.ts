import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

type FirebaseAdminSource = 'service-account-json' | 'env-fields' | null;

const parseServiceAccountJson = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!rawJson) {
    return null;
  }

  const parsed = JSON.parse(rawJson);
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
};

const loadServiceAccount = () => {
  const jsonConfig = parseServiceAccountJson();
  if (jsonConfig) {
    return {
      source: 'service-account-json' as FirebaseAdminSource,
      serviceAccount: jsonConfig,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (projectId && clientEmail && privateKey) {
    return {
      source: 'env-fields' as FirebaseAdminSource,
      serviceAccount: {
        projectId,
        clientEmail,
        privateKey,
      },
    };
  }

  return null;
};

export const getFirebaseAdminStatus = () => {
  const config = loadServiceAccount();

  if (!config) {
    return {
      ready: false,
      source: null as FirebaseAdminSource,
      missing: ['FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY'],
    };
  }

  return {
    ready: true,
    source: config.source,
    missing: [] as string[],
  };
};

export const getFirebaseAdminAuth = () => {
  const config = loadServiceAccount();
  if (!config) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(config.serviceAccount),
    });
  }

  return getAuth();
};
