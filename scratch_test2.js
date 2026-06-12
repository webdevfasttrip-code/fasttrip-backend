const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDistance } = require('geolib');

async function check() {
    const bom = await prisma.airport.findUnique({ where: { iataCode: 'BOM' } });
    console.log("BOM:", bom);
    
    // Bounding box for 100km
    const radius = 200000;
    const lat = bom.latitude;
    const lon = bom.longitude;
    // rough bounding box
    const airports = await prisma.airport.findMany({
        where: {
            isSearchable: true,
            showInNearby: true,
            latitude: { gte: lat - 2, lte: lat + 2 },
            longitude: { gte: lon - 2, lte: lon + 2 }
        }
    });
    console.log(`Found ${airports.length} airports in bounding box`);
    for (const a of airports) {
        if (a.iataCode !== 'BOM') {
            const d = getDistance({ latitude: lat, longitude: lon }, { latitude: a.latitude, longitude: a.longitude });
            console.log(`${a.iataCode} is ${d}m away`);
        }
    }
}
check().finally(() => prisma.$disconnect());
