import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const dubai = await prisma.visaCountry.findFirst({
        where: {
            OR: [
                { slug: 'dubai' },
                { slug: 'united-arab-emirates' },
                { countryName: { contains: 'Dubai' } },
                { countryName: { contains: 'Emirates' } },
                { countryName: { contains: 'UAE' } }
            ]
        }
    });

    if (!dubai) {
        console.error("Dubai visa country not found");
        return;
    }

    console.log(`Found Dubai country: ${dubai.countryName} (${dubai.id})`);

    const requirements = [
        {
            title: 'Passport Cover',
            description: 'Upload passport cover page the external cover page of your passport is mandatory',
            required: true,
            sortOrder: 1
        },
        {
            title: 'Hotel Reservation Document',
            description: 'Must show a valid hotel reservation covering the entire stay duration.',
            required: true,
            sortOrder: 2
        },
        {
            title: 'Flight Ticket (Arrival)',
            description: 'Upload confirmed arrival ticket',
            required: true,
            sortOrder: 3
        },
        {
            title: 'Flight Ticket (Return)',
            description: 'Upload confirmed return ticket',
            required: true,
            sortOrder: 4
        },
        {
            title: 'Birth certificate',
            description: 'Birth certificate to be provided, for traveller below 18 years',
            required: false,
            sortOrder: 5
        }
    ];

    for (const req of requirements) {
        await prisma.visaRequirement.create({
            data: {
                countryId: dubai.id,
                ...req
            }
        });
        console.log(`Added requirement: ${req.title}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
