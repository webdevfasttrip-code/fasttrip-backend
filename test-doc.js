require('dotenv').config();
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
async function test() {
  try {
    let credentials = undefined;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }
    const client = new DocumentProcessorServiceClient({
      credentials,
      apiEndpoint: 'asia-south1-documentai.googleapis.com',
    });
    console.log('Client initialized');
    
    // Check processor
    const name = `projects/443723300452/locations/asia-south1/processors/9d7c23970cd4020c`;
    console.log('Target:', name);
    const request = { name, rawDocument: { content: 'dGVzdA==', mimeType: 'text/plain' } };
    await client.processDocument(request);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
test();
