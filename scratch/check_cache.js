const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCache() {
  try {
    const count = await prisma.flightFareCache.count();
    console.log('Total cache entries:', count);
    const recent = await prisma.flightFareCache.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
    console.log('Recent entries:', JSON.stringify(recent, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkCache();
