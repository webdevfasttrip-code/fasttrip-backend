
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const b1 = await prisma.booking.findFirst({ where: { bookingRef: 'FTAAZUVE' }, include: { passengers: true } });
  const b2 = await prisma.booking.findFirst({ where: { bookingRef: 'FTAAGPWV' }, include: { passengers: true } });
  console.log('B1 (Customer - FTAAZUVE):', JSON.stringify(b1, null, 2));
  console.log('B2 (Admin - FTAAGPWV):', JSON.stringify(b2, null, 2));
}
main().finally(() => prisma.$disconnect());
