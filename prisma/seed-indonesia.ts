import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Indonesia Visa data...');

  const indonesia = await prisma.visaCountry.upsert({
    where: { slug: 'indonesia' },
    update: {
      countryName: 'Indonesia',
      countryCode: 'ID',
      flagUrl: 'https://flagcdn.com/w320/id.png',
      heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1920', // Bali/Indonesia image
      shortDescription: 'Apply for your Indonesia E-Visa online with fast 1-day processing, simple documentation, and smooth approval support for Indian travelers visiting Bali and Indonesia.',
      seoTitle: 'Apply Indonesia E-Visa Online for Indians | Bali Visa in 1 Day',
      seoDescription: 'Apply for your Indonesia or Bali E-Visa online with fast 1-day processing, secure application, and expert support for Indian travelers.',
      metaKeywords: 'indonesia visa, bali visa for indians, indonesia e-visa, apply indonesia visa online, bali e-visa, indonesia tourist visa, indonesia visa for indians, bali travel visa, online indonesia visa',
      visaType: 'E-Visa',
      processingTime: '1 Working Day',
      stayDuration: 'Up to 30 Days',
      validity: '90 Days from Issuance',
      startingPrice: 2950,
      featured: true,
      active: true,
    },
    create: {
      countryName: 'Indonesia',
      slug: 'indonesia',
      countryCode: 'ID',
      flagUrl: 'https://flagcdn.com/w320/id.png',
      heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1920',
      shortDescription: 'Apply for your Indonesia E-Visa online with fast 1-day processing, simple documentation, and smooth approval support for Indian travelers visiting Bali and Indonesia.',
      seoTitle: 'Apply Indonesia E-Visa Online for Indians | Bali Visa in 1 Day',
      seoDescription: 'Apply for your Indonesia or Bali E-Visa online with fast 1-day processing, secure application, and expert support for Indian travelers.',
      metaKeywords: 'indonesia visa, bali visa for indians, indonesia e-visa, apply indonesia visa online, bali e-visa, indonesia tourist visa, indonesia visa for indians, bali travel visa, online indonesia visa',
      visaType: 'E-Visa',
      processingTime: '1 Working Day',
      stayDuration: 'Up to 30 Days',
      validity: '90 Days from Issuance',
      startingPrice: 2950,
      featured: true,
      active: true,
    },
  });

  // Clear existing related data for a clean update
  await prisma.visaPlan.deleteMany({ where: { countryId: indonesia.id } });
  await prisma.visaRequirement.deleteMany({ where: { countryId: indonesia.id } });
  await prisma.visaFAQ.deleteMany({ where: { countryId: indonesia.id } });
  await prisma.visaSEOContent.deleteMany({ where: { countryId: indonesia.id } });

  // Add Visa Plans
  await prisma.visaPlan.create({
    data: {
      countryId: indonesia.id,
      title: 'Indonesia E-Visa',
      badge: 'Fast Approval',
      visaType: 'E-Visa',
      entryType: 'Single Entry',
      visaFee: 2950,
      serviceFee: 995,
      totalFee: 3945,
      processingDays: 1,
      validity: '90 Days',
      stayDuration: '30 Days',
      featured: true,
    }
  });

  // Add Requirements
  await prisma.visaRequirement.createMany({
    data: [
      {
        countryId: indonesia.id,
        title: 'Passport Copy',
        description: 'Clear scanned copy of passport with minimum 6 months validity from the application date.',
        required: true,
        sortOrder: 1,
      },
      {
        countryId: indonesia.id,
        title: 'Passport Size Photo',
        description: 'Recent passport-size photograph with white background.',
        required: true,
        sortOrder: 2,
      }
    ]
  });

  // Add SEO Content Blocks
  await prisma.visaSEOContent.createMany({
    data: [
      {
        countryId: indonesia.id,
        sectionTitle: 'Why Choose Our Indonesia Visa Service?',
        sectionContent: 'Get your Indonesia or Bali E-Visa processed quickly with a simple online application process, transparent pricing, fast approvals, and dedicated support for Indian travelers.',
        sortOrder: 1,
      },
      {
        countryId: indonesia.id,
        sectionTitle: 'Indonesia Visa Processing Time',
        sectionContent: 'Most Indonesia E-Visas are processed within 1 working day, making it ideal for last-minute travel plans to Bali and other Indonesian destinations.',
        sortOrder: 2,
      },
      {
        countryId: indonesia.id,
        sectionTitle: 'Documents Required for Indonesia Visa',
        sectionContent: 'Applicants need a valid passport copy with at least 6 months validity and a recent passport-size photograph to apply for the Indonesia E-Visa online.',
        sortOrder: 3,
      },
      {
        countryId: indonesia.id,
        sectionTitle: 'How to Apply for Indonesia Visa?',
        sectionContent: 'Upload your passport copy, complete the online application, and pay securely online. Once approved, your Indonesia E-Visa will be delivered digitally for download.',
        sortOrder: 4,
      },
      {
        countryId: indonesia.id,
        sectionTitle: 'Important Notes Before Travel',
        sectionContent: 'Your passport must have at least 6 months validity from the application date and contain at least one blank page for immigration purposes.',
        sortOrder: 5,
      }
    ]
  });

  // Add FAQs
  await prisma.visaFAQ.createMany({
    data: [
      {
        countryId: indonesia.id,
        question: 'Can Indian citizens apply for an Indonesia E-Visa online?',
        answer: 'Yes, Indian passport holders can apply for an Indonesia E-Visa completely online without visiting the embassy.',
        sortOrder: 1,
      },
      {
        countryId: indonesia.id,
        question: 'How long does Indonesia visa processing take?',
        answer: 'Most Indonesia E-Visas are processed within 1 working day after successful application submission.',
        sortOrder: 2,
      },
      {
        countryId: indonesia.id,
        question: 'What documents are required for Indonesia visa?',
        answer: 'You need a valid passport copy with at least 6 months validity and a recent passport-size photograph.',
        sortOrder: 3,
      },
      {
        countryId: indonesia.id,
        question: 'What is the validity of an Indonesia E-Visa?',
        answer: 'The Indonesia E-Visa is generally valid for 90 days from issuance.',
        sortOrder: 4,
      },
      {
        countryId: indonesia.id,
        question: 'How long can I stay in Indonesia with an E-Visa?',
        answer: 'Travelers can stay in Indonesia for up to 30 days with the approved E-Visa.',
        sortOrder: 5,
      },
      {
        countryId: indonesia.id,
        question: 'Can I apply for an Indonesia E-Visa with an expiring passport?',
        answer: 'No, your passport must be valid for at least 6 months from the date of application to qualify for an Indonesia E-Visa.',
        sortOrder: 6,
      },
      {
        countryId: indonesia.id,
        question: 'Is the Indonesia E-Visa single entry or multiple entry?',
        answer: 'This Indonesia E-Visa is issued as a single-entry visa for tourism purposes.',
        sortOrder: 7,
      },
      {
        countryId: indonesia.id,
        question: 'Do I need to print my Indonesia E-Visa?',
        answer: 'Yes, travelers are advised to carry a printed copy of their approved Indonesia E-Visa during travel and immigration checks.',
        sortOrder: 8,
      }
    ]
  });

  console.log('Indonesia Visa data seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
