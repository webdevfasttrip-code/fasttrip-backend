import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const airportCount = await prisma.airport.count();
  const airlineCount = await prisma.airline.count();
  
  console.log(`Airports: ${airportCount}`);
  console.log(`Airlines: ${airlineCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
