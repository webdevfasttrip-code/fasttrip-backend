const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPromo() {
  const promo = await prisma.promoCode.findUnique({
    where: { code: 'FTFIRSTFLY' },
    include: { rules: true }
  });
  console.log(JSON.stringify(promo, null, 2));
}

checkPromo().finally(() => prisma.$disconnect());
