import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Thailand Visa data...');

  const thailand = await prisma.visaCountry.upsert({
    where: { slug: 'thailand' },
    update: {
      countryName: 'Thailand',
      countryCode: 'TH',
      flagUrl: 'https://flagcdn.com/w320/th.png',
      heroImage: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1920', // Bangkok/Thailand image
      shortDescription: 'Apply for your Thailand Digital Arrival Card (TDAC) online with quick processing, easy documentation, and smooth entry support for Indian travelers visiting Thailand.',
      seoTitle: 'Apply Thailand TDAC Online for Indians | Thailand Digital Arrival Card',
      seoDescription: 'Apply for your Thailand Digital Arrival Card (TDAC) online with quick processing, simple documentation, and smooth entry support for Indian travelers.',
      metaKeywords: 'thailand tdac, thailand digital arrival card, thailand visa for indians, thailand entry form, thailand tourist entry, thailand travel card, apply thailand tdac online, thailand online entry form, thailand visa online',
      visaType: 'Thailand Digital Arrival Card (TDAC)',
      processingTime: '1 Day',
      stayDuration: 'Up to 60 Days',
      validity: '90 Days from Issuance',
      startingPrice: 399,
      featured: true,
      active: true,
    },
    create: {
      countryName: 'Thailand',
      slug: 'thailand',
      countryCode: 'TH',
      flagUrl: 'https://flagcdn.com/w320/th.png',
      heroImage: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1920',
      shortDescription: 'Apply for your Thailand Digital Arrival Card (TDAC) online with quick processing, easy documentation, and smooth entry support for Indian travelers visiting Thailand.',
      seoTitle: 'Apply Thailand TDAC Online for Indians | Thailand Digital Arrival Card',
      seoDescription: 'Apply for your Thailand Digital Arrival Card (TDAC) online with quick processing, simple documentation, and smooth entry support for Indian travelers.',
      metaKeywords: 'thailand tdac, thailand digital arrival card, thailand visa for indians, thailand entry form, thailand tourist entry, thailand travel card, apply thailand tdac online, thailand online entry form, thailand visa online',
      visaType: 'Thailand Digital Arrival Card (TDAC)',
      processingTime: '1 Day',
      stayDuration: 'Up to 60 Days',
      validity: '90 Days from Issuance',
      startingPrice: 399,
      featured: true,
      active: true,
    },
  });

  // Clear existing related data for a clean update
  await prisma.visaPlan.deleteMany({ where: { countryId: thailand.id } });
  await prisma.visaRequirement.deleteMany({ where: { countryId: thailand.id } });
  await prisma.visaFAQ.deleteMany({ where: { countryId: thailand.id } });
  await prisma.visaSEOContent.deleteMany({ where: { countryId: thailand.id } });

  // Add Visa Plans
  await prisma.visaPlan.create({
    data: {
      countryId: thailand.id,
      title: 'Thailand TDAC',
      badge: 'Fast Approval',
      visaType: 'Digital Arrival Card (TDAC)',
      entryType: 'Single Entry',
      visaFee: 399,
      serviceFee: 399,
      totalFee: 798,
      processingDays: 1,
      validity: '90 Days',
      stayDuration: '60 Days',
      featured: true,
    }
  });

  // Add Requirements
  await prisma.visaRequirement.createMany({
    data: [
      {
        countryId: thailand.id,
        title: 'Passport Copy',
        description: 'Clear scanned copy of passport with at least 6 months validity from the travel date.',
        required: true,
        sortOrder: 1,
      },
      {
        countryId: thailand.id,
        title: 'Passport Size Photo',
        description: 'Recent passport-size photograph with white background.',
        required: false,
        sortOrder: 2,
      },
      {
        countryId: thailand.id,
        title: 'Flight Ticket',
        description: 'Confirmed return or onward flight ticket details.',
        required: false,
        sortOrder: 3,
      },
      {
        countryId: thailand.id,
        title: 'Hotel Booking',
        description: 'Proof of accommodation or hotel reservation in Thailand.',
        required: false,
        sortOrder: 4,
      }
    ]
  });

  // Add SEO Content Blocks
  await prisma.visaSEOContent.createMany({
    data: [
      {
        countryId: thailand.id,
        sectionTitle: 'What is Thailand Digital Arrival Card (TDAC)?',
        sectionContent: 'Thailand Digital Arrival Card (TDAC) is an online travel entry registration system for travelers visiting Thailand. It simplifies immigration procedures and helps travelers complete entry formalities before arrival.',
        sortOrder: 1,
      },
      {
        countryId: thailand.id,
        sectionTitle: 'Thailand TDAC Processing Time',
        sectionContent: 'Most Thailand TDAC applications are processed within 35 minutes, making it ideal for quick and hassle-free travel planning.',
        sortOrder: 2,
      },
      {
        countryId: thailand.id,
        sectionTitle: 'Documents Required for Thailand TDAC',
        sectionContent: 'Applicants generally need a valid passport copy and travel details to complete the Thailand Digital Arrival Card application online.',
        sortOrder: 3,
      },
      {
        countryId: thailand.id,
        sectionTitle: 'How to Apply for Thailand TDAC?',
        sectionContent: 'Upload your passport details, complete the online application form, and submit your travel information. Once approved, your Thailand Digital Arrival Card will be sent digitally.',
        sortOrder: 4,
      },
      {
        countryId: thailand.id,
        sectionTitle: 'Important Notes Before Travel',
        sectionContent: 'Travelers should complete the Thailand Digital Arrival Card before arrival in Thailand and carry a digital or printed copy during immigration checks.',
        sortOrder: 5,
      }
    ]
  });

  // Add FAQs
  await prisma.visaFAQ.createMany({
    data: [
      {
        countryId: thailand.id,
        question: 'Do Indians need a visa for Thailand?',
        answer: 'Indian travelers may qualify for visa-free or simplified entry depending on current Thailand immigration policies. However, completing the Thailand Digital Arrival Card (TDAC) may still be required before travel.',
        sortOrder: 1,
      },
      {
        countryId: thailand.id,
        question: 'What is the Thailand Digital Arrival Card (TDAC)?',
        answer: 'The Thailand Digital Arrival Card is an online travel entry registration system that travelers complete before arriving in Thailand.',
        sortOrder: 2,
      },
      {
        countryId: thailand.id,
        question: 'How long does Thailand TDAC processing take?',
        answer: 'Most TDAC applications are processed within approximately 35 minutes after submission.',
        sortOrder: 3,
      },
      {
        countryId: thailand.id,
        question: 'What documents are required for Thailand TDAC?',
        answer: 'Travelers generally need a valid passport and basic travel details to complete the Thailand Digital Arrival Card application.',
        sortOrder: 4,
      },
      {
        countryId: thailand.id,
        question: 'Do Indians need travel insurance for Thailand?',
        answer: 'Travel insurance may not always be mandatory, but it is strongly recommended for medical emergencies and unexpected travel issues.',
        sortOrder: 5,
      },
      {
        countryId: thailand.id,
        question: 'Do Indians need hotel bookings for Thailand travel?',
        answer: 'Hotel reservations may be requested by immigration authorities as proof of accommodation during your stay in Thailand.',
        sortOrder: 6,
      },
      {
        countryId: thailand.id,
        question: 'Can I modify my TDAC details after submission?',
        answer: 'Yes, certain details may be editable before travel depending on the submission status and immigration guidelines.',
        sortOrder: 7,
      },
      {
        countryId: thailand.id,
        question: 'What happens if I forget to complete the TDAC before arrival?',
        answer: 'Travelers who fail to complete the Thailand Digital Arrival Card before arrival may face delays during immigration processing.',
        sortOrder: 8,
      },
      {
        countryId: thailand.id,
        question: 'Do children need a separate Thailand TDAC?',
        answer: 'Yes, each traveler including children may require an individual Thailand Digital Arrival Card submission.',
        sortOrder: 9,
      },
      {
        countryId: thailand.id,
        question: 'Can I work in Thailand during my tourist stay?',
        answer: 'No, tourism-based entry permissions do not allow employment or work activities in Thailand.',
        sortOrder: 10,
      }
    ]
  });

  console.log('Thailand Visa data seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
