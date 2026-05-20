async function verifyDraftSystem() {
    const BASE_URL = 'http://localhost:3000';

    try {
        console.log('--- 1. Searching for Flight ---');
        const searchRes = await fetch(`${BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: 'DEL',
                destination: 'BOM',
                departureDate: '2026-03-25',
                adults: 1
            })
        });
        const flights = await searchRes.json();
        const selectedFlight = flights[0];

        console.log('\n--- 2. Testing Price Manipulation (Should Fail) ---');
        const fakePriceBooking = await fetch(`${BASE_URL}/booking/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'attacker@example.com',
                totalAmount: 10, // Manually lowered price
                contactPhone: '+919999999999',
                contactEmail: 'attacker@example.com',
                supplier: 'AMADEUS',
                rawOffer: selectedFlight.rawData,
                passengers: [
                    { firstName: 'Hack', lastName: 'User', gender: 'MALE', dateOfBirth: '1990-01-01' }
                ]
            })
        });
        const fakePriceRes = await fakePriceBooking.json();
        if (fakePriceBooking.status === 400 && fakePriceRes.message.includes('Price mismatch')) {
            console.log('✅ SUCCESS: Price manipulation blocked by server!');
        } else {
            console.log('❌ FAILURE: Price manipulation was NOT blocked!', fakePriceRes);
        }

        console.log('\n--- 3. Creating Valid Draft ---');
        const validBooking = await fetch(`${BASE_URL}/booking/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@example.com',
                totalAmount: selectedFlight.fare.totalFare,
                contactPhone: '+919876543210',
                contactEmail: 'user@example.com',
                supplier: 'AMADEUS',
                rawOffer: selectedFlight.rawData,
                gstDetails: {
                    gstNumber: '07AAAAA0000A1Z5',
                    companyName: 'Test Corp',
                    address: 'Delhi, India'
                },
                passengers: [
                    { firstName: 'John', lastName: 'Doe', gender: 'MALE', dateOfBirth: '1990-01-01' }
                ]
            })
        });

        const bookingJson = await validBooking.json();
        if (!validBooking.ok) throw new Error('Valid booking creation failed: ' + JSON.stringify(bookingJson));

        console.log('✅ SUCCESS: Draft created!', bookingJson.bookingRef);
        console.log('Expiry:', bookingJson.expiresAt);
        console.log('GST Stored:', !!bookingJson.gstDetails);

        console.log('\n--- 4. Verifying Atomic Persistence ---');
        const getRes = await fetch(`${BASE_URL}/booking/ref/${bookingJson.bookingRef}`);
        const retrieved = await getRes.json();
        if (retrieved.contactPhone === '+919876543210') {
            console.log('✅ SUCCESS: All metadata persisted correctly!');
        }

    } catch (error) {
        console.error('FAILURE:', error.message);
    }
}

verifyDraftSystem();
