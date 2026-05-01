import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getPenaltyCountsByRolls, getStudentRoleInsights } from '../services/roleIntelligence';
import {
  createGoogleSheetTab,
  getGoogleIntegrationStatus as loadGoogleIntegrationStatus,
  getSheetsClient,
  listGoogleSheetTabs,
  saveGoogleServiceAccountJson,
} from '../services/googleSheets';
import { sendMail } from '../services/mailer';

const LEGACY_GOOGLE_CONFIG_KEY = 'GOOGLE_PORTAL_CONFIG';
const VALID_NATURES = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'];

const extractSpreadsheetId = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || trimmed;
};

const spreadsheetUrl = (googleSpreadsheetId: string | null | undefined) => {
  if (!googleSpreadsheetId) return null;
  return `https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}`;
};

const parseLegacySpreadsheetId = async () => {
  const config = await prisma.config.findUnique({ where: { key: LEGACY_GOOGLE_CONFIG_KEY } });
  if (!config) return null;

  try {
    const parsed = JSON.parse(config.value);
    return parsed.spreadsheetId ? extractSpreadsheetId(parsed.spreadsheetId) : null;
  } catch {
    return null;
  }
};

const formatGoogleError = (error: any) => {
  const message =
    error?.response?.data?.error?.message ||
    error?.errors?.[0]?.message ||
    error?.message ||
    'Google Sheets request failed.';

  if (typeof message !== 'string') {
    return 'Google Sheets request failed.';
  }

  return message;
};

const ensureLegacySpreadsheetAssignments = async (userId: string) => {
  const orphanCount = await prisma.sheet.count({ where: { spreadsheet_id: null } });
  if (!orphanCount) return;

  const legacySpreadsheetId = await parseLegacySpreadsheetId();

  let spreadsheet =
    legacySpreadsheetId
      ? await prisma.spreadsheet.findFirst({
          where: { google_spreadsheet_id: legacySpreadsheetId }
        })
      : null;

  if (!spreadsheet) {
    spreadsheet = await prisma.spreadsheet.create({
      data: {
        name: legacySpreadsheetId ? 'Imported Legacy Spreadsheet' : 'Imported Local Spreadsheet',
        google_spreadsheet_id: legacySpreadsheetId,
        created_by: userId,
      }
    });
  }

  await prisma.sheet.updateMany({
    where: { spreadsheet_id: null },
    data: { spreadsheet_id: spreadsheet.id }
  });
};

const importTabNamesToSpreadsheet = async (
  spreadsheetRecord: { id: string; created_by: string },
  tabNames: string[]
) => {
  if (tabNames.length === 0) return [];

  const existingTabs = await prisma.sheet.findMany({
    where: { spreadsheet_id: spreadsheetRecord.id },
    select: { google_tab_name: true, name: true }
  });

  const existingNames = new Set(
    existingTabs.flatMap((tab) => [tab.google_tab_name, tab.name]).filter(Boolean).map((name) => name!.toLowerCase())
  );

  const createdTabs = [];

  for (const tabName of tabNames) {
    if (existingNames.has(tabName.toLowerCase())) {
      continue;
    }

    const tab = await prisma.sheet.create({
      data: {
        spreadsheet_id: spreadsheetRecord.id,
        name: tabName,
        google_tab_name: tabName,
        status: 'DRAFT',
        created_by: spreadsheetRecord.created_by,
      }
    });

    createdTabs.push(tab);
    existingNames.add(tabName.toLowerCase());
  }

  return createdTabs;
};

const buildCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

const getStudentsByRoll = async (rollNumbers: string[]) => {
  const uniqueRolls = [...new Set(rollNumbers.filter(Boolean))];
  if (uniqueRolls.length === 0) return new Map<string, any>();

  const students = await prisma.student.findMany({
    where: { roll: { in: uniqueRolls } }
  });

  return new Map(students.map((student) => [student.roll, student]));
};

