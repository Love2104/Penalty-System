import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCeo() {
  try {
    // Check if the old CEO exists
    const oldUser = await prisma.user.findUnique({
      where: { email: 'lovec23@iitk.ac.in' }
    });

    if (oldUser) {
      await prisma.user.update({
        where: { id: oldUser.id },
        data: { email: 'lovechourasia04@gmail.com' }
      });
      console.log('CEO email updated from lovec23@iitk.ac.in to lovechourasia04@gmail.com');
    } else {
      // Check if new one exists
      const newUser = await prisma.user.findUnique({
        where: { email: 'lovechourasia04@gmail.com' }
      });
      if (newUser) {
        console.log('CEO email is already lovechourasia04@gmail.com');
      } else {
        // Create the new CEO
        await prisma.user.create({
          data: {
            email: 'lovechourasia04@gmail.com',
            role: 'SUPERADMIN'
          }
        });
        console.log('Created new CEO lovechourasia04@gmail.com');
      }
    }
  } catch (error) {
    console.error('Error updating CEO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCeo();
