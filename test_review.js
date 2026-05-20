const axios = require('axios'); require('dotenv').config(); const apiKey = process.env.MVFD_API_KEY; const baseUrl = process.env.MVFD_BASE_URL;
axios.post(baseUrl + '/service/flightSearch', {
    origin: 'DEL',
    destination: 'BOM',
    date: '2026-05-20',
    travelType: 'DO',
    passengers: { adult: 1, child: 0, infant: 0, cabin: 'EC' }
}, { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } })
.then(async res => {
  const item = res.data.data?.[0];
  const pd = item?.priceDetails?.[0];
  const payload10 = {
      referenceId: item.referenceId,
      flightId: pd.flightId,
      ticketId: parseInt(pd.ticketId.split('~')[0], 10),
      fareId: parseInt(pd.ticketId.split('~')[1], 10),
      passenger: { adult: 1, child: 0, infant: 0 }
  };
  try {
      console.log('Trying with extracted fareId AND ticketId...', payload10);
      const rev10 = await axios.post(baseUrl + '/service/bookFlight', payload10, { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } });
      console.log('Success 10:', rev10.data);
  } catch(e) {
      console.log('Failed 10:', e.response?.data);
  }
})
.catch(console.error);
