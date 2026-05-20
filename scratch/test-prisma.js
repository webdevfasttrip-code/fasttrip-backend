const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testPrisma() {
  const prisma = new PrismaClient();
  console.log('Testing Prisma connection...');

  try {
    const airlinesCount = await prisma.airline.count();
    console.log(`Successfully connected! Airlines count: ${airlinesCount}`);
  } catch (err) {
    console.error('Prisma connection failed:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
