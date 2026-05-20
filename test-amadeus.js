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

    console.log("Token obtained");

    // Test with INR
    console.log("Testing with currencyCode=INR...");
    const res1 = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=DEL&destinationLocationCode=GAU&departureDate=2026-05-05&adults=1&currencyCode=INR&max=20`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("INR Test Status:", res1.status);
    if (res1.status !== 200) console.log(await res1.json());

    // Test without INR
    console.log("\nTesting without currencyCode...");
    const res2 = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=DEL&destinationLocationCode=GAU&departureDate=2026-05-05&adults=1&max=20`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("No CurrencyCode Test Status:", res2.status);
    if (res2.status !== 200) console.log(await res2.json());
}

test().catch(console.error);
