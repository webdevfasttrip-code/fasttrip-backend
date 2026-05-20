const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeries() {
  try {
    const count = await prisma.seriesFare.count();
    console.log('Total series fares:', count);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeries();
