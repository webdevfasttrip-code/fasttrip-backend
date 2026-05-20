
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ref = 'FS340002990';
  console.log(`Searching for ${ref}...`);

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { bookingRef: ref },
        { pnr: ref },
        { supplierOfferId: ref },
        {
          selectedFlightData: {
            path: ['bookingRef'],
            equals: ref,
          },
        },
      ],
    },
    include: {
      passengers: true,
      logs: true,
    },
  });

  if (booking) {
    console.log('FOUND BOOKING:', JSON.stringify(booking, null, 2));
  } else {
    console.log('Booking not found in database.');
    
    // Try activity logs
    const activities = await prisma.userActivity.findMany({
      where: {
        OR: [
            { description: { contains: ref } },
            { metadata: { path: ['bookingRef'], equals: ref } }
        ]
      }
    });
    console.log('ACTIVITIES:', JSON.stringify(activities, null, 2));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