const mapSpreadsheetSummary = (spreadsheet: any) => {
  const recordCount = spreadsheet.tabs.reduce((total: number, tab: any) => total + (tab._count?.rows || 0), 0);

  return {
    id: spreadsheet.id,
    name: spreadsheet.name,
    google_spreadsheet_id: spreadsheet.google_spreadsheet_id,
    google_spreadsheet_url: spreadsheetUrl(spreadsheet.google_spreadsheet_id),
    created_at: spreadsheet.created_at,
    updated_at: spreadsheet.updated_at,
    creator: spreadsheet.creator,
    tabCount: spreadsheet.tabs.length,
    recordCount,
  };
};

const canManagePenaltyRows = (role: string | undefined) => ADMIN_ROLES.includes(role || '');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPenaltyEmail = (tabName: string, rows: any[]) => {
  const listItems = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px;border:1px solid #d4d4d8;">${escapeHtml(row.clause || '-')}</td>
          <td style="padding:8px;border:1px solid #d4d4d8;">${escapeHtml(row.nature || '-')}</td>
          <td style="padding:8px;border:1px solid #d4d4d8;">${escapeHtml(row.remarks || '-')}</td>
        </tr>
      `
    )
    .join('');

  const firstRow = rows[0];
  const studentName = escapeHtml(firstRow?.name || 'Student');
  const rollNo = escapeHtml(firstRow?.roll_no || '-');
  const safeTabName = escapeHtml(tabName);

  return {
    subject: `Penalty Notice - ${tabName}`,
    text: [
      `Dear ${firstRow?.name || 'Student'},`,
      '',
      `This is to inform you that penalty record(s) have been issued under tab "${tabName}".`,
      `Roll Number: ${firstRow?.roll_no || '-'}`,
      '',
      ...rows.map((row, index) => `${index + 1}. Clause: ${row.clause || '-'} | Level: ${row.nature || '-'} | Remarks: ${row.remarks || '-'}`),
      '',
      'If you believe this was sent in error, please contact the Election Commission.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">Penalty Notice</h2>
        <p>Dear ${studentName},</p>
        <p>This is to inform you that penalty record(s) have been issued under <strong>${safeTabName}</strong>.</p>
        <p><strong>Roll Number:</strong> ${rollNo}</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <thead>
            <tr style="background:#f4f4f5;">
              <th style="padding:8px;border:1px solid #d4d4d8;text-align:left;">Clause</th>
              <th style="padding:8px;border:1px solid #d4d4d8;text-align:left;">Level</th>
              <th style="padding:8px;border:1px solid #d4d4d8;text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>${listItems}</tbody>
        </table>
        <p>If you believe this was sent in error, please contact the Election Commission.</p>
      </div>
    `,
  };
};

const sendPenaltyDispatchEmails = async (sheet: { name: string; rows: any[] }) => {
  const groupedRows = new Map<string, any[]>();

  for (const row of sheet.rows) {
    const email = row.email?.trim();
    if (!email) {
      throw new Error(`Missing student email for roll number ${row.roll_no || 'unknown'}.`);
    }

    if (!groupedRows.has(email)) {
      groupedRows.set(email, []);
    }
    groupedRows.get(email)!.push(row);
  }

  const sentTo: string[] = [];

  for (const [email, rows] of groupedRows.entries()) {
    const emailContent = buildPenaltyEmail(sheet.name, rows);
    await sendMail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    sentTo.push(email);
  }

  return {
    recipientCount: sentTo.length,
    sentTo,
  };
};

const getRecipientRowsForStudent = async (sheetId: string, rowId: string) => {
  const row = await prisma.penaltyRow.findUnique({
    where: { id: rowId }
  });

  if (!row || row.sheet_id !== sheetId) {
    throw new Error('Penalty row not found in this tab.');
  }

  const recipientRows = await prisma.penaltyRow.findMany({
    where: {
      sheet_id: sheetId,
      OR: row.roll_no
        ? [{ roll_no: row.roll_no }]
        : [{ email: row.email }]
    },
    orderBy: { name: 'asc' }
  });

  if (recipientRows.length === 0) {
    throw new Error('No penalty rows found for this student.');
  }

  return {
    targetRow: row,
    recipientRows,
  };
};

