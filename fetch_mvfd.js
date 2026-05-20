const axios = require('axios'); require('dotenv').config(); const apiKey = process.env.MVFD_API_KEY; const baseUrl = process.env.MVFD_BASE_URL;
axios.post(baseUrl + '/service/flightSearch', {
    origin: 'DEL',
    destination: 'BOM',
    date: '2026-05-20',
    travelType: 'DO',
    passengers: { adult: 1, child: 0, infant: 0, cabin: 'EC' }
}, { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } })
.then(res => console.log(JSON.stringify(res.data.data?.[0]?.priceDetails || res.data, null, 2)))
.catch(console.error);
