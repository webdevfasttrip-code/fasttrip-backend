import { PrismaClient, AdminRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vietnam = await prisma.visaCountry.upsert({
    where: { slug: 'vietnam' },
    update: {
      shortDescription: 'Apply for your Vietnam eVisa online with Fasttrip. Get 30 or 90 days tourist visa for Indians with a simplified process, secure document handling, and expert support.',
      heroImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1920',
      visaType: 'E-Visa',
      processingTime: '3-5 Working Days',
      stayDuration: 'Up to 90 Days',
      validity: '90 Days',
      startingPrice: 2550,
      featured: true,
      active: true,
      plans: {
        deleteMany: {},
        create: [
          {
            title: '30 Days Single Entry',
            badge: 'Most Popular',
            description: 'Standard tourist eVisa for 30 days stay.',
            entryType: 'Single Entry',
            validity: '30 Days',
            stayDuration: '30 Days',
            visaType: 'E-Visa',
            visaFee: 2550,
            serviceFee: 0,
            totalFee: 2550,
            processingDays: 3,
            featured: true,
          },
          {
            title: '90 Days Single Entry',
            badge: 'Best Value',
            description: 'Stay longer with a 90 days single entry visa.',
            entryType: 'Single Entry',
            validity: '90 Days',
            stayDuration: '90 Days',
            visaType: 'E-Visa',
            visaFee: 3550,
            serviceFee: 0,
            totalFee: 3550,
            processingDays: 3,
            featured: false,
          },
          {
            title: '90 Days Multiple Entry',
            badge: 'Business/Frequent',
            description: 'Perfect for frequent travelers to Vietnam.',
            entryType: 'Multiple Entry',
            validity: '90 Days',
            stayDuration: '90 Days',
            visaType: 'E-Visa',
            visaFee: 6550,
            serviceFee: 0,
            totalFee: 6550,
            processingDays: 3,
            featured: false,
          }
        ]
      },
      requirements: {
        deleteMany: {},
        create: [
          {
            title: 'Passport Bio Page',
            description: 'Clear scanned copy of passport with minimum 6 months validity.',
            required: true,
            sortOrder: 0,
          },
          {
            title: 'Passport Photo',
            description: 'Recent passport-size photograph with white background (JPG/PNG).',
            required: true,
            sortOrder: 1,
          },
          {
            title: 'Confirmed Return Ticket',
            description: 'Proof of onward or return journey from Vietnam.',
            required: false,
            sortOrder: 2,
          }
        ]
      },
      faqs: {
        deleteMany: {},
        create: [
          {
            question: 'Is Vietnam eVisa available for Indians?',
            answer: 'Yes, Indian passport holders are eligible for the Vietnam eVisa. It allows for a stay of up to 30 or 90 days and is usually processed within 3 working days.',
            sortOrder: 0,
          },
          {
            question: 'What documents are required for Vietnam eVisa?',
            answer: 'You need a clear scan of your passport bio page (valid for 6 months) and a recent digital passport-size photo with a white background.',
            sortOrder: 1,
          },
          {
            question: 'Can I enter Vietnam from any airport with an eVisa?',
            answer: 'Vietnam eVisa is accepted at 33 international check-points including major airports like Hanoi (Noi Bai), Ho Chi Minh City (Tan Son Nhat), and Da Nang.',
            sortOrder: 2,
          }
        ]
      },
      seoContent: {
        deleteMany: {},
        create: [
          {
            sectionTitle: 'Apply for Vietnam Tourist eVisa Online',
            sectionContent: '<p>Planning an international trip to Vietnam has never been easier. Fasttrip provides a seamless online platform to apply for your Vietnam eVisa. Our automated systems and expert consultants ensure that your application is processed with maximum accuracy and minimum turnaround time.</p><p>From understanding documentation requirements to final visa issuance, we support you at every step of your journey. Get your Vietnam eVisa in record time with our simplified process.</p>',
            sortOrder: 0,
          },
          {
            sectionTitle: 'Why Choose Fasttrip for Vietnam Visa',
            sectionContent: '<p>Thousands of travelers trust Fasttrip for their visa needs because of our transparent pricing and dedicated WhatsApp support. We don\'t just process applications; we provide peace of mind. Our travel-tech powered platform checks for document errors before submission, reducing the chances of rejection significantly.</p>',
            sortOrder: 1,
          }
        ]
      }
    },
    create: {
      countryName: 'Vietnam',
      slug: 'vietnam',
      countryCode: 'VN',
      flagUrl: 'https://flagcdn.com/w320/vn.png',
      heroImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1920',
      shortDescription: 'Apply for your Vietnam eVisa online with Fasttrip. Get 30 or 90 days tourist visa for Indians with a simplified process, secure document handling, and expert support.',
      seoTitle: 'Vietnam Visa for Indians | Apply Vietnam eVisa Online | Fasttrip Visa',
      seoDescription: 'Apply for Vietnam Visa for Indians online. Get Vietnam eVisa with 30 or 90 days stay. Easy documentation, fast processing, and 24/7 support.',
      metaKeywords: 'vietnam visa, vietnam evisa for indians, apply vietnam visa online',
      visaType: 'E-Visa',
      processingTime: '3-5 Working Days',
      stayDuration: 'Up to 90 Days',
      validity: '90 Days',
      startingPrice: 2550,
      currency: 'INR',
      featured: true,
      active: true,
      plans: {
        create: [
          {
            title: '30 Days Single Entry',
            badge: 'Most Popular',
            description: 'Standard tourist eVisa for 30 days stay.',
            entryType: 'Single Entry',
            validity: '30 Days',
            stayDuration: '30 Days',
            visaType: 'E-Visa',
            visaFee: 2550,
            serviceFee: 0,
            totalFee: 2550,
            processingDays: 3,
            featured: true,
          }
        ]
      }
    }
  });

  console.log('Vietnam visa data updated successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