const resendPenaltyEmailForStudent = async (sheet: { name: string }, rows: any[]) => {
  const primaryRow = rows[0];
  const recipientEmail = primaryRow.email?.trim();
  if (!recipientEmail) {
    throw new Error(`Missing student email for roll number ${primaryRow.roll_no || 'unknown'}.`);
  }

  const emailContent = buildPenaltyEmail(sheet.name, rows);
  await sendMail({
    to: recipientEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  return {
    email: recipientEmail,
    rowCount: rows.length,
    rollNo: primaryRow.roll_no || null,
  };
};

const loadClauseCatalog = () => {
  const clauseCatalogPath = path.join(process.cwd(), 'prisma', 'data', 'coc-ge-2026-clauses.json');
  if (!fs.existsSync(clauseCatalogPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(clauseCatalogPath, 'utf-8'));
};

const enrichPenaltyRowsWithStudentInsights = async (rows: any[]) => {
  if (rows.length === 0) return rows;

  const rolls = rows.map((row) => row.roll_no).filter(Boolean);
  const [{ roleMap, conflictMap }, penaltyCountMap] = await Promise.all([
    getStudentRoleInsights(rolls),
    getPenaltyCountsByRolls(rolls),
  ]);

  return rows.map((row) => ({
    ...row,
    student_roles: roleMap.get(row.roll_no) || [],
    student_has_conflict: conflictMap.get(row.roll_no) || false,
    student_penalty_count: penaltyCountMap.get(row.roll_no) || 0,
  }));
};

export const createSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const { name, spreadsheetId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Spreadsheet name is required' });
    }
    if (!spreadsheetId?.trim()) {
      return res.status(400).json({ error: 'Google Spreadsheet ID or URL is required' });
    }

    const googleSpreadsheetId = extractSpreadsheetId(spreadsheetId);
    const existing = await prisma.spreadsheet.findFirst({
      where: { google_spreadsheet_id: googleSpreadsheetId }
    });
    if (existing) {
      return res.status(409).json({ error: 'This Google Spreadsheet is already linked.' });
    }

    let discoveredTabs: string[] = [];
    try {
      discoveredTabs = await listGoogleSheetTabs(googleSpreadsheetId);
    } catch (error: any) {
      return res.status(400).json({
        error: `Unable to access that Google Spreadsheet. ${formatGoogleError(error)}`
      });
    }

    const spreadsheet = await prisma.spreadsheet.create({
      data: {
        name: name.trim(),
        google_spreadsheet_id: googleSpreadsheetId,
        created_by: req.user!.id,
      }
    });

    const importedTabs = await importTabNamesToSpreadsheet(spreadsheet, discoveredTabs);

    res.json({
      spreadsheet: {
        ...spreadsheet,
        google_spreadsheet_url: spreadsheetUrl(spreadsheet.google_spreadsheet_id),
      },
      importedTabsCount: importedTabs.length,
      discoveredTabs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to link spreadsheet' });
  }
};

export const getSpreadsheets = async (req: AuthRequest, res: Response) => {
  try {
    await ensureLegacySpreadsheetAssignments(req.user!.id);

    const spreadsheets = await prisma.spreadsheet.findMany({
      include: {
        creator: { select: { email: true } },
        tabs: {
          select: {
            _count: { select: { rows: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(spreadsheets.map(mapSpreadsheetSummary));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch spreadsheets' });
  }
};

export const getGoogleIntegrationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const status = await loadGoogleIntegrationStatus();
    res.json(status);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to load Google integration status' });
  }
};

export const updateGoogleIntegrationCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const { serviceAccountJson } = req.body;
    if (!serviceAccountJson?.trim()) {
      return res.status(400).json({ error: 'Service account JSON is required.' });
    }

    const saved = await saveGoogleServiceAccountJson(serviceAccountJson.trim());
    res.json({
      success: true,
      message: 'Google service account saved successfully.',
      ...saved,
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to save Google service account JSON.' });
  }
};

export const getSpreadsheetDetails = async (req: AuthRequest, res: Response) => {
  try {
    await ensureLegacySpreadsheetAssignments(req.user!.id);

    const id = req.params.id as string;
    const spreadsheet = await prisma.spreadsheet.findUnique({
      where: { id },
      include: {
        creator: { select: { email: true } },
        tabs: {
          include: {
            creator: { select: { email: true } },
            reviewer: { select: { email: true } },
            _count: { select: { rows: true } }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    res.json({
      ...spreadsheet,
      google_spreadsheet_url: spreadsheetUrl(spreadsheet.google_spreadsheet_id),
      tabCount: spreadsheet.tabs.length,
      recordCount: spreadsheet.tabs.reduce((total, tab) => total + tab._count.rows, 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch spreadsheet details' });
  }
};

export const deleteSpreadsheet = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const spreadsheet = await prisma.spreadsheet.findUnique({ where: { id } });
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    await prisma.spreadsheet.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete spreadsheet' });
  }
};

export const discoverSpreadsheetTabs = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const spreadsheet = await prisma.spreadsheet.findUnique({ where: { id } });
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }
    if (!spreadsheet.google_spreadsheet_id) {
      return res.status(400).json({ error: 'This spreadsheet is not linked to Google Sheets.' });
    }

    const discoveredTabs = await listGoogleSheetTabs(spreadsheet.google_spreadsheet_id);
    const importedTabs = await importTabNamesToSpreadsheet(spreadsheet, discoveredTabs);

    res.json({
      importedTabsCount: importedTabs.length,
      discoveredTabs,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: `Failed to detect tabs. ${formatGoogleError(error)}`
    });
  }
};

export const createSheet = async (req: AuthRequest, res: Response) => {
  try {
    const spreadsheetId = req.params.spreadsheetId as string;
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Tab name is required' });
    }

    const spreadsheet = await prisma.spreadsheet.findUnique({
      where: { id: spreadsheetId }
    });
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }
    if (!spreadsheet.google_spreadsheet_id) {
      return res.status(400).json({ error: 'This spreadsheet is not linked to Google Sheets.' });
    }

    const tabName = name.trim();
    const duplicate = await prisma.sheet.findFirst({
      where: {
        spreadsheet_id: spreadsheetId,
        OR: [{ name: tabName }, { google_tab_name: tabName }]
      }
    });
    if (duplicate) {
      return res.status(409).json({ error: 'A tab with this name already exists in this spreadsheet.' });
    }

    try {
      await createGoogleSheetTab(spreadsheet.google_spreadsheet_id, tabName);
    } catch (error: any) {
      return res.status(400).json({
        error: `Unable to create the Google tab. ${formatGoogleError(error)}`
      });
    }

    const sheet = await prisma.sheet.create({
      data: {
        spreadsheet_id: spreadsheetId,
        name: tabName,
        created_by: req.user!.id,
        status: 'DRAFT',
        google_tab_name: tabName,
      }
    });

    res.json(sheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create tab' });
  }
};

export const getSheets = async (req: AuthRequest, res: Response) => {
  try {
    await ensureLegacySpreadsheetAssignments(req.user!.id);

    const spreadsheetId = req.query.spreadsheetId as string | undefined;
    const sheets = await prisma.sheet.findMany({
      where: spreadsheetId ? { spreadsheet_id: spreadsheetId } : undefined,
      include: {
        spreadsheet: { select: { id: true, name: true, google_spreadsheet_id: true } },
        creator: { select: { email: true } },
        reviewer: { select: { email: true } },
        _count: { select: { rows: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(sheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tabs' });
  }
};

export const getSheetDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sheet = await prisma.sheet.findUnique({
      where: { id },
      include: {
        spreadsheet: { select: { id: true, name: true, google_spreadsheet_id: true } },
        creator: { select: { email: true } },
        rows: true,
        review_logs: {
          include: { reviewer: { select: { email: true } } },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    const enrichedRows = await enrichPenaltyRowsWithStudentInsights(sheet.rows);

    res.json({
      ...sheet,
      rows: enrichedRows,
      spreadsheet: sheet.spreadsheet
        ? {
            ...sheet.spreadsheet,
            google_spreadsheet_url: spreadsheetUrl(sheet.spreadsheet.google_spreadsheet_id),
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tab details' });
  }
};

export const addRow = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });
    if (!canManagePenaltyRows(req.user?.role)) {
      return res.status(403).json({ error: 'Only admins can add penalty rows.' });
    }

    if (!VALID_NATURES.includes(data.nature)) {
      return res.status(400).json({ error: 'Invalid nature level' });
    }

    if (!data.roll_no?.trim()) {
      return res.status(400).json({ error: 'Student roll number is required.' });
    }

    const duplicateRow = await prisma.penaltyRow.findFirst({
      where: {
        sheet_id: id,
        roll_no: data.roll_no.trim(),
      },
      select: { id: true },
    });

    if (duplicateRow) {
      return res.status(409).json({ error: 'This student is already present in the selected penalty sheet.' });
    }

    const row = await prisma.penaltyRow.create({
      data: {
        ...data,
        roll_no: data.roll_no.trim(),
        sheet_id: id
      }
    });

    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add row' });
  }
};

export const updateRow = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const rowId = req.params.rowId as string;
    const data = req.body;

    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });
    if (!canManagePenaltyRows(req.user?.role)) {
      return res.status(403).json({ error: 'Only admins can edit penalty rows.' });
    }
    if (data.nature && !VALID_NATURES.includes(data.nature)) {
      return res.status(400).json({ error: 'Invalid nature level' });
    }

    const nextRollNo = typeof data.roll_no === 'string' ? data.roll_no.trim() : undefined;
    if (nextRollNo) {
      const duplicateRow = await prisma.penaltyRow.findFirst({
        where: {
          sheet_id: id,
          roll_no: nextRollNo,
          id: { not: rowId },
        },
        select: { id: true },
      });

      if (duplicateRow) {
        return res.status(409).json({ error: 'This student is already present in the selected penalty sheet.' });
      }
    }

    const row = await prisma.penaltyRow.update({
      where: { id: rowId },
      data: nextRollNo ? { ...data, roll_no: nextRollNo } : data
    });

    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update row' });
  }
};

export const deleteRow = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const rowId = req.params.rowId as string;

    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });
    if (!canManagePenaltyRows(req.user?.role)) {
      return res.status(403).json({ error: 'Only admins can delete penalty rows.' });
    }

    await prisma.penaltyRow.delete({ where: { id: rowId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete row' });
  }
};

export const resendRowEmail = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const rowId = req.params.rowId as string;

    if (!canManagePenaltyRows(req.user?.role)) {
      return res.status(403).json({ error: 'Only admins can resend penalty emails.' });
    }

    const sheet = await prisma.sheet.findUnique({
      where: { id },
      select: { id: true, name: true, status: true }
    });
    if (!sheet) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    const { recipientRows } = await getRecipientRowsForStudent(id, rowId);
    const dispatch = await resendPenaltyEmailForStudent(sheet, recipientRows);

    res.json({
      success: true,
      message: `Penalty email resent to ${dispatch.email} for ${dispatch.rowCount} record(s).`,
      dispatch,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to resend penalty email' });
  }
};

export const deleteSheet = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });

    await prisma.sheet.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete tab' });
  }
};

export const syncSheetToGoogle = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const sheet = await prisma.sheet.findUnique({
      where: { id },
      include: {
        rows: true,
        spreadsheet: true
      }
    });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });
    if (!sheet.spreadsheet?.google_spreadsheet_id) {
      return res.status(400).json({ error: 'No Google Spreadsheet is linked to this tab.' });
    }

    const googleSpreadsheetId = sheet.spreadsheet.google_spreadsheet_id;
    const tabName = sheet.google_tab_name || sheet.name;

    try {
      await createGoogleSheetTab(googleSpreadsheetId, tabName);
    } catch (error: any) {
      return res.status(400).json({
        error: `Unable to prepare the Google tab. ${formatGoogleError(error)}`
      });
    }

    const sheetsClient = await getSheetsClient();

    try {
      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId: googleSpreadsheetId,
        range: `'${tabName}'!A2:J`,
      });
    } catch {
      // A just-created tab might not have any data yet.
    }

    if (sheet.rows.length > 0) {
      const studentsByRoll = await getStudentsByRoll(sheet.rows.map((row) => row.roll_no));
      const allRows = sheet.rows.map((row) => {
        const student = studentsByRoll.get(row.roll_no);
        return [
          row.roll_no || '',
          row.name || '',
          row.email || '',
          student?.program || '',
          student?.dept || '',
          student?.hall || '',
          row.clause || '',
          row.nature || '',
          row.remarks || '',
          new Date().toISOString()
        ];
      });

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: googleSpreadsheetId,
        range: `'${tabName}'!A2:J${allRows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allRows }
      });
    }

    if (!sheet.google_tab_name) {
      await prisma.sheet.update({
        where: { id },
        data: { google_tab_name: tabName }
      });
    }

    res.json({ success: true, message: `Synced ${sheet.rows.length} rows to "${tabName}"` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to sync to Google Sheets' });
  }
};

export const downloadSheetCsv = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sheet = await prisma.sheet.findUnique({
      where: { id },
      include: { rows: true }
    });

    if (!sheet) {
      return res.status(404).json({ error: 'Tab not found' });
    }

    const studentsByRoll = await getStudentsByRoll(sheet.rows.map((row) => row.roll_no));
    const csvRows = [
      ['Roll No', 'Name', 'Email', 'Program', 'Dept', 'Hall', 'Clause', 'Nature', 'Remarks', 'Timestamp'],
      ...sheet.rows.map((row) => {
        const student = studentsByRoll.get(row.roll_no);
        return [
          row.roll_no || '',
          row.name || '',
          row.email || '',
          student?.program || '',
          student?.dept || '',
          student?.hall || '',
          row.clause || '',
          row.nature || '',
          row.remarks || '',
          new Date().toISOString()
        ];
      })
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.name}_penalties.csv"`);
    res.send(buildCsv(csvRows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download CSV' });
  }
};

export const changeSheetStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, comment } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const sheet = await prisma.sheet.findUnique({ where: { id }, include: { rows: true } });
    if (!sheet) return res.status(404).json({ error: 'Tab not found' });

    if (status === 'UNDER_REVIEW') {
      if (sheet.status !== 'DRAFT') return res.status(400).json({ error: 'Invalid transition' });
      if (sheet.rows.length === 0) return res.status(400).json({ error: 'Cannot submit an empty tab' });
    }

    if (!ADMIN_ROLES.includes(userRole)) {
      return res.status(403).json({ error: 'Only admins can update tab workflow status.' });
    }

    let dispatchSummary: { recipientCount: number; sentTo: string[] } | null = null;
    if (status === 'SENT') {
      if (sheet.rows.length === 0) {
        return res.status(400).json({ error: 'Cannot dispatch emails for an empty tab' });
      }
      dispatchSummary = await sendPenaltyDispatchEmails(sheet);
    }

    await prisma.$transaction(async (tx) => {
      await tx.sheet.update({
        where: { id },
        data: {
          status,
          reviewed_by: userId
        }
      });

      await tx.reviewLog.create({
        data: {
          sheet_id: id,
          reviewer_id: userId,
          action: `Changed status to ${status}`,
          comment: comment || ''
        }
      });
    });

    if (dispatchSummary) {
      res.json({
        message: `Penalty emails sent to ${dispatchSummary.recipientCount} recipient(s) and tab status updated to ${status}.`,
        dispatchSummary,
      });
      return;
    }

    res.json({ message: `Tab status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to change status' });
  }
};

export const getClauses = async (req: Request, res: Response) => {
  try {
    const catalogClauses = loadClauseCatalog();
    const clauses = catalogClauses || await prisma.clause.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }]
    });
    res.json(clauses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch clauses' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    await ensureLegacySpreadsheetAssignments(req.user!.id);

    const totalSpreadsheets = await prisma.spreadsheet.count();
    const totalTabs = await prisma.sheet.count();
    const underReview = await prisma.sheet.count({ where: { status: 'UNDER_REVIEW' } });
    const approved = await prisma.sheet.count({ where: { status: 'FINAL_APPROVED' } });

    const uniqueStudentsResult = await prisma.penaltyRow.groupBy({ by: ['roll_no'] });
    const totalStudentsPenalized = uniqueStudentsResult.length;

    const recentTabs = await prisma.sheet.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        creator: { select: { email: true } },
        spreadsheet: { select: { id: true, name: true } }
      }
    });

    res.json({
      totalSpreadsheets,
      totalTabs,
      totalSheets: totalTabs,
      underReview,
      approved,
      totalStudentsPenalized,
      recentTabs,
      recentSheets: recentTabs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
