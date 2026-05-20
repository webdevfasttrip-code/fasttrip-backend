import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding promo rules...');

  const p1 = await prisma.promoCode.findUnique({ where: { code: 'FTFIRSTFLY' } });
  const p2 = await prisma.promoCode.findUnique({ where: { code: 'FTFREEFLY' } });
  const p3 = await prisma.promoCode.findUnique({ where: { code: 'FTBAZAAR' } });

  if (!p1 || !p2 || !p3) {
    console.error('Promos not found. Run seed-promos.ts first.');
    return;
  }

  // Rule 1: FTFIRSTFLY is for NEW users only
  await prisma.promoRule.create({
    data: {
      promoCodeId: p1.id,
      name: 'New User Exclusive',
      conditions: { userType: 'NEW' }
    }
  });

  // Rule 2: FTFREEFLY is for International flights only
  await prisma.promoRule.create({
    data: {
      promoCodeId: p2.id,
      name: 'International Flights Only',
      conditions: { sectorType: 'INTERNATIONAL' }
    }
  });

  // Rule 3: FTBAZAAR is for Domestic IndiGo flights
  await prisma.promoRule.create({
    data: {
      promoCodeId: p3.id,
      name: 'Domestic IndiGo Offer',
      conditions: { sectorType: 'DOMESTIC', airlineCode: '6E' }
    }
  });

  console.log('Rules seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
