
import axios from 'axios';

async function testApi() {
  try {
    // 1. Login to get token
    const loginResponse = await axios.post('http://localhost:5000/v1/admin/auth/login', {
      email: 'admin@fasttrip.id',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Login successful, token obtained.');

    // 2. Fetch Promos
    const promoResponse = await axios.get('http://localhost:5000/v1/promo/admin/list', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Promo API Response:', JSON.stringify(promoResponse.data, null, 2));
    console.log('Count:', promoResponse.data.length);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApi();
