require('dotenv').config();
async function test() {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    
    // Auth
    const tokenRes = await fetch(`https://test.api.amadeus.com/v1/security/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }).toString(),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    function getFutureDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    const testRoutes = [
        { orig: 'DEL', dest: 'BOM', date: getFutureDate(30) },
        { orig: 'LHR', dest: 'JFK', date: getFutureDate(30) },
        { orig: 'DEL', dest: 'GAU', date: getFutureDate(60) },
    ];

    for (const route of testRoutes) {
        console.log(`\nTesting ${route.orig} -> ${route.dest} on ${route.date}...`);
        const res = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${route.orig}&destinationLocationCode=${route.dest}&departureDate=${route.date}&adults=1&currencyCode=INR&max=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Status:", res.status);
        if (res.status === 200) {
            const data = await res.json();
            console.log("Found", data.data?.length, "flights");
        } else {
            console.log(JSON.stringify(await res.json(), null, 2));
        }
    }
}

test().catch(console.error);
