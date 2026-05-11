import admin from 'firebase-admin';
import path from 'path';

type FirebaseAdminSource =
  | 'service-account-json'
  | 'service-account-file'
  | 'service-account-env'
  | 'application-default';

const parseInlineServiceAccount = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    return null;
  }

  try {
    return JSON.parse(serviceAccountJson) as admin.ServiceAccount;
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${(error as Error).message}`);
  }
};

const getServiceAccountFromFile = () => {
  const serviceAccountPath =
    process.env.FIREBASE_AUTH_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    return null;
  }

  const resolvedServiceAccountPath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(process.cwd(), serviceAccountPath);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(resolvedServiceAccountPath) as admin.ServiceAccount;
};

const getServiceAccountFromEnv = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  } satisfies admin.ServiceAccount;
};

const getFirebaseAdminConfig = (): {
  credential?: admin.credential.Credential;
  projectId?: string;
  source: FirebaseAdminSource;
} => {
  const inlineServiceAccount = parseInlineServiceAccount();
  if (inlineServiceAccount) {
    return {
      credential: admin.credential.cert(inlineServiceAccount),
      projectId: inlineServiceAccount.projectId || process.env.FIREBASE_PROJECT_ID,
      source: 'service-account-json',
    };
  }

  const fileServiceAccount = getServiceAccountFromFile();
  if (fileServiceAccount) {
    return {
      credential: admin.credential.cert(fileServiceAccount),
      projectId: fileServiceAccount.projectId || process.env.FIREBASE_PROJECT_ID,
      source: 'service-account-file',
    };
  }

  const envServiceAccount = getServiceAccountFromEnv();
  if (envServiceAccount) {
    return {
      credential: admin.credential.cert(envServiceAccount),
      projectId: envServiceAccount.projectId,
      source: 'service-account-env',
    };
  }

  return {
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    source: 'application-default',
  };
};

const firebaseAdminConfig = getFirebaseAdminConfig();

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: firebaseAdminConfig.credential,
    projectId: firebaseAdminConfig.projectId,
  });
};

const firebaseApp = initializeFirebaseAdmin();

export const getFirebaseAdminAuth = () => admin.auth(firebaseApp);

export const getFirebaseAdminStatus = () => ({
  ready: admin.apps.length > 0,
  source: firebaseAdminConfig.source,
  missing: [] as string[],
});
