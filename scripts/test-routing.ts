import axios from 'axios';

async function testPort(port: number, path: string) {
  try {
     console.log(`Trying http://127.0.0.1:${port}${path}`);
     const res = await axios.post(`http://127.0.0.1:${port}${path}`, { email: 'admin_test@example.com', password: 'password123' });
     console.log('✅ Success! Token acquired on this path.');
  } catch (err: any) {
     console.log('❌ Failed:', err.response?.status, err.response?.data || err.message);
  }
}

async function run() {
  await testPort(3000, '/v1/admin/auth/login');
  await testPort(5000, '/v1/admin/auth/login');
  await testPort(3000, '/api/v1/admin/auth/login');
  await testPort(5000, '/api/v1/admin/auth/login');
}

run();
