const http = require('http');

http.get('http://localhost:5000/v1/search/calendar?origin=DEL&destination=BOM&date=2026-05-13', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
