import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await (prisma as any).adminUser.upsert({
    where: { email: 'admin@fasttrip.id' },
    update: {},
    create: {
      email: 'admin@fasttrip.id',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      permissions: ['MANAGE_USERS', 'MANAGE_PROMOS', 'MANAGE_BOOKINGS', 'VIEW_ANALYTICS'],
      isActive: true
    }
  });

  console.log('Admin user seeded:', admin.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
