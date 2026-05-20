import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookingsAdminService {
    private readonly logger = new Logger(BookingsAdminService.name);

    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.booking.findMany({
            include: { user: true, passengers: true },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit for performance
        });
    }

    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyBookings = await this.prisma.booking.count({
            where: { createdAt: { gte: today } },
        });

        const monthlyBookings = await this.prisma.booking.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
        });

        const revenueToday = await this.prisma.booking.aggregate({
            where: {
                createdAt: { gte: today },
                bookingStatus: 'CONFIRMED',
            },
            _sum: { totalAmount: true },
        });

        const failedPayments = await this.prisma.booking.count({
            where: { paymentStatus: 'FAILED' },
        });

        const expiredDrafts = await this.prisma.booking.count({
            where: { paymentStatus: 'EXPIRED' },
        });

        return {
            dailyBookings,
            monthlyBookings,
            revenueToday: revenueToday._sum.totalAmount || 0,
            failedPayments,
            expiredDrafts,
        };
    }

    async getRevenueAnalytics() {
        // Note: Revenue by airline and route requires parsing Json fields or having specific columns.
        // For now, we'll use raw queries or group by supplier if applicable.

        const revenueBySupplier = await (this.prisma.booking as any).groupBy({
            by: ['supplier'],
            where: { bookingStatus: 'CONFIRMED' },
            _sum: { totalAmount: true },
        });

        return {
            revenueBySupplier,
            // Future: Grouping by airline from selectedFlightData Json
        };
    }
}
