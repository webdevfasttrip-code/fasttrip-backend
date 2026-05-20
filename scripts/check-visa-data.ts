import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const countries = await prisma.visaCountry.findMany({
    include: {
      plans: true,
      requirements: true,
      faqs: true,
      seoContent: true
    }
  });
  console.log(JSON.stringify(countries, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
