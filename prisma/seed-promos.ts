import { PrismaClient, DiscountType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding promos and banners...');

  // 1. Create Promo Codes
  const p1 = await prisma.promoCode.upsert({
    where: { code: 'FTFIRSTFLY' },
    update: {},
    create: {
      code: 'FTFIRSTFLY',
      name: 'New User Offer',
      description: 'Get Discount on Booking Your First Flight with Us',
      discountType: DiscountType.FLAT,
      discountValue: 500,
      minBookingAmount: 2000,
      bookingEndDate: new Date('2026-12-31'),
      totalUsageLimit: 1000,
      status: true,
    },
  });

  const p2 = await prisma.promoCode.upsert({
    where: { code: 'FTFREEFLY' },
    update: {},
    create: {
      code: 'FTFREEFLY',
      name: 'Win Free Flight',
      description: 'Get Discount on Booking Your First Flight with Us',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 100,
      minBookingAmount: 5000,
      maxDiscountCap: 5000,
      bookingEndDate: new Date('2026-12-31'),
      totalUsageLimit: 10,
      status: true,
    },
  });

  const p3 = await prisma.promoCode.upsert({
    where: { code: 'FTBAZAAR' },
    update: {},
    create: {
      code: 'FTBAZAAR',
      name: 'Up to 13% OFF*',
      description: 'Get Up to 13% off on Flights On Travel Bazaar Sale',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 13,
      minBookingAmount: 1000,
      maxDiscountCap: 2000,
      bookingEndDate: new Date('2026-12-31'),
      totalUsageLimit: 5000,
      status: true,
    },
  });

  // 2. Create Banners
  const banners = [
    {
        title: 'New User Offer',
        subtitle: 'Get Discount on Booking Your First Flight with Us',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
        promoCodeId: p1.id,
        startDate: new Date(),
        endDate: new Date('2026-12-31'),
        displayOrder: 1
    },
    {
        title: 'Duo Flight Deal',
        subtitle: '2 is always Better Than One, Book a flight for 2',
        imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=800',
        promoCodeId: p1.id,
        startDate: new Date(),
        endDate: new Date('2026-12-31'),
        displayOrder: 2
    },
    {
        title: 'Win Free Flight',
        subtitle: 'Get Discount on Booking Your First Flight with Us',
        imageUrl: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=800',
        promoCodeId: p2.id,
        startDate: new Date(),
        endDate: new Date('2026-12-31'),
        displayOrder: 3
    },
    {
        title: 'Up to 13% OFF*',
        subtitle: 'Get Up to 13% off on Flights On Travel Bazaar Sale',
        imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800',
        promoCodeId: p3.id,
        startDate: new Date(),
        endDate: new Date('2026-12-31'),
        displayOrder: 4
    }
  ];

  for (const b of banners) {
    await prisma.promoBanner.create({ data: b });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
