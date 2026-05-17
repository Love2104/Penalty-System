import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const resolveSuperAdminEmails = () => {
  const rawValues = [process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map(normalizeEmail)
    .filter(Boolean);

  return [...new Set(rawValues)];
};

async function main() {
  console.log('Seeding data...');

  const superAdminEmails = resolveSuperAdminEmails();
  if (!superAdminEmails.length) {
    throw new Error(
      'Set SUPERADMIN_EMAIL (or SUPERADMIN_EMAILS) in backend/.env before running the seed command.'
    );
  }

  for (const superAdminEmail of superAdminEmails) {
    await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: {
        role: 'SUPERADMIN',
        is_verified: true,
      },
      create: {
        email: superAdminEmail,
        role: 'SUPERADMIN',
        is_verified: true,
      },
    });
  }
  console.log(`Superadmin user(s) created/updated: ${superAdminEmails.join(', ')}`);

  const clauseSeedPath = path.join(__dirname, 'data', 'coc-ge-2026-clauses.json');
  if (fs.existsSync(clauseSeedPath)) {
    const clauseRows = JSON.parse(fs.readFileSync(clauseSeedPath, 'utf-8'));
    await prisma.clause.deleteMany();
    await prisma.clause.createMany({
      data: clauseRows,
    });
    console.log(`Seeded ${clauseRows.length} clauses from COC GE 2026.`);
  } else {
    console.log('Clause seed file not found. Skipping clause seeding.');
  }

  const studentsFilePath = process.env.STUDENT_SEED_PATH?.trim();

  if (studentsFilePath && fs.existsSync(studentsFilePath)) {
    console.log('Reading students.json...');
    const data = fs.readFileSync(studentsFilePath, 'utf-8');
    const students = JSON.parse(data);

    console.log(`Found ${students.length} students. Seeding in chunks to avoid memory issues...`);

    const chunkSize = 5000;
    let count = 0;
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize).map((s: any) => ({
        roll: s.roll.toString(),
        username: s.username,
        name: s.name,
        program: s.program || null,
        dept: s.dept || null,
        hall: s.hall || null,
        room: s.room || null,
        blood_group: s.blood_group || null,
        gender: s.gender || null,
        hometown: s.hometown || null,
        image_url: s.image_url || null,
        email: s.username ? `${s.username}@iitk.ac.in` : null,
      }));

      try {
        await prisma.student.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        count += chunk.length;
        console.log(`Seeded ${count}/${students.length} students...`);
      } catch (err: any) {
        console.log('Error seeding chunk, falling back to individual inserts...', err.message);
        for (const s of chunk) {
          try {
            await prisma.student.upsert({
              where: { roll: s.roll },
              update: {},
              create: s
            });
          } catch (_error) {}
        }
      }
    }
    console.log('Student seeding complete.');
  } else if (studentsFilePath) {
    console.log(`Student seed file not found at ${studentsFilePath}. Skipping student seeding.`);
  } else {
    console.log('STUDENT_SEED_PATH is not set. Skipping student seeding.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
