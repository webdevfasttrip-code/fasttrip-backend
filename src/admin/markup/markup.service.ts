import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarkupService {
    private readonly logger = new Logger(MarkupService.name);

    constructor(private prisma: PrismaService) { }

    async applyMarkup(flight: any): Promise<number> {
        const basePrice = flight.price?.total || flight.fare?.totalFare || 0;
        if (basePrice === 0) return 0;

        const airline = flight.validatingAirlineCode || flight.itineraries?.[0]?.segments?.[0]?.carrierCode;
        const origin = flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode;
        const destination = flight.itineraries?.[0]?.segments?.[flight.itineraries?.[0]?.segments?.length - 1]?.arrival?.iataCode;
        const cabin = flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;

        // Fetch all active rules
        let rules: any[] = [];
        try {
            rules = await this.prisma.markupRule.findMany({
                where: { isActive: true },
            });
        } catch (error) {
            this.logger.warn(`Failed to fetch markup rules (DB connectivity error): ${error.message}`);
            return basePrice;
        }

        if (rules.length === 0) return basePrice;

        // Find the best match based on priority
        // 1. Exact Route + Airline
        let matchedRule = rules.find(r => r.origin === origin && r.destination === destination && r.airlineCode === airline);

        // 2. Airline-only
        if (!matchedRule) {
            matchedRule = rules.find(r => r.airlineCode === airline && !r.origin && !r.destination);
        }

        // 3. Cabin-only
        if (!matchedRule && cabin) {
            matchedRule = rules.find(r => r.cabinClass === cabin && !r.airlineCode && !r.origin);
        }

        // 4. Global rule
        if (!matchedRule) {
            matchedRule = rules.find(r => !r.airlineCode && !r.origin && !r.destination && !r.cabinClass);
        }

        if (!matchedRule) return basePrice;

        let finalPrice = basePrice;
        if (matchedRule.markupType === 'PERCENTAGE') {
            finalPrice += (basePrice * matchedRule.markupValue) / 100;
        } else {
            finalPrice += matchedRule.markupValue;
        }

        return Math.round(finalPrice);
    }

    async getAllRules() {
        return this.prisma.markupRule.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async upsertRule(data: any) {
        if (data.id) {
            return this.prisma.markupRule.update({
                where: { id: data.id },
                data,
            });
        }
        return this.prisma.markupRule.create({ data });
    }

    async deleteRule(id: string) {
        return this.prisma.markupRule.delete({ where: { id } });
    }
}
