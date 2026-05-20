import { PrismaClient, MarkupType, SectorType, SupplierType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultRule = await prisma.markupRule.findFirst({
    where: { priority: 999 }
  });

  if (!defaultRule) {
    await prisma.markupRule.create({
      data: {
        name: 'Default Fallback Markup',
        priority: 999,
        markupType: MarkupType.FLAT,
        markupValue: 500,
        sector: SectorType.ALL,
        supplier: SupplierType.ALL,
        isActive: true
      }
    });
    console.log('Default fallback markup rule created (₹500 flat)');
  }

  const defaultFee = await prisma.convenienceFee.findFirst({
    where: { name: 'Default Convenience Fee' }
  });

  if (!defaultFee) {
    await prisma.convenienceFee.create({
      data: {
        name: 'Default Convenience Fee',
        type: 'PER_PNR',
        value: 300,
        sector: SectorType.ALL,
        isActive: true
      }
    });
    console.log('Default convenience fee created (₹300 per PNR)');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
