import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Dashboard Data (Users, Bookings, Revenue)...');

  // 1. Create Dummy Users
  const users = [
    { email: 'user1@example.com', name: 'John Doe', phone: '9876543210' },
    { email: 'user2@example.com', name: 'Jane Smith', phone: '9876543211' },
    { email: 'user3@example.com', name: 'Bob Wilson', phone: '9876543212' },
  ];

  for (const u of users) {
    await (prisma as any).user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        password: 'password123', // Dummy
        role: 'USER',
        provider: 'LOCAL'
      }
    });
  }

  const seededUsers = await (prisma as any).user.findMany({ take: 3 });

  // 2. Create Dummy Bookings
  const bookings = [
    {
      bookingRef: 'FT' + Math.random().toString(36).substring(7).toUpperCase(),
      totalAmount: 12500,
      bookingStatus: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.SUCCESS,
      origin: 'DEL',
      destination: 'BOM',
      airlineCode: '6E',
      airlineName: 'IndiGo',
      pnr: 'PNR123',
      userId: seededUsers[0].id,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      bookingRef: 'FT' + Math.random().toString(36).substring(7).toUpperCase(),
      totalAmount: 8400,
      bookingStatus: BookingStatus.TICKETED,
      paymentStatus: PaymentStatus.SUCCESS,
      origin: 'BLR',
      destination: 'DEL',
      airlineCode: 'AI',
      airlineName: 'Air India',
      pnr: 'PNR456',
      userId: seededUsers[1].id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      bookingRef: 'FT' + Math.random().toString(36).substring(7).toUpperCase(),
      totalAmount: 5200,
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.INITIATED,
      origin: 'MAA',
      destination: 'HYD',
      airlineCode: 'SG',
      airlineName: 'SpiceJet',
      userId: seededUsers[2].id,
      createdAt: new Date(),
    }
  ];

  for (const b of bookings) {
    await (prisma as any).booking.create({
      data: b
    });
  }

  console.log('Dashboard data seeded successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
