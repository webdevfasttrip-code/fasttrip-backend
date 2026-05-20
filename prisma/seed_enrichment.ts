import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding enrichment data (Airports & Airlines)...');

    const airports = [
        { iata: 'DEL', airport_name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'IN', latitude: 28.5562, longitude: 77.1000, continent: 'AS', iso_region: 'IN-DL', icao: 'VIDP' },
        { iata: 'BOM', airport_name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'IN', latitude: 19.0896, longitude: 72.8656, continent: 'AS', iso_region: 'IN-MH', icao: 'VABB' },
        { iata: 'BLR', airport_name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'IN', latitude: 13.1986, longitude: 77.7066, continent: 'AS', iso_region: 'IN-KA', icao: 'VOBL' },
        { iata: 'DXB', airport_name: 'Dubai International Airport', city: 'Dubai', country: 'AE', latitude: 25.2532, longitude: 55.3657, continent: 'AS', iso_region: 'AE-DU', icao: 'OMDB' },
        { iata: 'JFK', airport_name: 'John F. Kennedy International Airport', city: 'New York', country: 'US', latitude: 40.6413, longitude: -73.7781, continent: 'NA', iso_region: 'US-NY', icao: 'KJFK' },
        { iata: 'LHR', airport_name: 'London Heathrow Airport', city: 'London', country: 'GB', latitude: 51.4700, longitude: -0.4543, continent: 'EU', iso_region: 'GB-ENG', icao: 'EGLL' },
        { iata: 'SIN', airport_name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG', latitude: 1.3644, longitude: 103.9915, continent: 'AS', iso_region: 'SG-01', icao: 'WSSS' },
        { iata: 'GAU', airport_name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', country: 'IN', latitude: 26.1061, longitude: 91.5859, continent: 'AS', iso_region: 'IN-AS', icao: 'VEGT' }
    ];

    /* 
    for (const data of airports) {
        await prisma.airport.upsert({
            where: { id: (data as any).id }, // id is the only unique field now
            update: {},
            create: data as any
        });
    }
    */

    const airlines = [
        { iata: '6E', name: 'IndiGo', logo_png_url: 'https://img.logo.dev/indigo.png' },
        { iata: 'AI', name: 'Air India', logo_png_url: 'https://img.logo.dev/airindia.png' },
        { iata: 'EK', name: 'Emirates', logo_png_url: 'https://img.logo.dev/emirates.png' },
        { iata: 'QR', name: 'Qatar Airways', logo_png_url: 'https://img.logo.dev/qatarairways.png' },
        { iata: 'SQ', name: 'Singapore Airlines', logo_png_url: 'https://img.logo.dev/singaporeairlines.png' }
    ];

    for (const data of airlines) {
        await (prisma as any).airlines.upsert({
            where: { iata: data.iata },
            update: {},
            create: data
        });
    }

    console.log('Enrichment data seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
