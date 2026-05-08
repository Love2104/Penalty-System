import { Request, Response } from 'express';
import {
  getStudentFullInfo,
  getStudentRoleInfo,
  hydrateMissingStudentNames,
  parseBooleanFlag,
  parseElectionYear,
  uploadRoleMappings,
  validateRoleUploadPayload,
} from '../services/roleIntelligence';

const parseJsonInput = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Uploaded file/body does not contain valid JSON.');
  }
};

const resolveUploadPayload = (req: Request) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (file?.buffer?.length) {
    return parseJsonInput(file.buffer.toString('utf-8'));
  }

  if (Array.isArray(req.body)) {
    return req.body;
  }

  if (Array.isArray(req.body?.roles)) {
    return req.body.roles;
  }

  if (typeof req.body?.roles === 'string') {
    return parseJsonInput(req.body.roles);
  }

  if (typeof req.body?.data === 'string') {
    return parseJsonInput(req.body.data);
  }

  if (Array.isArray(req.body?.data)) {
    return req.body.data;
  }

  throw new Error('Send either a JSON file as "file" or a JSON array in the request body.');
};

export const uploadRoleJson = async (req: Request, res: Response) => {
  try {
    const payload = resolveUploadPayload(req);
    const groups = await hydrateMissingStudentNames(validateRoleUploadPayload(payload));
    const electionYear = parseElectionYear(req.body?.election_year);
    const replaceExisting = parseBooleanFlag(req.body?.replace_existing ?? req.body?.replaceExisting, true);

    const summary = await uploadRoleMappings(groups, electionYear, replaceExisting);

    res.json({
      success: true,
      message: `Imported ${summary.mappingsCreated} role mappings for election year ${electionYear}.`,
      election_year: electionYear,
      replace_existing: replaceExisting,
      groups_processed: summary.groupsProcessed,
      mappings_created: summary.mappingsCreated,
      conflicts_detected: summary.conflictsDetected,
      conflicts: summary.conflicts,
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to import role mappings' });
  }
};

export const getRoleStudentInfo = async (req: Request, res: Response) => {
  try {
    const roll = req.params.roll as string;
    const student = await getStudentRoleInfo(roll);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student role information' });
  }
};

export const getRoleStudentHistory = async (req: Request, res: Response) => {
  try {
    const roll = req.params.roll as string;
    const student = await getStudentFullInfo(roll);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      roll,
      penalty_history: student.penalty_history,
      risk_indicator: student.risk_indicator,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student penalty history' });
  }
};

export const getRoleStudentFullInfo = async (req: Request, res: Response) => {
  try {
    const roll = req.params.roll as string;
    const student = await getStudentFullInfo(roll);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student info panel data' });
  }
};
