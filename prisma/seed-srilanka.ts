import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Sri Lanka Visa data...');

  const srilanka = await prisma.visaCountry.upsert({
    where: { slug: 'sri-lanka' },
    update: {
      countryName: 'Sri Lanka',
      countryCode: 'LK',
      flagUrl: 'https://flagcdn.com/w320/lk.png',
      heroImage: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1920', // Sri Lanka landscape
      shortDescription: 'Apply for your Sri Lanka ETA online with fast 1-day processing, simple documentation, and hassle-free approval support for Indian travelers.',
      seoTitle: 'Apply Sri Lanka ETA Online for Indians | Fast ETA Approval',
      seoDescription: 'Apply for your Sri Lanka ETA online with fast processing, simple documentation, and hassle-free approval support for Indian travelers.',
      metaKeywords: 'sri lanka eta, sri lanka visa for indians, apply sri lanka eta online, sri lanka tourist visa, sri lanka e-visa, sri lanka entry permit, sri lanka online visa, sri lanka travel authorization',
      visaType: 'ETA (Electronic Travel Authorization)',
      processingTime: '1 Working Day',
      stayDuration: 'Up to 30 Days',
      validity: '180 Days from Issuance',
      startingPrice: 350,
      featured: true,
      active: true,
    },
    create: {
      countryName: 'Sri Lanka',
      slug: 'sri-lanka',
      countryCode: 'LK',
      flagUrl: 'https://flagcdn.com/w320/lk.png',
      heroImage: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1920',
      shortDescription: 'Apply for your Sri Lanka ETA online with fast 1-day processing, simple documentation, and hassle-free approval support for Indian travelers.',
      seoTitle: 'Apply Sri Lanka ETA Online for Indians | Fast ETA Approval',
      seoDescription: 'Apply for your Sri Lanka ETA online with fast processing, simple documentation, and hassle-free approval support for Indian travelers.',
      metaKeywords: 'sri lanka eta, sri lanka visa for indians, apply sri lanka eta online, sri lanka tourist visa, sri lanka e-visa, sri lanka entry permit, sri lanka online visa, sri lanka travel authorization',
      visaType: 'ETA (Electronic Travel Authorization)',
      processingTime: '1 Working Day',
      stayDuration: 'Up to 30 Days',
      validity: '180 Days from Issuance',
      startingPrice: 350,
      featured: true,
      active: true,
    },
  });

  // Clear existing related data for a clean update
  await prisma.visaPlan.deleteMany({ where: { countryId: srilanka.id } });
  await prisma.visaRequirement.deleteMany({ where: { countryId: srilanka.id } });
  await prisma.visaFAQ.deleteMany({ where: { countryId: srilanka.id } });
  await prisma.visaSEOContent.deleteMany({ where: { countryId: srilanka.id } });

  // Add Visa Plan
  await prisma.visaPlan.create({
    data: {
      countryId: srilanka.id,
      title: 'Sri Lanka ETA',
      badge: 'Fast Approval',
      visaType: 'ETA',
      entryType: 'Single Entry',
      visaFee: 350,
      serviceFee: 399,
      totalFee: 749,
      processingDays: 1,
      validity: '180 Days',
      stayDuration: '30 Days',
      featured: true,
    }
  });

  // Add Requirements
  await prisma.visaRequirement.createMany({
    data: [
      {
        countryId: srilanka.id,
        title: 'Passport Front Page',
        description: 'Clear scanned copy of passport front page with minimum 6 months validity from travel date.',
        required: true,
        sortOrder: 1,
      }
    ]
  });

  // Add SEO Content Blocks
  await prisma.visaSEOContent.createMany({
    data: [
      {
        countryId: srilanka.id,
        sectionTitle: 'What is Sri Lanka ETA?',
        sectionContent: 'Sri Lanka ETA (Electronic Travel Authorization) is an online travel authorization system that allows Indian travelers to visit Sri Lanka for tourism purposes without visiting an embassy.',
        sortOrder: 1,
      },
      {
        countryId: srilanka.id,
        sectionTitle: 'Sri Lanka ETA Processing Time',
        sectionContent: 'Most Sri Lanka ETA applications are processed within 1 working day, making it convenient for quick travel planning.',
        sortOrder: 2,
      },
      {
        countryId: srilanka.id,
        sectionTitle: 'Documents Required for Sri Lanka ETA',
        sectionContent: 'Applicants generally need a valid passport front page copy with at least 6 months validity to apply for the Sri Lanka ETA online.',
        sortOrder: 3,
      },
      {
        countryId: srilanka.id,
        sectionTitle: 'How to Apply for Sri Lanka ETA?',
        sectionContent: 'Upload your passport details, complete the online application form, and make the payment securely online. Once approved, your ETA will be sent digitally.',
        sortOrder: 4,
      },
      {
        countryId: srilanka.id,
        sectionTitle: 'Important Notes Before Travel',
        sectionContent: 'Travelers should carry printed copies of their approved Sri Lanka ETA and ensure their passport remains valid for at least 6 months from arrival date.',
        sortOrder: 5,
      }
    ]
  });

  // Add FAQs
  await prisma.visaFAQ.createMany({
    data: [
      {
        countryId: srilanka.id,
        question: 'Do Indians need ETA for Sri Lanka?',
        answer: 'Yes, Indian passport holders generally require a Sri Lanka ETA before traveling for tourism purposes.',
        sortOrder: 1,
      },
      {
        countryId: srilanka.id,
        question: 'What documents are required for Sri Lanka ETA?',
        answer: 'Applicants need a valid passport with at least 6 months validity from the intended travel date.',
        sortOrder: 2,
      },
      {
        countryId: srilanka.id,
        question: 'How long does Sri Lanka ETA processing take?',
        answer: 'Most Sri Lanka ETA applications are processed within 1 working day.',
        sortOrder: 3,
      },
      {
        countryId: srilanka.id,
        question: 'What is the validity of Sri Lanka ETA?',
        answer: 'The Sri Lanka ETA is generally valid for 180 days from issuance.',
        sortOrder: 4,
      },
      {
        countryId: srilanka.id,
        question: 'How long can I stay in Sri Lanka with ETA?',
        answer: 'Travelers can stay in Sri Lanka for up to 30 days with an approved ETA.',
        sortOrder: 5,
      },
      {
        countryId: srilanka.id,
        question: 'Can I extend my Sri Lanka ETA?',
        answer: 'Yes, travelers may apply for an extension while staying in Sri Lanka subject to immigration approval.',
        sortOrder: 6,
      },
      {
        countryId: srilanka.id,
        question: 'Do children need a separate Sri Lanka ETA?',
        answer: 'Yes, each traveler including children generally requires a separate ETA approval.',
        sortOrder: 7,
      },
      {
        countryId: srilanka.id,
        question: 'Should I carry a printout of my Sri Lanka ETA?',
        answer: 'Yes, travelers are advised to carry a printed copy of their approved ETA during travel and immigration checks.',
        sortOrder: 8,
      },
      {
        countryId: srilanka.id,
        question: 'Can I work in Sri Lanka with ETA?',
        answer: 'No, the Sri Lanka ETA issued for tourism purposes does not permit employment or work activities.',
        sortOrder: 9,
      },
      {
        countryId: srilanka.id,
        question: 'Can I correct mistakes in my Sri Lanka ETA application?',
        answer: 'Yes, corrections may be possible depending on the application status and immigration guidelines.',
        sortOrder: 10,
      }
    ]
  });

  console.log('Sri Lanka Visa data seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
