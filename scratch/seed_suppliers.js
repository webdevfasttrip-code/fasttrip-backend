const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSuppliers() {
  const suppliers = [
    {
      name: 'Amadeus',
      type: 'GDS',
      priority: 1,
      timeout: 5000,
      isActive: true,
      endpoint: 'https://test.api.amadeus.com/v2'
    },
    {
      name: 'TBO Air',
      type: 'LCC',
      priority: 2,
      timeout: 8000,
      isActive: true,
      endpoint: 'http://api.tektravels.com/SharedServices'
    },
    {
      name: 'IndiGo Direct',
      type: 'LCC',
      priority: 3,
      timeout: 6000,
      isActive: false,
      endpoint: 'https://api.indigo.in/v1'
    }
  ];

  for (const s of suppliers) {
    await prisma.supplierConfig.upsert({
      where: { name: s.name },
      update: {},
      create: s
    });
  }
  
  console.log('Suppliers initialized successfully.');
}

seedSuppliers().finally(() => prisma.$disconnect());
