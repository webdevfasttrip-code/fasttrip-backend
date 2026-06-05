require('dotenv').config();
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

async function test() {
  try {
    let credentials = undefined;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (credentials && credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
    }
    const client = new DocumentProcessorServiceClient({
      credentials,
      apiEndpoint: 'asia-south1-documentai.googleapis.com',
    });
    console.log('Client initialized');
    
    const name = `projects/443723300452/locations/asia-south1/processors/9d7c23970cd4020c`;
    console.log('Target:', name);
    // Send a real request but empty image
    const request = { name, rawDocument: { content: 'dGVzdA==', mimeType: 'text/plain' } };
    const [result] = await client.processDocument(request);
    console.log('SUCCESS', result);
  } catch (e) {
    console.error('ERROR MESSAGE:', e.message);
  }
}
test();
