import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Create CEO
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'lovec23@iitk.ac.in';
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
  console.log(`CEO user created/updated: ${superAdminEmail}`);

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

    // We'll take the first 1000 for quick seeding if it's too large, or we can use createMany with chunks.
    // The prompt says 199k records, SQLite might be slow. We'll do chunks of 5000.

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

      // we use a transaction or createMany. createMany is supported by sqlite.
      // But skipDuplicates is NOT supported by sqlite in createMany in Prisma until recently maybe? 
      // Actually SQLite does not support skipDuplicates. Let's do it carefully or use transactions with upsert.
      // Actually, since we start fresh, createMany without skipDuplicates is fine as long as there are no duplicates.
      try {
        await prisma.student.createMany({
          data: chunk,
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
