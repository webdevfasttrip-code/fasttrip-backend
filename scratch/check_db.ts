
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const promoCount = await prisma.promoCode.count();
    console.log(`Total Promo Codes in DB: ${promoCount}`);
    const promos = await prisma.promoCode.findMany({
      select: { id: true, code: true, name: true, status: true }
    });
    console.log('Promos:', JSON.stringify(promos, null, 2));
  } catch (error) {
    console.error('Error connecting to DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
