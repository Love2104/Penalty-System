import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/prisma';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const GOOGLE_SERVICE_ACCOUNT_CONFIG_KEY = 'GOOGLE_SERVICE_ACCOUNT_JSON';

type GoogleCredentialSource = 'env-json' | 'env-file' | 'db-config';

const parseServiceAccountJson = (jsonValue: string) => {
  const parsed = JSON.parse(jsonValue);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('The JSON must include at least "client_email" and "private_key".');
  }
  return parsed;
};

const resolveCredentialPath = () => {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return credPath ? path.resolve(credPath) : null;
};

export const getGoogleIntegrationStatus = async () => {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const keys = parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      return {
        ready: true,
        source: 'env-json' as GoogleCredentialSource,
        clientEmail: keys.client_email as string,
        credentialPath: null,
        issue: null,
      };
    } catch (error: any) {
      return {
        ready: false,
        source: 'env-json' as GoogleCredentialSource,
        clientEmail: null,
        credentialPath: null,
        issue: `Invalid GOOGLE_SERVICE_ACCOUNT_JSON. ${error.message}`,
      };
    }
  }

  const resolvedPath = resolveCredentialPath();
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    try {
      const keys = parseServiceAccountJson(fs.readFileSync(resolvedPath, 'utf8'));
      return {
        ready: true,
        source: 'env-file' as GoogleCredentialSource,
        clientEmail: keys.client_email as string,
        credentialPath: resolvedPath,
        issue: null,
      };
    } catch (error: any) {
      return {
        ready: false,
        source: 'env-file' as GoogleCredentialSource,
        clientEmail: null,
        credentialPath: resolvedPath,
        issue: `Unable to read the credentials file. ${error.message}`,
      };
    }
  }

  const savedConfig = await prisma.config.findUnique({
    where: { key: GOOGLE_SERVICE_ACCOUNT_CONFIG_KEY }
  });

  if (savedConfig?.value) {
    try {
      const keys = parseServiceAccountJson(savedConfig.value);
      return {
        ready: true,
        source: 'db-config' as GoogleCredentialSource,
        clientEmail: keys.client_email as string,
        credentialPath: null,
        issue: null,
      };
    } catch (error: any) {
      return {
        ready: false,
        source: 'db-config' as GoogleCredentialSource,
        clientEmail: null,
        credentialPath: null,
        issue: `Saved Google credentials are invalid. ${error.message}`,
      };
    }
  }

  return {
    ready: false,
    source: resolvedPath ? ('env-file' as GoogleCredentialSource) : null,
    clientEmail: null,
    credentialPath: resolvedPath,
    issue: resolvedPath
      ? `Google credentials file not found at: ${resolvedPath}`
      : 'No Google service account credentials are configured yet.',
  };
};

const loadGoogleCredentials = async () => {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return {
      keys: parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      source: 'env-json' as GoogleCredentialSource,
    };
  }

  const resolvedPath = resolveCredentialPath();
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    return {
      keys: parseServiceAccountJson(fs.readFileSync(resolvedPath, 'utf8')),
      source: 'env-file' as GoogleCredentialSource,
    };
  }

  const savedConfig = await prisma.config.findUnique({
    where: { key: GOOGLE_SERVICE_ACCOUNT_CONFIG_KEY }
  });

  if (savedConfig?.value) {
    return {
      keys: parseServiceAccountJson(savedConfig.value),
      source: 'db-config' as GoogleCredentialSource,
    };
  }

  if (resolvedPath) {
    throw new Error(
      `Google credentials file not found at: ${resolvedPath}\n` +
      'Either place your service account JSON file there, or paste the JSON into the portal setup panel.'
    );
  }

  throw new Error(
    'No Google credentials configured. Set GOOGLE_SERVICE_ACCOUNT_JSON, configure GOOGLE_APPLICATION_CREDENTIALS, or paste the service account JSON into the portal setup panel.'
  );
};

export const saveGoogleServiceAccountJson = async (jsonValue: string) => {
  const parsed = parseServiceAccountJson(jsonValue);

  await prisma.config.upsert({
    where: { key: GOOGLE_SERVICE_ACCOUNT_CONFIG_KEY },
    update: { value: JSON.stringify(parsed) },
    create: { key: GOOGLE_SERVICE_ACCOUNT_CONFIG_KEY, value: JSON.stringify(parsed) }
  });

  return {
    clientEmail: parsed.client_email as string,
    source: 'db-config' as GoogleCredentialSource,
  };
};

export const getSheetsClient = async () => {
  const { keys } = await loadGoogleCredentials();
  const client = google.auth.fromJSON(keys) as any;
  client.scopes = SCOPES;
  return google.sheets({ version: 'v4', auth: client });
};

const writeSheetHeader = async (spreadsheetId: string, tabName: string) => {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabName}'!A1:J1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        ['Roll No', 'Name', 'Email', 'Program', 'Dept', 'Hall', 'Clause', 'Nature', 'Remarks', 'Timestamp']
      ]
    }
  });
};

export const createGoogleSheetTab = async (spreadsheetId: string, tabName: string) => {
  const sheets = await getSheetsClient();

  try {
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
              }
            }
          }
        ]
      }
    });

    await writeSheetHeader(spreadsheetId, tabName);
    return res.data;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`Tab "${tabName}" already exists; refreshing header row.`);
      await writeSheetHeader(spreadsheetId, tabName);
      return true;
    }
    throw error;
  }
};

export const listGoogleSheetTabs = async (spreadsheetId: string) => {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
    fields: 'sheets(properties(title,sheetType,hidden))'
  });

  return (res.data.sheets || [])
    .map((sheet) => sheet.properties)
    .filter((properties) => properties?.sheetType === 'GRID' && !properties.hidden)
    .map((properties) => properties?.title)
    .filter((title): title is string => Boolean(title));
};

export const appendGoogleSheetRow = async (spreadsheetId: string, tabName: string, rowData: any[]) => {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tabName}'!A:J`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowData]
    }
  });

  return res.data;
};
