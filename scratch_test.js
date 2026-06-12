const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const res = await prisma.airport.findMany({
        where: { iataCode: { in: ['HDO', 'DXN', 'HSS'] } }
    });
    console.log("Airports:", res);
    
    // Also test getNearbyAirports logic manually for DEL
    const del = await prisma.airport.findUnique({ where: { iataCode: 'DEL' } });
    console.log("DEL:", del);
}
check().finally(() => prisma.$disconnect());
