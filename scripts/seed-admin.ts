import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@fasttrip.in';
  const password = await bcrypt.hash('superadmin123', 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {
      role: AdminRole.SUPER_ADMIN,
      permissions: [],
    },
    create: {
      email,
      name: 'Super Admin',
      password,
      role: AdminRole.SUPER_ADMIN,
      permissions: [],
    },
  });

  console.log('Super Admin seeded successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
