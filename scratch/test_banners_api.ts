
import axios from 'axios';

async function testApi() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/v1/admin/auth/login', {
      email: 'admin@fasttrip.id',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Login successful.');

    const bannerResponse = await axios.get('http://localhost:5000/v1/promo/admin/banners', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Banners Count:', bannerResponse.data.length);
    console.log('Banners:', JSON.stringify(bannerResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApi();
