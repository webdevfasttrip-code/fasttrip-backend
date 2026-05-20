import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class InternalInventoryProvider {
    private readonly logger = new Logger(InternalInventoryProvider.name);

    constructor(private prisma: PrismaService) { }

    getName() {
        return 'INTERNAL_INVENTORY';
    }

    async search(dto: any) {
        try {
            this.logger.log(`Searching Internal Inventory for ${dto.origin}-${dto.destination}`);

            // 1. Fetch from Database
            const dbFares = await this.prisma.seriesFare.findMany({
                where: {
                    origin: dto.origin,
                    destination: dto.destination,
                    isActive: true,
                    validFrom: { lte: new Date(dto.departureDate) },
                    validTo: { gte: new Date(dto.departureDate) }
                }
            });

            // 2. Map DB Fares
            const results = dbFares.map((f, idx) => this.mapDbToInternal(f, idx, dto));

            // 3. Fallback to DUMMY DATA if no DB fares found (only in development)
            if (results.length === 0 && process.env.NODE_ENV !== 'production') {
                this.logger.log('No DB fares found, providing dummy internal flights for testing');
                results.push(this.getDummyFlight(dto, '1'));
                results.push(this.getDummyFlight(dto, '2', 4500));
            }

            return results;
        } catch (err) {
            this.logger.error('Internal Inventory Search Error', err);
            return [];
        }
    }

    private mapDbToInternal(f: any, index: number, dto: any) {
        const departure = `${dto.departureDate}T08:00:00`;
        const arrival = `${dto.departureDate}T10:15:00`;

        return {
            id: `INT_${f.id}_${index}`,
            supplier: 'INTERNAL_INVENTORY',
            cheapestFare: f.fixedPrice,
            meta: {
                airlineCode: f.airlineCode || 'AI',
                airlineName: 'Air India (Series)',
                origin: f.origin,
                destination: f.destination,
                departure,
                arrival,
                duration: 135, // 2h 15m
                stops: 0,
                segments: [{
                    airline: f.airlineCode || 'AI',
                    airlineName: 'Air India',
                    flightNumber: 'AI-101',
                    from: f.origin,
                    to: f.destination,
                    dep: departure,
                    arr: arrival,
                    duration: 135,
                    terminalFrom: '3',
                    terminalTo: '1',
                    cabin: 'ECONOMY'
                }]
            },
            fareOptions: [
                {
                    brand: 'Internal Fixed Fare',
                    price: f.fixedPrice,
                    seats: 9,
                    refundable: false,
                    baggage: { checkin: { weight: '15' }, cabin: { weight: '7' } }
                }
            ],
            rawData: { ...f, isInternal: true, cheapestFare: f.fixedPrice }
        };
    }

    private getDummyFlight(dto: any, suffix: string, price: number = 3200) {
        const departure = `${dto.departureDate}T14:30:00`;
        const arrival = `${dto.departureDate}T16:45:00`;

        return {
            id: `DUMMY_INT_${suffix}`,
            supplier: 'INTERNAL_INVENTORY',
            cheapestFare: price,
            meta: {
                airlineCode: '6E',
                airlineName: 'IndiGo (Promo)',
                origin: dto.origin,
                destination: dto.destination,
                departure,
                arrival,
                duration: 135,
                stops: 0,
                segments: [{
                    airline: '6E',
                    airlineName: 'IndiGo',
                    flightNumber: `6E-${100 + parseInt(suffix)}`,
                    from: dto.origin,
                    to: dto.destination,
                    dep: departure,
                    arr: arrival,
                    duration: 135,
                    terminalFrom: '1',
                    terminalTo: '2',
                    cabin: 'ECONOMY'
                }]
            },
            fareOptions: [
                {
                    brand: 'Special Internal Fare',
                    price: price,
                    seats: 5,
                    refundable: false,
                    baggage: { checkin: { weight: '15' }, cabin: { weight: '7' } }
                }
            ],
            rawData: { isDummy: true, supplier: 'INTERNAL_INVENTORY', cheapestFare: price }
        };
    }

    async priceOffer(offer: any) {
        // Internal fares are pre-validated or strictly fixed
        return {
            ...offer,
            bookingStatus: 'CONFIRMED',
            price: { total: offer.cheapestFare, currency: 'INR' }
        };
    }

    async initiateBooking(bookingData: any) {
        this.logger.log(`Initiating Internal Booking for ${bookingData.bookingId}`);
        // For internal inventory, booking is automatically confirmed
        const pnr = Math.random().toString(36).substring(2, 8).toUpperCase();
        return {
            status: 'confirmed',
            bookingRef: pnr,
            pnr: [{ pnr }],
            supplier: 'INTERNAL_INVENTORY'
        };
    }
}
