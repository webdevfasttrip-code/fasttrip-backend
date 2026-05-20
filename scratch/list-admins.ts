import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUsers = await prisma.adminUser.findMany();
  console.log(JSON.stringify(adminUsers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
