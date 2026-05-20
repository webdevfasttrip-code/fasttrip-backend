import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting full data recovery (Airports & Airlines)...');

  const airports = [
    { iataCode: 'DEL', airportName: 'Indira Gandhi International Airport', city: 'Delhi', isoCountry: 'IN', latitude: 28.5562, longitude: 77.1000, continent: 'AS', isoRegion: 'IN-DL' },
    { iataCode: 'BOM', airportName: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', isoCountry: 'IN', latitude: 19.0896, longitude: 72.8656, continent: 'AS', isoRegion: 'IN-MH' },
    { iataCode: 'BLR', airportName: 'Kempegowda International Airport', city: 'Bengaluru', isoCountry: 'IN', latitude: 13.1986, longitude: 77.7066, continent: 'AS', isoRegion: 'IN-KA' },
    { iataCode: 'MAA', airportName: 'Chennai International Airport', city: 'Chennai', isoCountry: 'IN', latitude: 12.9941, longitude: 80.1708, continent: 'AS', isoRegion: 'IN-TN' },
    { iataCode: 'CCU', airportName: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata', isoCountry: 'IN', latitude: 22.6547, longitude: 88.4467, continent: 'AS', isoRegion: 'IN-WB' },
    { iataCode: 'HYD', airportName: 'Rajiv Gandhi International Airport', city: 'Hyderabad', isoCountry: 'IN', latitude: 17.2403, longitude: 78.4294, continent: 'AS', isoRegion: 'IN-TG' },
    { iataCode: 'AMD', airportName: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', isoCountry: 'IN', latitude: 23.0772, longitude: 72.6347, continent: 'AS', isoRegion: 'IN-GJ' },
    { iataCode: 'COK', airportName: 'Cochin International Airport', city: 'Kochi', isoCountry: 'IN', latitude: 10.1520, longitude: 76.4019, continent: 'AS', isoRegion: 'IN-KL' },
    { iataCode: 'GOI', airportName: 'Dabolim Airport', city: 'Goa', isoCountry: 'IN', latitude: 15.3808, longitude: 73.8314, continent: 'AS', isoRegion: 'IN-GA' },
    { iataCode: 'GOX', airportName: 'Manohar International Airport', city: 'Mopa', isoCountry: 'IN', latitude: 15.7667, longitude: 73.8667, continent: 'AS', isoRegion: 'IN-GA' },
    { iataCode: 'PNQ', airportName: 'Pune Airport', city: 'Pune', isoCountry: 'IN', latitude: 18.5822, longitude: 73.9197, continent: 'AS', isoRegion: 'IN-MH' },
    { iataCode: 'LKO', airportName: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', isoCountry: 'IN', latitude: 26.7606, longitude: 80.8893, continent: 'AS', isoRegion: 'IN-UP' },
    { iataCode: 'JAI', airportName: 'Jaipur International Airport', city: 'Jaipur', isoCountry: 'IN', latitude: 26.8242, longitude: 75.8122, continent: 'AS', isoRegion: 'IN-RJ' },
    { iataCode: 'TRV', airportName: 'Thiruvananthapuram International Airport', city: 'Thiruvananthapuram', isoCountry: 'IN', latitude: 8.4821, longitude: 76.9200, continent: 'AS', isoRegion: 'IN-KL' },
    { iataCode: 'IXC', airportName: 'Chandigarh Airport', city: 'Chandigarh', isoCountry: 'IN', latitude: 30.6735, longitude: 76.7885, continent: 'AS', isoRegion: 'IN-CH' },
    { iataCode: 'IXJ', airportName: 'Jammu Airport', city: 'Jammu', isoCountry: 'IN', latitude: 32.6897, longitude: 74.8375, continent: 'AS', isoRegion: 'IN-JK' },
    { iataCode: 'SXR', airportName: 'Srinagar International Airport', city: 'Srinagar', isoCountry: 'IN', latitude: 33.9873, longitude: 74.7744, continent: 'AS', isoRegion: 'IN-JK' },
    { iataCode: 'VTZ', airportName: 'Visakhapatnam Airport', city: 'Visakhapatnam', isoCountry: 'IN', latitude: 17.7212, longitude: 83.2245, continent: 'AS', isoRegion: 'IN-AP' },
    { iataCode: 'PAT', airportName: 'Jay Prakash Narayan International Airport', city: 'Patna', isoCountry: 'IN', latitude: 25.5912, longitude: 85.0879, continent: 'AS', isoRegion: 'IN-BR' },
    { iataCode: 'BBI', airportName: 'Biju Patnaik International Airport', city: 'Bhubaneswar', isoCountry: 'IN', latitude: 20.2444, longitude: 85.8178, continent: 'AS', isoRegion: 'IN-OR' },
    { iataCode: 'IDR', airportName: 'Devi Ahilyabai Holkar International Airport', city: 'Indore', isoCountry: 'IN', latitude: 22.7217, longitude: 75.8011, continent: 'AS', isoRegion: 'IN-MP' },
    { iataCode: 'NAG', airportName: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur', isoCountry: 'IN', latitude: 21.0922, longitude: 79.0583, continent: 'AS', isoRegion: 'IN-MH' },
    { iataCode: 'VNS', airportName: 'Lal Bahadur Shastri International Airport', city: 'Varanasi', isoCountry: 'IN', latitude: 25.4522, longitude: 82.8592, continent: 'AS', isoRegion: 'IN-UP' },
    { iataCode: 'GAU', airportName: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', isoCountry: 'IN', latitude: 26.1061, longitude: 91.5859, continent: 'AS', isoRegion: 'IN-AS' },
    { iataCode: 'IXB', airportName: 'Bagdogra International Airport', city: 'Siliguri', isoCountry: 'IN', latitude: 26.6812, longitude: 88.3286, continent: 'AS', isoRegion: 'IN-WB' },
    { iataCode: 'IXZ', airportName: 'Veer Savarkar International Airport', city: 'Port Blair', isoCountry: 'IN', latitude: 11.6410, longitude: 92.7297, continent: 'AS', isoRegion: 'IN-AN' },
    { iataCode: 'IMF', airportName: 'Imphal International Airport', city: 'Imphal', isoCountry: 'IN', latitude: 24.7600, longitude: 93.8967, continent: 'AS', isoRegion: 'IN-MN' },
    { iataCode: 'RPR', airportName: 'Swami Vivekananda Airport', city: 'Raipur', isoCountry: 'IN', latitude: 21.1804, longitude: 81.7387, continent: 'AS', isoRegion: 'IN-CT' },
    { iataCode: 'IXE', airportName: 'Mangalore International Airport', city: 'Mangaluru', isoCountry: 'IN', latitude: 12.9613, longitude: 74.8891, continent: 'AS', isoRegion: 'IN-KA' },
    { iataCode: 'TRZ', airportName: 'Tiruchirappalli International Airport', city: 'Tiruchirappalli', isoCountry: 'IN', latitude: 10.7654, longitude: 78.7097, continent: 'AS', isoRegion: 'IN-TN' },
    { iataCode: 'CJB', airportName: 'Coimbatore International Airport', city: 'Coimbatore', isoCountry: 'IN', latitude: 11.0300, longitude: 77.0434, continent: 'AS', isoRegion: 'IN-TN' },
    { iataCode: 'IXR', airportName: 'Birsa Munda Airport', city: 'Ranchi', isoCountry: 'IN', latitude: 23.3143, longitude: 85.3218, continent: 'AS', isoRegion: 'IN-JH' },
    { iataCode: 'DXB', airportName: 'Dubai International Airport', city: 'Dubai', isoCountry: 'AE', latitude: 25.2532, longitude: 55.3657, continent: 'AS', isoRegion: 'AE-DU' },
    { iataCode: 'SIN', airportName: 'Singapore Changi Airport', city: 'Singapore', isoCountry: 'SG', latitude: 1.3644, longitude: 103.9915, continent: 'AS', isoRegion: 'SG-01' },
    { iataCode: 'LHR', airportName: 'London Heathrow Airport', city: 'London', isoCountry: 'GB', latitude: 51.4700, longitude: -0.4543, continent: 'EU', isoRegion: 'GB-ENG' },
    { iataCode: 'BKK', airportName: 'Suvarnabhumi Airport', city: 'Bangkok', isoCountry: 'TH', latitude: 13.6811, longitude: 100.7473, continent: 'AS', isoRegion: 'TH-10' },
    { iataCode: 'JFK', airportName: 'John F. Kennedy International Airport', city: 'New York', isoCountry: 'US', latitude: 40.6413, longitude: -73.7781, continent: 'NA', isoRegion: 'US-NY' },
    { iataCode: 'CDG', airportName: 'Charles de Gaulle Airport', city: 'Paris', isoCountry: 'FR', latitude: 49.0097, longitude: 2.5479, continent: 'EU', isoRegion: 'FR-IDF' },
    { iataCode: 'DOH', airportName: 'Hamad International Airport', city: 'Doha', isoCountry: 'QA', latitude: 25.2731, longitude: 51.6081, continent: 'AS', isoRegion: 'QA-DA' },
    { iataCode: 'KUL', airportName: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', isoCountry: 'MY', latitude: 2.7456, longitude: 101.7072, continent: 'AS', isoRegion: 'MY-10' },
    { iataCode: 'HKG', airportName: 'Hong Kong International Airport', city: 'Hong Kong', isoCountry: 'HK', latitude: 22.3089, longitude: 113.9145, continent: 'AS', isoRegion: 'HK-HK' },
    { iataCode: 'AUH', airportName: 'Abu Dhabi International Airport', city: 'Abu Dhabi', isoCountry: 'AE', latitude: 24.4330, longitude: 54.6511, continent: 'AS', isoRegion: 'AE-AZ' },
    { iataCode: 'CMB', airportName: 'Bandaranaike International Airport', city: 'Colombo', isoCountry: 'LK', latitude: 7.1808, longitude: 79.8837, continent: 'AS', isoRegion: 'LK-1' },
    { iataCode: 'MLE', airportName: 'Velana International Airport', city: 'Male', isoCountry: 'MV', latitude: 4.1918, longitude: 73.5291, continent: 'AS', isoRegion: 'MV-00' },
  ];

  console.log(`Seeding ${airports.length} airports...`);
  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode }, // This is a trick because we don't have a unique field other than id, and we want to create if not exists
      // Better: we can't easily upsert without a unique field in Prisma if we don't have the ID.
      // Since we know the table is empty, we can just create.
      create: airport as any,
      update: {}
    }).catch(async (e) => {
       // If upsert fails because of ID, just try to create
       await prisma.airport.create({ data: airport as any });
    });
  }

  const airlines = [
    { iata: '6E', name: 'IndiGo', logo_png_url: 'https://images.fasttrip.id/airlines/6E.png' },
    { iata: 'AI', name: 'Air India', logo_png_url: 'https://images.fasttrip.id/airlines/AI.png' },
    { iata: 'UK', name: 'Vistara', logo_png_url: 'https://images.fasttrip.id/airlines/UK.png' },
    { iata: 'QP', name: 'Akasa Air', logo_png_url: 'https://images.fasttrip.id/airlines/QP.png' },
    { iata: 'SG', name: 'SpiceJet', logo_png_url: 'https://images.fasttrip.id/airlines/SG.png' },
    { iata: 'I5', name: 'Air Asia India', logo_png_url: 'https://images.fasttrip.id/airlines/I5.png' },
    { iata: 'G8', name: 'Go First', logo_png_url: 'https://images.fasttrip.id/airlines/G8.png' },
    { iata: 'EK', name: 'Emirates', logo_png_url: 'https://images.fasttrip.id/airlines/EK.png' },
    { iata: 'QR', name: 'Qatar Airways', logo_png_url: 'https://images.fasttrip.id/airlines/QR.png' },
    { iata: 'EY', name: 'Etihad Airways', logo_png_url: 'https://images.fasttrip.id/airlines/EY.png' },
    { iata: 'SQ', name: 'Singapore Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/SQ.png' },
    { iata: 'LH', name: 'Lufthansa', logo_png_url: 'https://images.fasttrip.id/airlines/LH.png' },
    { iata: 'BA', name: 'British Airways', logo_png_url: 'https://images.fasttrip.id/airlines/BA.png' },
    { iata: 'AF', name: 'Air France', logo_png_url: 'https://images.fasttrip.id/airlines/AF.png' },
    { iata: 'KL', name: 'KLM', logo_png_url: 'https://images.fasttrip.id/airlines/KL.png' },
    { iata: 'TK', name: 'Turkish Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/TK.png' },
    { iata: 'CX', name: 'Cathay Pacific', logo_png_url: 'https://images.fasttrip.id/airlines/CX.png' },
    { iata: 'TG', name: 'Thai Airways', logo_png_url: 'https://images.fasttrip.id/airlines/TG.png' },
    { iata: 'MH', name: 'Malaysia Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/MH.png' },
    { iata: 'UL', name: 'SriLankan Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/UL.png' },
    { iata: 'FZ', name: 'flydubai', logo_png_url: 'https://images.fasttrip.id/airlines/FZ.png' },
    { iata: 'G9', name: 'Air Arabia', logo_png_url: 'https://images.fasttrip.id/airlines/G9.png' },
    { iata: 'IX', name: 'Air India Express', logo_png_url: 'https://images.fasttrip.id/airlines/IX.png' },
    { iata: 'AA', name: 'American Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/AA.png' },
    { iata: 'DL', name: 'Delta Air Lines', logo_png_url: 'https://images.fasttrip.id/airlines/DL.png' },
    { iata: 'UA', name: 'United Airlines', logo_png_url: 'https://images.fasttrip.id/airlines/UA.png' },
  ];

  console.log(`Seeding ${airlines.length} airlines...`);
  for (const airline of airlines) {
    await (prisma as any).airline.upsert({
      where: { iata: airline.iata },
      update: airline,
      create: airline
    });
  }

  console.log('Data recovery completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
