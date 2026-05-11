import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const normalizePhone = (value: string): string => {
  const digits = value.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return `+${digits}`;
};

const resolveSuperAdminPhones = () => {
  const rawValues = [process.env.SUPERADMIN_PHONE, process.env.SUPERADMIN_PHONES]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((v) => normalizePhone(v.trim()))
    .filter(Boolean);

  return [...new Set(rawValues)];
};

async function main() {
  console.log('Seeding data...');

  const superAdminPhones = resolveSuperAdminPhones();
  if (!superAdminPhones.length) {
    throw new Error(
      'Set SUPERADMIN_PHONE (or SUPERADMIN_PHONES) in backend/.env before running the seed command.'
    );
  }

  for (const phone of superAdminPhones) {
    // Generate a placeholder email from the phone number
    const email = `${phone.replace('+', '')}@phone.local`;
    
    // Check if user already exists by phone
    const existing = await prisma.user.findUnique({ where: { phone } });
    
    if (existing) {
      await prisma.user.update({
        where: { phone },
        data: { role: 'SUPERADMIN', is_verified: true },
      });
    } else {
      // Also check if email exists (from old seed) and update it
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        await prisma.user.update({
          where: { email },
          data: { phone, role: 'SUPERADMIN', is_verified: true },
        });
      } else {
        await prisma.user.create({
          data: { email, phone, role: 'SUPERADMIN', is_verified: true },
        });
      }
    }
  }
  console.log(`Superadmin user(s) created/updated: ${superAdminPhones.join(', ')}`);

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

  // Seed students from JSON file
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
        email: s.username ? `${s.username}@iitk.ac.in` : null, // deriving email
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
        // Fallback if there are duplicates in the JSON
        for (const s of chunk) {
          try {
            await prisma.student.upsert({
              where: { roll: s.roll },
              update: {},
              create: s
            });
          } catch (e) { }
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
