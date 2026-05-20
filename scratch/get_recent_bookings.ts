
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const recent = await prisma.booking.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
    },
    include: {
      passengers: true
    }
  });
  console.log(JSON.stringify(recent, null, 2));
}
main().finally(() => prisma.$disconnect());
