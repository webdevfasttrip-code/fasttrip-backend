import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUsers = await prisma.adminUser.count();
  const countries = await prisma.visaCountry.count();
  console.log(`Admin Users: ${adminUsers}`);
  console.log(`Visa Countries: ${countries}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
