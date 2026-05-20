const BASE_URL = 'http://localhost:3000';

async function verifyPhase7() {
    console.log('--- Phase 7 Verification Started ---');

    try {
        // 1. Admin Login
        console.log('\n1. Testing Admin Login...');
        const loginRes = await fetch(`${BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@flight.com', password: 'admin123' }),
        });
        const loginData = await loginRes.json();
        if (!loginData.access_token) throw new Error('Login failed');
        const token = loginData.access_token;
        console.log('✅ Admin Login Successful');

        // 2. Create Global Markup Rule
        console.log('\n2. Creating Global Markup Rule (5% + 500 INR)...');
        const markupRes = await fetch(`${BASE_URL}/admin/revenue/markup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                percentage: 5,
                fixedAmount: 500,
                isActive: true
            }),
        });
        const markupRule = await markupRes.json();
        console.log('✅ Markup Rule Created:', markupRule.id);

        // 3. Test Search with Markup
        console.log('\n3. Testing Search with Markup...');
        const searchRes = await fetch(`${BASE_URL}/search/flights?origin=DEL&destination=BOM&departureDate=2026-04-01&adults=1`);
        const searchData = await searchRes.json();
        if (searchData.length > 0) {
            const flight = searchData[0];
            console.log(`Flight: ${flight.airline.name} | Supplier Price: ${flight.fare.supplierPrice} | Final Price: ${flight.fare.totalFare}`);
            const expected = Math.round(flight.fare.supplierPrice * 1.05 + 500);
            if (Math.abs(flight.fare.totalFare - expected) < 2) {
                console.log('✅ Markup Calculation Verified');
            } else {
                console.error('❌ Markup Calculation Mismatch!', { expected, actual: flight.fare.totalFare });
            }
        } else {
            console.log('⚠️ No flights found for testing search.');
        }

        // 4. Test User Management
        console.log('\n4. Testing User Management (Fetch Users)...');
        const usersRes = await fetch(`${BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await usersRes.json();
        console.log(`✅ Fetched ${users.length} users`);

        // 5. Test Booking Stats
        console.log('\n5. Testing Booking Dashboard Stats...');
        const statsRes = await fetch(`${BASE_URL}/admin/bookings/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await statsRes.json();
        console.log('✅ Stats received:', stats);

        console.log('\n--- Phase 7 Verification Completed Successfully ---');
    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
    }
}

verifyPhase7();
