import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();
const jwtService = new JwtService({
  secret: 'your_super_strong_access_secret', // from .env
});

async function main() {
  const admin = await prisma.adminUser.findFirst({ where: { email: 'admin@fasttrip.id' } });
  if (!admin) {
    console.log('No admin found');
    return;
  }

  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
  };

  const token = jwtService.sign(payload);
  console.log('Generated Token:', token);

  // Now try to call the service directly (to simulate the controller)
  const { VisaService } = require('../src/visa/visa.service');
  const visaService = new VisaService(prisma);
  const countries = await visaService.findAllCountries();
  console.log('Countries found by service:', countries.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
