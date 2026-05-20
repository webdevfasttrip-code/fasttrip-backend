async function verifyRevalidation() {
    const BASE_URL = 'http://localhost:3000';

    try {
        console.log('--- 1. Searching for Flights ---');
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
        if (flights.length === 0) throw new Error('No flights found to test revalidation');

        const selectedFlight = flights[0];
        console.log(`Testing Revalidation for: ${selectedFlight.airline.name} (${selectedFlight.offerId})`);

        console.log('\n--- 2. Revalidating Offer (POST /search/revalidate) ---');
        const revalRes = await fetch(`${BASE_URL}/search/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplier: 'AMADEUS',
                rawOffer: selectedFlight.rawData
            })
        });

        const revalData = await revalRes.json();
        if (!revalRes.ok) {
            console.error('Revalidation failed:', revalData);
            throw new Error('Revalidation API call failed');
        }

        console.log('SUCCESS: Revalidation Complete!');
        console.log('Fare Options:', JSON.stringify(revalData.fareOptions, null, 2));
        console.log('Add-ons found:', {
            baggage: revalData.addOns.baggage.length,
            meals: revalData.addOns.meals.length,
            seats: revalData.addOns.seats.length
        });

        console.log('\n✅ PHASE 3 VERIFIED: Revalidation returns normalized fare & add-ons');

    } catch (error) {
        console.error('FAILURE:', error.message);
    }
}

verifyRevalidation();
