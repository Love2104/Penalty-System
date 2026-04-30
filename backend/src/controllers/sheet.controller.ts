import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const createSheet = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Sheet name is required' });

    const sheet = await prisma.sheet.create({
      data: {
        name,
        created_by: req.user!.id,
        status: 'DRAFT'
      }
    });

    res.json(sheet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sheet' });
  }
};

export const getSheets = async (req: AuthRequest, res: Response) => {
  try {
    const sheets = await prisma.sheet.findMany({
      include: {
        creator: { select: { email: true } },
        reviewer: { select: { email: true } },
        _count: { select: { rows: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
};

export const getSheetDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const sheet = await prisma.sheet.findUnique({
      where: { id },
      include: {
        rows: true,
        review_logs: {
          include: { reviewer: { select: { email: true } } },
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    res.json(sheet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sheet details' });
  }
};

export const addRow = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'DRAFT') return res.status(403).json({ error: 'Can only add rows to DRAFT sheets' });

    // Validate nature (Level 0-6)
    const validNatures = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];
    if (!validNatures.includes(data.nature)) {
      return res.status(400).json({ error: 'Invalid nature level' });
    }

    const row = await prisma.penaltyRow.create({
      data: {
        ...data,
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
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'DRAFT') return res.status(403).json({ error: 'Can only edit rows in DRAFT sheets' });

    const row = await prisma.penaltyRow.update({
      where: { id: rowId },
      data
    });

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update row' });
  }
};

export const deleteRow = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const rowId = req.params.rowId as string;

    const sheet = await prisma.sheet.findUnique({ where: { id } });
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'DRAFT') return res.status(403).json({ error: 'Can only delete rows in DRAFT sheets' });

    await prisma.penaltyRow.delete({ where: { id: rowId } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete row' });
  }
};

export const changeSheetStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, comment } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const sheet = await prisma.sheet.findUnique({ where: { id }, include: { rows: true } });
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });

    if (status === 'UNDER_REVIEW') {
      if (sheet.status !== 'DRAFT') return res.status(400).json({ error: 'Invalid transition' });
      if (sheet.rows.length === 0) return res.status(400).json({ error: 'Cannot submit empty sheet' });
    }

    if (status === 'FINAL_APPROVED' || status === 'SENT') {
      if (userRole !== 'SUPERADMIN') return res.status(403).json({ error: 'Only SUPERADMIN can approve or send' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sheet.update({
        where: { id },
        data: { 
          status,
          reviewed_by: userRole === 'SUPERADMIN' ? userId : sheet.reviewed_by 
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

    if (status === 'SENT') {
      console.log(`[LOCAL DEV] Triggering emails for sheet ${id}`);
      setTimeout(() => {
        sheet.rows.forEach((row: any) => {
          console.log(`[EMAIL DISPATCH] To: ${row.email} | Penalty: ${row.nature} for ${row.clause}`);
        });
      }, 1000);
    }

    res.json({ message: `Sheet status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change status' });
  }
};

export const getClauses = async (req: Request, res: Response) => {
  try {
    const clauses = await prisma.clause.findMany();
    res.json(clauses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clauses' });
  }
};
