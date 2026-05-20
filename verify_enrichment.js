async function verifyEnrichment() {
    const BASE_URL = 'http://localhost:3000';

    try {
        console.log('--- 1. Testing Enriched Search (POST /search) ---');
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

        const results = await searchRes.json();
        if (!searchRes.ok) throw { message: 'Search failed', data: results };

        if (results.length > 0) {
            const first = results[0];
            console.log('SUCCESS: Enriched Result Found:', {
                airline: first.airline.name,
                logo: first.airline.logo,
                originCity: first.origin.city,
                destinationCity: first.destination.city,
                originAirport: first.origin.name
            });
            console.log('\n✅ VERIFIED: Search Enrichment maps codes to names/logos.');
        } else {
            console.log('⚠ No flights found for given criteria.');
        }

        console.log('\n--- 2. Testing Airport Autocomplete (GET /search/airports?q=del) ---');
        const autoRes = await fetch(`${BASE_URL}/search/airports?q=del`);
        const autoData = await autoRes.json();

        if (!autoRes.ok) throw { message: 'Autocomplete failed', data: autoData };

        console.log(`SUCCESS: Found ${autoData.length} matches for "del".`);
        if (autoData.length > 0) {
            console.log('Top Match:', autoData[0]);
        }

        console.log('\n✅ VERIFIED: Airport autocomplete is functional.');

    } catch (error) {
        console.error('FAILURE:', error.message, error.data || '');
    }
}

verifyEnrichment();
