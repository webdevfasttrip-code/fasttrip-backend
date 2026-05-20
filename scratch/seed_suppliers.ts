import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding suppliers...');

  const suppliers = [
    {
      name: 'AMADEUS',
      type: 'GDS',
      priority: 1,
      isActive: true,
      timeout: 10000,
      endpoint: 'https://test.api.amadeus.com/v2',
    },
    {
      name: 'MVFD',
      type: 'MANUAL',
      priority: 2,
      isActive: true,
      timeout: 5000,
      endpoint: 'https://apidev.flysync.in',
    }
  ];

  for (const s of suppliers) {
    await prisma.supplierConfig.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        type: s.type as any,
        priority: s.priority,
        isActive: s.isActive,
        timeout: s.timeout,
        endpoint: s.endpoint,
      },
    });
  }

  console.log('Suppliers seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
