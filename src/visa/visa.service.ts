import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisaCountryDto, UpdateVisaCountryDto } from './dto/visa-country.dto';

@Injectable()
export class VisaService {
  constructor(private prisma: PrismaService) {}

  async createCountry(dto: CreateVisaCountryDto) {
    const { plans, requirements, faqs, seoContent, ...countryData } = dto;

    return this.prisma.visaCountry.create({
      data: {
        ...countryData,
        plans: plans ? { create: plans } : undefined,
        requirements: requirements ? { create: requirements } : undefined,
        faqs: faqs ? { create: faqs } : undefined,
        seoContent: seoContent ? { create: seoContent } : undefined,
      },
      include: {
        plans: true,
        requirements: true,
        faqs: true,
        seoContent: true,
      },
    });
  }

  async findAllCountries() {
    return this.prisma.visaCountry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { plans: true },
        },
      },
    });
  }

  async getFeaturedDestinations() {
    const countries = await this.prisma.visaCountry.findMany({
      where: { featured: true, active: true },
      orderBy: { createdAt: 'desc' },
    });

    return countries.map(c => ({
      ...c,
      thumbnail: c.heroImage,
      flag: c.flagUrl, // In a real app this might be an emoji or icon
    }));
  }

  async getAllDestinations() {
    const countries = await this.prisma.visaCountry.findMany({
      where: { active: true },
      orderBy: { countryName: 'asc' },
    });

    return countries.map(c => ({
      ...c,
      thumbnail: c.heroImage,
    }));
  }

  async findCountryBySlug(slug: string) {
    const country = await this.prisma.visaCountry.findUnique({
      where: { slug },
      include: {
        plans: { where: { active: true }, orderBy: { totalFee: 'asc' } },
        requirements: { orderBy: { sortOrder: 'asc' } },
        faqs: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        seoContent: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!country) {
      throw new NotFoundException(`Visa details for country with slug ${slug} not found`);
    }

    return country;
  }

  async updateCountry(id: string, dto: UpdateVisaCountryDto) {
    const { plans, requirements, faqs, seoContent, ...countryData } = dto;

    // For simplicity in this complex update, we'll update the country first.
    // In a real-world scenario, you might want to handle nested updates/deletes more carefully.
    
    return this.prisma.$transaction(async (tx) => {
      // Update country basic info
      const updatedCountry = await tx.visaCountry.update({
        where: { id },
        data: countryData,
      });

      // If nested data is provided, we'll replace it (delete all and recreate)
      // This is a common pattern for complex admin forms where the entire state is sent.
      if (plans) {
        await tx.visaPlan.deleteMany({ where: { countryId: id } });
        await tx.visaPlan.createMany({
          data: plans.map(p => ({ ...p, countryId: id })),
        });
      }

      if (requirements) {
        await tx.visaRequirement.deleteMany({ where: { countryId: id } });
        await tx.visaRequirement.createMany({
          data: requirements.map(r => ({ ...r, countryId: id })),
        });
      }

      if (faqs) {
        await tx.visaFAQ.deleteMany({ where: { countryId: id } });
        await tx.visaFAQ.createMany({
          data: faqs.map(f => ({ ...f, countryId: id })),
        });
      }

      if (seoContent) {
        await tx.visaSEOContent.deleteMany({ where: { countryId: id } });
        await tx.visaSEOContent.createMany({
          data: seoContent.map(s => ({ ...s, countryId: id })),
        });
      }

      return tx.visaCountry.findUnique({
        where: { id },
        include: {
          plans: true,
          requirements: true,
          faqs: true,
          seoContent: true,
        },
      });
    });
  }

  async deleteCountry(id: string) {
    return this.prisma.visaCountry.delete({
      where: { id },
    });
  }

  async getAdminCountryById(id: string) {
    const country = await this.prisma.visaCountry.findUnique({
      where: { id },
      include: {
        plans: true,
        requirements: true,
        faqs: true,
        seoContent: true,
      },
    });

    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    return country;
  }
}
