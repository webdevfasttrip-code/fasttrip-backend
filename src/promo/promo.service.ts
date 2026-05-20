import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType, PromoVisibility } from '@prisma/client';

@Injectable()
export class PromoService {
    private readonly logger = new Logger(PromoService.name);
    constructor(private prisma: PrismaService) {}

    async createPromo(data: any) {
        const { slabs, rules, id: _id, createdAt, updatedAt, usageCount, _count, usages, ...promoData } = data;
        
        const cleanSlabs = slabs ? slabs.map((s: any) => {
            const { id, promoId, ...rest } = s;
            return rest;
        }) : undefined;

        const cleanRules = rules ? rules.map((r: any) => {
            const { id, promoCodeId, promo, ...rest } = r;
            return rest;
        }) : undefined;

        return this.prisma.promoCode.create({
            data: {
                ...promoData,
                code: promoData.code.toUpperCase(),
                bookingStartDate: promoData.bookingStartDate ? new Date(promoData.bookingStartDate) : null,
                bookingEndDate: promoData.bookingEndDate ? new Date(promoData.bookingEndDate) : null,
                travelStartDate: promoData.travelStartDate ? new Date(promoData.travelStartDate) : null,
                travelEndDate: promoData.travelEndDate ? new Date(promoData.travelEndDate) : null,
                slabs: cleanSlabs && cleanSlabs.length > 0 ? { create: cleanSlabs } : undefined,
                rules: cleanRules && cleanRules.length > 0 ? { create: cleanRules } : undefined,
            },
            include: { slabs: true, rules: true }
        });
    }

    async updatePromo(id: string, data: any) {
        const { slabs, rules, id: _id, createdAt, updatedAt, usageCount, _count, usages, ...promoData } = data;

        // Clean slabs
        const cleanSlabs = slabs ? slabs.map((s: any) => {
            const { id, promoId, ...rest } = s;
            return rest;
        }) : undefined;

        // Clean rules
        const cleanRules = rules ? rules.map((r: any) => {
            const { id, promoCodeId, promo, ...rest } = r;
            return rest;
        }) : undefined;

        if (cleanSlabs) {
            await this.prisma.promoCodeSlab.deleteMany({ where: { promoId: id } });
        }
        if (cleanRules) {
            await this.prisma.promoRule.deleteMany({ where: { promoCodeId: id } });
        }

        return this.prisma.promoCode.update({
            where: { id },
            data: {
                ...promoData,
                code: promoData.code ? promoData.code.toUpperCase() : undefined,
                bookingStartDate: promoData.bookingStartDate ? new Date(promoData.bookingStartDate) : null,
                bookingEndDate: promoData.bookingEndDate ? new Date(promoData.bookingEndDate) : null,
                travelStartDate: promoData.travelStartDate ? new Date(promoData.travelStartDate) : null,
                travelEndDate: promoData.travelEndDate ? new Date(promoData.travelEndDate) : null,
                slabs: cleanSlabs && cleanSlabs.length > 0 ? { create: cleanSlabs } : undefined,
                rules: cleanRules && cleanRules.length > 0 ? { create: cleanRules } : undefined,
            },
            include: { slabs: true, rules: true }
        });
    }

