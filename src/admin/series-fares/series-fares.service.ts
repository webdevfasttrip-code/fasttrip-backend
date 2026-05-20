import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeriesFareService {
    private readonly logger = new Logger(SeriesFareService.name);

    constructor(private prisma: PrismaService) { }

    async applySeriesFare(flight: any): Promise<number | null> {
        const airline = flight.validatingAirlineCode || flight.itineraries?.[0]?.segments?.[0]?.carrierCode;
        const origin = flight.itineraries?.[0]?.segments?.[0]?.departure?.iataCode;
        const destination = flight.itineraries?.[0]?.segments?.[flight.itineraries?.[0]?.segments?.length - 1]?.arrival?.iataCode;

        const today = new Date();

        try {
            const fare = await this.prisma.seriesFare.findFirst({
                where: {
                    airlineCode: airline,
                    origin,
                    destination,
                    isActive: true,
                    validFrom: { lte: today },
                    validTo: { gte: today },
                },
            });

            return fare ? fare.fixedPrice : null;
        } catch (error) {
            this.logger.warn(`Failed to fetch series fare (DB connectivity error): ${error.message}`);
            return null;
        }
    }

    async getCalendarFares(origin: string, destination: string, centerDateStr: string) {
        const centerDate = new Date(centerDateStr);
        const result: any[] = [];

        // Generate a 7-day window (-3 to +3 days)
        for (let i = -3; i <= 3; i++) {
            const currentDate = new Date(centerDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Format to YYYY-MM-DD
            const dateStr = currentDate.toISOString().split('T')[0];

            const fare = await this.prisma.seriesFare.findFirst({
                where: {
                    origin,
                    destination,
                    isActive: true,
                    validFrom: { lte: currentDate },
                    validTo: { gte: currentDate },
                },
                orderBy: { fixedPrice: 'asc' }
            });

            if (fare) {
                result.push({
                    date: dateStr,
                    price: fare.fixedPrice
                });
            } else if (process.env.NODE_ENV !== 'production') {
                // FALLBACK FOR DEVELOPMENT: Provide dummy data if DB is empty
                // This ensures the calendar works for testing
                const basePrice = 3000 + (Math.random() * 2000);
                result.push({
                    date: dateStr,
                    price: Math.floor(basePrice / 10) * 10
                });
            }
        }

        return result;
    }

    async getAll() {
        return this.prisma.seriesFare.findMany({
            orderBy: { validFrom: 'desc' },
        });
    }

    async create(data: any) {
        return this.prisma.seriesFare.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.seriesFare.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.prisma.seriesFare.delete({ where: { id } });
    }
}
