import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getPenaltyCountsByRolls, getStudentRoleInsights } from '../services/roleIntelligence';

export const getStudentFilters = async (req: Request, res: Response) => {
  try {
    const [hallRows, programRows] = await Promise.all([
      prisma.student.groupBy({
        by: ['hall'],
        where: {
          hall: {
            not: null,
          },
        },
        _count: {
          hall: true,
        },
        orderBy: {
          hall: 'asc',
        },
      }),
      prisma.student.groupBy({
        by: ['program'],
        where: {
          program: {
            not: null,
          },
        },
        _count: {
          program: true,
        },
        orderBy: {
          program: 'asc',
        },
      }),
    ]);

    const halls = hallRows
      .filter((row) => row.hall && row.hall.trim().length > 0)
      .map((row) => ({
        value: row.hall as string,
        label: row.hall as string,
        count: row._count.hall,
      }));

    const programs = programRows
      .filter((row) => row.program && row.program.trim().length > 0)
      .map((row) => ({
        value: row.program as string,
        label: row.program as string,
        count: row._count.program,
      }));

    res.json({ halls, programs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch student filters' });
  }
};

export const searchStudents = async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '10',
      q, // Search term for name or roll or email
      roll,
      name,
      dept,
      hall,
      program,
      gender,
      blood_group,
      hometown
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma where clause
    const where: any = {};

    const queryTokens = typeof q === 'string'
      ? q.trim().split(/\s+/).filter(Boolean)
      : [];

    // For generic text search 'q', match every token so multi-word names work well.
    if (queryTokens.length > 0) {
      where.AND = queryTokens.map((token) => ({
        OR: [
          { name: { contains: token } },
          { roll: { contains: token } },
          { email: { contains: token } }
        ]
      }));
    }

    // Specific filters
    if (roll) where.roll = { contains: roll as string };
    if (name) where.name = { contains: name as string };
    if (dept) where.dept = { contains: dept as string };
    if (hall) where.hall = { contains: hall as string };
    if (program) where.program = { contains: program as string };
    if (gender) where.gender = gender;
    if (blood_group) where.blood_group = { contains: blood_group as string };
    if (hometown) where.hometown = { contains: hometown as string };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { roll: 'asc' }
      }),
      prisma.student.count({ where })
    ]);

    const rolls = students.map((student) => student.roll);
    const [{ roleMap, conflictMap }, penaltyCountMap] = await Promise.all([
      getStudentRoleInsights(rolls),
      getPenaltyCountsByRolls(rolls),
    ]);

    const enrichedStudents = students.map((student) => ({
      ...student,
      roles: roleMap.get(student.roll) || [],
      has_conflict: conflictMap.get(student.roll) || false,
      penalty_count: penaltyCountMap.get(student.roll) || 0,
    }));

    res.json({
      data: enrichedStudents,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search students' });
  }
};

export const addStudent = async (req: Request, res: Response) => {
  try {
    const { roll, name, email, program, dept, hall } = req.body;
    
    if (!roll || !name) return res.status(400).json({ error: 'Roll and Name are required' });

    const student = await prisma.student.upsert({
      where: { roll },
      update: { name, email, program, dept, hall },
      create: {
        roll,
        name,
        email,
        username: email ? email.split('@')[0] : roll,
        program,
        dept,
        hall
      }
    });

    res.json({ message: 'Student added successfully', student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add student' });
  }
};
