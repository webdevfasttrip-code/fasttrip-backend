const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const suppliers = await prisma.supplierConfig.count();
  const bookings = await prisma.booking.count();
  const airports = await prisma.airport.count();
  console.log({ suppliers, bookings, airports });
  
  if (suppliers === 0) {
    console.log("Suppliers table is EMPTY");
  } else {
    const samples = await prisma.supplierConfig.findMany({ take: 5 });
    console.log("Suppliers Sample:", JSON.stringify(samples, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
