import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Dubai Visa data...');

  const dubai = await prisma.visaCountry.upsert({
    where: { slug: 'dubai' },
    update: {
      countryName: 'United Arab Emirates (Dubai)',
      countryCode: 'AE',
      flagUrl: 'https://flagcdn.com/w320/ae.png',
      heroImage: 'https://images.unsplash.com/photo-1512453979798-5eaad0ff3b03?auto=format&fit=crop&q=80&w=1920', // Dubai skyline
      shortDescription: 'Apply for your Dubai (UAE) E-Visa online with fast processing, paperless documentation, and smooth approval support for Indian travelers.',
      seoTitle: 'Apply Dubai (UAE) Visa Online for Indians | Fast UAE E-Visa',
      seoDescription: 'Apply for your Dubai (UAE) E-Visa online with fast processing, paperless documentation, and expert support for Indian travelers.',
      metaKeywords: 'dubai visa, uae visa for indians, dubai tourist visa, apply dubai visa online, uae e-visa, dubai travel visa, online dubai visa, dubai visa application, uae tourist visa',
      visaType: 'E-Visa',
      processingTime: '2–4 Working Days',
      stayDuration: 'Up to 30 Days',
      validity: '60 Days from Issuance',
      startingPrice: 7100,
      featured: true,
      active: true,
    },
    create: {
      countryName: 'United Arab Emirates (Dubai)',
      slug: 'dubai',
      countryCode: 'AE',
      flagUrl: 'https://flagcdn.com/w320/ae.png',
      heroImage: 'https://images.unsplash.com/photo-1512453979798-5eaad0ff3b03?auto=format&fit=crop&q=80&w=1920',
      shortDescription: 'Apply for your Dubai (UAE) E-Visa online with fast processing, paperless documentation, and smooth approval support for Indian travelers.',
      seoTitle: 'Apply Dubai (UAE) Visa Online for Indians | Fast UAE E-Visa',
      seoDescription: 'Apply for your Dubai (UAE) E-Visa online with fast processing, paperless documentation, and expert support for Indian travelers.',
      metaKeywords: 'dubai visa, uae visa for indians, dubai tourist visa, apply dubai visa online, uae e-visa, dubai travel visa, online dubai visa, dubai visa application, uae tourist visa',
      visaType: 'E-Visa',
      processingTime: '2–4 Working Days',
      stayDuration: 'Up to 30 Days',
      validity: '60 Days from Issuance',
      startingPrice: 7100,
      featured: true,
      active: true,
    },
  });

  // Clear existing related data for a clean update
  await prisma.visaPlan.deleteMany({ where: { countryId: dubai.id } });
  await prisma.visaRequirement.deleteMany({ where: { countryId: dubai.id } });
  await prisma.visaFAQ.deleteMany({ where: { countryId: dubai.id } });
  await prisma.visaSEOContent.deleteMany({ where: { countryId: dubai.id } });

  // Add Visa Plans
  await prisma.visaPlan.createMany({
    data: [
      {
        countryId: dubai.id,
        title: 'Tourist Visa',
        badge: 'Most Popular',
        visaType: 'E-Visa',
        entryType: 'Single Entry',
        visaFee: 7100,
        serviceFee: 999,
        totalFee: 8099,
        processingDays: 4,
        validity: '60 Days',
        stayDuration: '30 Days',
        featured: true,
      },
      {
        countryId: dubai.id,
        title: 'UAE 60 Days Single Entry E-Visa',
        badge: 'Extended Stay',
        visaType: 'E-Visa',
        entryType: 'Single Entry',
        visaFee: 11500,
        serviceFee: 2487,
        totalFee: 13987,
        processingDays: 4,
        validity: '60 Days',
        stayDuration: '60 Days',
        featured: false,
      },
      {
        countryId: dubai.id,
        title: 'UAE 60 Days Multiple Entry E-Visa',
        badge: 'Multiple Entry',
        visaType: 'E-Visa',
        entryType: 'Multiple Entry',
        visaFee: 18850,
        serviceFee: 4000,
        totalFee: 22850,
        processingDays: 4,
        validity: '60 Days',
        stayDuration: '60 Days',
        featured: false,
      }
    ]
  });

  // Add Requirements
  await prisma.visaRequirement.createMany({
    data: [
      {
        countryId: dubai.id,
        title: 'Passport Front Page',
        description: 'Clear scanned copy of passport front page showing personal details.',
        required: true,
        sortOrder: 1,
      },
      {
        countryId: dubai.id,
        title: 'Passport Back Page',
        description: 'Scanned copy of the passport back page.',
        required: true,
        sortOrder: 2,
      },
      {
        countryId: dubai.id,
        title: 'Passport Size Photograph',
        description: 'Recent digital passport-size photograph meeting UAE visa photo requirements.',
        required: true,
        sortOrder: 3,
      },
      {
        countryId: dubai.id,
        title: 'Valid Passport',
        description: 'Passport must be valid for at least 6 months from the intended travel date.',
        required: true,
        sortOrder: 4,
      }
    ]
  });

  // Add SEO Content Blocks
  await prisma.visaSEOContent.createMany({
    data: [
      {
        countryId: dubai.id,
        sectionTitle: 'Why Choose Our Dubai Visa Service?',
        sectionContent: 'Get your Dubai (UAE) visa processed with a fast and completely online application process, transparent pricing, and dedicated support for Indian travelers.',
        sortOrder: 1,
      },
      {
        countryId: dubai.id,
        sectionTitle: 'Dubai Visa Processing Time',
        sectionContent: 'Most Dubai tourist visa applications are processed within 2–4 working days. Express processing may be available for urgent travel requirements.',
        sortOrder: 2,
      },
      {
        countryId: dubai.id,
        sectionTitle: 'Documents Required for Dubai Visa',
        sectionContent: 'Applicants generally need passport front and back page copies along with a recent passport-size photograph to apply for a Dubai E-Visa.',
        sortOrder: 3,
      },
      {
        countryId: dubai.id,
        sectionTitle: 'How to Apply for Dubai Visa?',
        sectionContent: 'Upload your passport documents and photo, complete the online application, and pay securely online. Once approved, your Dubai E-Visa will be delivered digitally.',
        sortOrder: 4,
      },
      {
        countryId: dubai.id,
        sectionTitle: 'Important Notes Before Travel',
        sectionContent: 'Ensure your passport has at least 6 months validity from your intended date of entry into Dubai. Travelers should also carry printed copies of their approved visa during travel.',
        sortOrder: 5,
      }
    ]
  });

  // Add FAQs
  await prisma.visaFAQ.createMany({
    data: [
      {
        countryId: dubai.id,
        question: 'Do Indians need a visa for Dubai?',
        answer: 'Yes, Indian passport holders require a valid visa to enter Dubai (UAE) for tourism or business travel.',
        sortOrder: 1,
      },
      {
        countryId: dubai.id,
        question: 'Can Indians apply for a Dubai visa online?',
        answer: 'Yes, Indian travelers can apply for a Dubai E-Visa completely online without visiting the embassy or consulate.',
        sortOrder: 2,
      },
      {
        countryId: dubai.id,
        question: 'What documents are required for Dubai visa?',
        answer: 'Applicants generally need passport front and back page copies along with a recent passport-size photograph.',
        sortOrder: 3,
      },
      {
        countryId: dubai.id,
        question: 'What is the validity of a Dubai tourist visa?',
        answer: 'Most Dubai tourist visas are valid for 60 days from issuance depending on the selected visa type.',
        sortOrder: 4,
      },
      {
        countryId: dubai.id,
        question: 'How long can I stay in Dubai with a tourist visa?',
        answer: 'Travelers can usually stay for 30 or 60 days depending on the selected UAE visa plan.',
        sortOrder: 5,
      },
      {
        countryId: dubai.id,
        question: 'Can I apply for a multiple-entry UAE visa?',
        answer: 'Yes, UAE multiple-entry E-Visa options are available for travelers who need to enter Dubai multiple times.',
        sortOrder: 6,
      },
      {
        countryId: dubai.id,
        question: 'How long does Dubai visa processing take?',
        answer: 'Most Dubai visa applications are processed within 2–4 working days after successful submission.',
        sortOrder: 7,
      },
      {
        countryId: dubai.id,
        question: 'Do I need to print my Dubai E-Visa?',
        answer: 'Yes, travelers are advised to carry a printed copy of their approved Dubai visa during travel and immigration checks.',
        sortOrder: 8,
      }
    ]
  });

  console.log('Dubai Visa data seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
