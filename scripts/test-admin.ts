import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function runTests() {
  console.log('Testing Admin Routes');
  
  let admin = await prisma.user.findUnique({ where: { email: 'admin_test@example.com' } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin_test@example.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN',
      }
    });
    console.log('Created test admin user.');
  } else {
    // Ensure password is correct and role is ADMIN just in case
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { email: 'admin_test@example.com' },
      data: { password: hashedPassword, role: 'ADMIN' }
    });
  }

  let token = '';
  let port = 3000;
  
  try {
    const res = await axios.post(`http://localhost:${port}/v1/admin/auth/login`, { email: 'admin_test@example.com', password: 'password123' });
    token = res.data.access_token;
  } catch (err: any) {
    port = 5000;
    try {
      const res = await axios.post(`http://localhost:${port}/v1/admin/auth/login`, { email: 'admin_test@example.com', password: 'password123' });
      token = res.data.access_token;
    } catch (e: any) {
      console.error('Login failed on both 3000 and 5000:', e.response?.data || e.message);
      return;
    }
  }

  console.log(`Successfully logged in on port ${port}. Token acquired.`);
  
  const headers = { Authorization: `Bearer ${token}` };
  const baseUrl = `http://localhost:${port}/v1/admin`;

  try {
    const dash = await axios.get(`${baseUrl}/dashboard`, { headers });
    console.log('Dashboard stats:', dash.data);

    const bookings = await axios.get(`${baseUrl}/bookings`, { headers });
    console.log('Bookings config:', bookings.data.meta);

    const users = await axios.get(`${baseUrl}/users`, { headers });
    console.log(`Users fetched: ${users.data.length}`);

    console.log('✅ EVERYTHING IS WORKING PERFECTLY!');
  } catch (err: any) {
    console.error('API call failed:', err.response?.data || err.message);
  }
}

runTests().finally(() => prisma.$disconnect());