    async getPromos(filters: any) {
        const where: any = {};
        
        // Handle status filter robustly
        if (filters.status === 'active' || filters.status === 'true') {
            where.status = true;
        } else if (filters.status === 'inactive' || filters.status === 'false') {
            where.status = false;
        }

        if (filters.visibility) where.visibility = filters.visibility;
        
        if (filters.q) {
            where.OR = [
                { code: { contains: filters.q, mode: 'insensitive' } },
                { name: { contains: filters.q, mode: 'insensitive' } },
            ];
        }

        const promos = await this.prisma.promoCode.findMany({
            where,
            include: {
                _count: { select: { usages: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map data to match frontend expectations
        return promos.map(p => ({
            ...p,
            usageCount: p._count?.usages || 0
        }));
    }

    async getPromoById(id: string) {
        return this.prisma.promoCode.findUnique({
            where: { id },
            include: { slabs: true, rules: true }
        });
    }

    async validatePromo(code: string, bookingAmount: number, context: any = {}) {
        const promo = await this.prisma.promoCode.findUnique({
            where: { code: code.toUpperCase() },
            include: { slabs: true, rules: true }
        });

        if (!promo) throw new NotFoundException('Promo code not found');
        if (!promo.status) throw new BadRequestException('This promo code is currently inactive');

        const now = new Date();

        // 1. Booking Validity
        if (promo.bookingStartDate && now < promo.bookingStartDate) {
            throw new BadRequestException('This promo offer has not started yet');
        }
        if (promo.bookingEndDate && now > promo.bookingEndDate) {
            throw new BadRequestException('This promo offer has expired');
        }

        // 2. Travel Validity
        if (context.travelDate) {
            const travelDate = new Date(context.travelDate);
            if (promo.travelStartDate && travelDate < promo.travelStartDate) {
                throw new BadRequestException('Travel date is too early for this promo');
            }
            if (promo.travelEndDate && travelDate > promo.travelEndDate) {
                throw new BadRequestException('Travel date is beyond the promo validity');
            }
        }

        // 3. Day of Week Restrictions
        if (promo.dayRestrictions.length > 0) {
            const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const currentDay = days[now.getDay()];
            if (!promo.dayRestrictions.includes(currentDay)) {
                throw new BadRequestException(`This promo is only valid on: ${promo.dayRestrictions.join(', ')}`);
            }
        }

        // 4. Usage Limits
        if (promo.totalUsageLimit && promo.usageCount >= promo.totalUsageLimit) {
            throw new BadRequestException('Maximum usage limit reached for this promo');
        }

        if (context.userId) {
            const userUsage = await this.prisma.promoUsage.count({
                where: { promoCodeId: promo.id, userId: context.userId }
            });
            if (userUsage >= promo.perUserLimit) {
                throw new BadRequestException(`You have already used this promo ${userUsage} times`);
            }
        }

        // 5. Min/Max Booking Amount
        if (bookingAmount < promo.minBookingAmount) {
            throw new BadRequestException(`Minimum booking amount of ₹${promo.minBookingAmount} required`);
        }
        if (promo.maxBookingAmount && bookingAmount > promo.maxBookingAmount) {
            throw new BadRequestException(`Maximum booking amount for this promo is ₹${promo.maxBookingAmount}`);
        }

        // 6. Trip Applicability
        if (promo.tripTypes.length > 0 && context.tripType && !promo.tripTypes.includes(context.tripType.toUpperCase())) {
            throw new BadRequestException(`This promo is only for ${promo.tripTypes.join(', ')} trips`);
        }
        if (promo.sectorTypes.length > 0 && context.sectorType && !promo.sectorTypes.includes(context.sectorType.toUpperCase())) {
            throw new BadRequestException(`This promo is for ${promo.sectorTypes.join(', ')} flights only`);
        }

        // 7. Route & Airline Restrictions
        if (promo.allowedAirlines.length > 0 && context.airlineCode && !promo.allowedAirlines.includes(context.airlineCode)) {
            throw new BadRequestException('This promo is not valid for the selected airline');
        }
        if (promo.allowedOrigins.length > 0 && context.origin && !promo.allowedOrigins.includes(context.origin)) {
            throw new BadRequestException('Promo not valid for this origin');
        }
        if (promo.allowedDestinations.length > 0 && context.destination && !promo.allowedDestinations.includes(context.destination)) {
            throw new BadRequestException('Promo not valid for this destination');
        }
        
        const route = `${context.origin}-${context.destination}`;
        if (promo.excludedRoutes.includes(route)) {
            throw new BadRequestException('This promo is not valid on this specific route');
        }

        // 8. User Segmentation
        if (promo.userTypes.length > 0 && context.userType && !promo.userTypes.includes(context.userType.toUpperCase())) {
            throw new BadRequestException('This promo is not available for your user type');
        }

        // 9. Discount Calculation (Standard or Slab)
        let discount = 0;
        let discountType = promo.discountType;
        let discountValue = promo.discountValue;

        // Check if there's a matching slab
        if (promo.slabs && promo.slabs.length > 0) {
            const slab = promo.slabs.find(s => bookingAmount >= s.fromAmount && bookingAmount <= s.toAmount);
            if (slab) {
                discountType = slab.discountType;
                discountValue = slab.discountValue;
            }
        }

        if (discountType === DiscountType.FLAT) {
            discount = discountValue;
        } else {
            discount = (bookingAmount * discountValue) / 100;
            if (promo.maxDiscountCap && discount > promo.maxDiscountCap) {
                discount = promo.maxDiscountCap;
            }
        }

        discount = Math.min(discount, bookingAmount);

        return {
            valid: true,
            promoId: promo.id,
            code: promo.code,
            name: promo.name,
            discount,
            finalAmount: bookingAmount - discount,
            currency: promo.currency,
            message: 'Promo code applied successfully'
        };
    }

    // Banner Management
    async getBanners(device?: string) {
        const where: any = { isActive: true, endDate: { gte: new Date() } };
        if (device) {
            where.deviceVisibility = { hasSome: [device.toUpperCase(), 'ALL'] };
        }
        return this.prisma.promoBanner.findMany({
            where,
            orderBy: { displayOrder: 'asc' },
            include: { promo: { select: { code: true } } }
        });
    }

    async getAllBanners() {
        return this.prisma.promoBanner.findMany({
            orderBy: { displayOrder: 'asc' },
            include: { promo: { select: { code: true } } }
        });
    }

    async createBanner(data: any) {
        if (!data.promoCodeId) {
            delete data.promoCodeId;
        }
        return this.prisma.promoBanner.create({ data });
    }

    async updateBanner(id: string, data: any) {
        if (data.promoCodeId === '') {
            data.promoCodeId = null;
        }
        return this.prisma.promoBanner.update({ where: { id }, data });
    }

    async deleteBanner(id: string) {
        return this.prisma.promoBanner.delete({ where: { id } });
    }

    // Rules
    async getRules(promoId: string) {
        return this.prisma.promoRule.findMany({ where: { promoCodeId: promoId } });
    }

    async createRule(data: any) {
        return this.prisma.promoRule.create({ data });
    }

    async deleteRule(id: string) {
        return this.prisma.promoRule.delete({ where: { id } });
    }

    // Analytics
    async getPromoAnalytics() {
        const summary = await this.prisma.promoCode.findMany({
            include: {
                _count: { select: { usages: true } },
                usages: {
                    select: { discountAmount: true }
                }
            }
        });

        return summary.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            usageCount: p._count.usages,
            totalDiscountGiven: p.usages.reduce((sum, u) => sum + u.discountAmount, 0),
            status: p.status
        }));
    }
}
