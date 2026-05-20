
import { PrismaClient } from '@prisma/client';
import { MVFDProvider } from '../src/flights/providers/flights/mvfd.provider';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from parent dir
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const provider = new MVFDProvider();
  const ref = 'FS340002990';
  
  console.log(`Fetching details for bookingRef: ${ref} from supplier...`);
  
  try {
    const details = await provider.getBookingDetails({
      bookingRef: ref,
      // userId is required by the provider for logging but not strictly for the API call in some adapters
      userId: 'SYSTEM' 
    });
    
    console.log('SUPPLIER DETAILS:', JSON.stringify(details, null, 2));
  } catch (err) {
    console.error('Failed to fetch details:', err.message);
    if (err.response) {
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

main();
