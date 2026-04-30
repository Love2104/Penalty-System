import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Create CEO
  await prisma.user.upsert({
    where: { email: 'lovechourasia04@gmail.com' },
    update: {},
    create: {
      email: 'lovechourasia04@gmail.com',
      role: 'SUPERADMIN',
      is_verified: true,
    },
  });
  console.log('CEO user created: lovechourasia04@gmail.com');

  // Seed default clauses
  const defaultClauses = [
    {
      title: 'Anti-campaigning prohibited',
      description: 'Engaging in any campaigning activities during the silent period or unauthorized campaigning.',
      category: 'Campaigning',
      severity_hint: 'Level 3 - Level 5',
    },
    {
      title: 'Unauthorized public gathering',
      description: 'Organizing or participating in gatherings without prior permission from the authorities.',
      category: 'Public Order',
      severity_hint: 'Level 2 - Level 4',
    },
    {
      title: 'Social media violations',
      description: 'Posting inappropriate content, harassment, or violating election guidelines on social platforms.',
      category: 'Digital Conduct',
      severity_hint: 'Level 1 - Level 3',
    },
    {
      title: 'Use of institute resources',
      description: 'Unauthorized use of institute emails, servers, or physical resources for campaigning.',
      category: 'Resource Misuse',
      severity_hint: 'Level 3 - Level 5',
    },
  ];

  for (const clause of defaultClauses) {
    const existing = await prisma.clause.findFirst({
      where: { title: clause.title },
    });
    if (!existing) {
      await prisma.clause.create({ data: clause });
    }
  }
  console.log('Clauses seeded.');

  // Seed students from JSON file
  const studentsFilePath = 'D:/Downloads/student-search-iitk-main/student-search-iitk-main/data/students.json';

  if (fs.existsSync(studentsFilePath)) {
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
  } else {
    console.log('Students file not found. Skipping student seeding.');
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
