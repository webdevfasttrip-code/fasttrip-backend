import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

const prisma = new PrismaClient();
const jwtService = new JwtService({
  secret: 'your_super_strong_access_secret',
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

  try {
    const response = await axios.get('http://localhost:5000/v1/admin/visa/countries', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Response Status:', response.status);
    console.log('Data count:', response.data.length);
  } catch (error: any) {
    console.log('Error Status:', error.response?.status);
    console.log('Error Message:', error.response?.data?.message || error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
