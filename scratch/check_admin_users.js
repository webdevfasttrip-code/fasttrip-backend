const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const adminUsers = await prisma.adminUser.count();
  console.log('AdminUsers:', adminUsers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
