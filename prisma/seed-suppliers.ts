import { PrismaClient, SupplierType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding suppliers...');
    
    const suppliers = [
        {
            name: 'AMADEUS',
            type: SupplierType.GDS,
            priority: 1,
            isActive: true,
            endpoint: 'https://test.api.amadeus.com/v1',
            timeout: 8000
        },
        {
            name: 'MVFD',
            type: SupplierType.NDC,
            priority: 2,
            isActive: true,
            endpoint: 'https://api.makevoyage.com/v1',
            timeout: 10000
        },
        {
            name: 'INTERNAL_INVENTORY',
            type: SupplierType.MANUAL,
            priority: 3,
            isActive: true,
            endpoint: 'local',
            timeout: 5000
        }
    ];

    for (const supplier of suppliers) {
        await prisma.supplierConfig.upsert({
            where: { name: supplier.name },
            update: supplier,
            create: supplier
        });
        console.log(`Upserted supplier: ${supplier.name}`);
    }
    
    console.log('Suppliers seeded successfully.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
