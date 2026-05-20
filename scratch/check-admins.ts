import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.adminUser.findMany();
  console.log('Admins in DB:', JSON.stringify(admins.map(a => ({ id: a.id, email: a.email, role: a.role })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
