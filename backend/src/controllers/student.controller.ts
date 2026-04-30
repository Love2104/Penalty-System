import { Request, Response } from 'express';
import prisma from '../lib/prisma';

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

    // For generic text search 'q'
    if (q) {
      where.OR = [
        { name: { contains: q as string } },
        { roll: { contains: q as string } },
        { email: { contains: q as string } }
      ];
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

    res.json({
      data: students,
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
