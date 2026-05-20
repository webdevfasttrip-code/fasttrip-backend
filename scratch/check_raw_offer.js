const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const admins = await prisma.adminUser.findMany({});
  console.log("All Admins:", JSON.stringify(admins.map(a => ({
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    isActive: a.isActive
  })), null, 2));
}

run();
