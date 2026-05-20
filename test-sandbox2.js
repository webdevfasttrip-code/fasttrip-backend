const fs = require('fs');
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
    
    let output = "Token obtained\n";

    function getFutureDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    const testRoutes = [
        { orig: 'DEL', dest: 'BOM', date: getFutureDate(30) },
        { orig: 'LHR', dest: 'JFK', date: getFutureDate(30) },
        { orig: 'BKK', dest: 'SYD', date: getFutureDate(30) },
        { orig: 'MAD', dest: 'CDG', date: getFutureDate(30) },
        { orig: 'DEL', dest: 'GAU', date: getFutureDate(60) },
    ];

    for (const route of testRoutes) {
        output += `\nTesting ${route.orig} -> ${route.dest} on ${route.date}... (currency INR)\n`;
        const res = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${route.orig}&destinationLocationCode=${route.dest}&departureDate=${route.date}&adults=1&currencyCode=INR&max=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        output += `Status: ${res.status}\n`;
        if (res.status === 200) {
            const data = await res.json();
            output += `Found ${data.data?.length} flights\n`;
        } else {
            const err = await res.json();
            output += JSON.stringify(err) + "\n";
        }
        
        // Also test without INR
        output += `\nTesting ${route.orig} -> ${route.dest} on ${route.date}... (no currency)\n`;
        const res2 = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${route.orig}&destinationLocationCode=${route.dest}&departureDate=${route.date}&adults=1&max=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        output += `Status: ${res2.status}\n`;
        if (res2.status === 200) {
            const data2 = await res2.json();
            output += `Found ${data2.data?.length} flights\n`;
        } else {
            const err2 = await res2.json();
            output += JSON.stringify(err2) + "\n";
        }
    }

    fs.writeFileSync('sandbox-results.txt', output);
}

test().catch(console.error);
