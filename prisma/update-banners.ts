import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Updating banner images to match frontend assets...');

  const baseUrl = 'http://localhost:5173'; // Assuming Vite default port

  const banners = await prisma.promoBanner.findMany();

  for (const banner of banners) {
    let newUrl = '';
    if (banner.title.includes('New User')) newUrl = `${baseUrl}/deals/Layer%200%201.png`;
    else if (banner.title.includes('Duo')) newUrl = `${baseUrl}/deals/Layer%200%202.png`;
    else if (banner.title.includes('Win Free')) newUrl = `${baseUrl}/deals/njndndnnd%201.png`;
    else if (banner.title.includes('13% OFF')) newUrl = `${baseUrl}/deals/Offers%201%20(1).png`;
    else if (banner.title.includes('Pay What You See')) newUrl = `${baseUrl}/deals/Layer%200%203%20(1).png`;
    else if (banner.title.includes('Deal of the Day')) newUrl = `${baseUrl}/deals/make%201.png`;

    if (newUrl) {
      await prisma.promoBanner.update({
        where: { id: banner.id },
        data: { imageUrl: newUrl }
      });
      console.log(`Updated banner: ${banner.title} -> ${newUrl}`);
    }
  }

  // Add missing ones if they don't exist
  const existingTitles = banners.map(b => b.title);
  
  if (!existingTitles.some(t => t.includes('Pay What You See'))) {
     const p1 = await prisma.promoCode.findUnique({ where: { code: 'FTFIRSTFLY' } });
     if (p1) {
        await prisma.promoBanner.create({
            data: {
                title: 'Pay What You See',
                subtitle: 'Pay Zero Convenience Fee On Flights Just Use Code',
                imageUrl: `${baseUrl}/deals/Layer 0 3 (1).png`,
                promoCodeId: p1.id,
                startDate: new Date(),
                endDate: new Date('2026-12-31'),
                displayOrder: 5
            }
        });
     }
  }

  if (!existingTitles.some(t => t.includes('Deal of the Day'))) {
     const p1 = await prisma.promoCode.findUnique({ where: { code: 'FTFIRSTFLY' } });
     if (p1) {
        await prisma.promoBanner.create({
            data: {
                title: 'Deal of the Day',
                subtitle: 'Enjoy Different Deals Each Day with Fast Trip',
                imageUrl: `${baseUrl}/deals/make 1.png`,
                promoCodeId: p1.id,
                startDate: new Date(),
                endDate: new Date('2026-12-31'),
                displayOrder: 6
            }
        });
     }
  }

  console.log('Update complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
