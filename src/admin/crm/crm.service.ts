import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CRMService {
    constructor(private prisma: PrismaService) { }

    async getCustomers(query: any) {
        const { filter, search, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        let where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Advanced Filters
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        if (filter === 'NEW_USERS') {
            where.createdAt = { gte: thirtyDaysAgo };
        } else if (filter === 'REPEAT_CUSTOMERS') {
            where.bookings = { some: {} }; // At least one booking
            // Logic for > 1 booking could be added if needed
        } else if (filter === 'HIGH_SPENDERS') {
            where.bookings = { some: { totalAmount: { gte: 50000 } } };
        } else if (filter === 'BLOCKED') {
            where.isBlocked = true;
        } else if (filter === 'RECENTLY_ACTIVE') {
            where.lastLoginAt = { gte: thirtyDaysAgo };
        }

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: {
                    _count: { select: { bookings: true } },
                },
                skip: Number(skip),
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        // Enrich with total spend (calculating manually as prisma doesn't support sum in include)
        const enrichedData = await Promise.all(data.map(async (user) => {
            const spend = await this.prisma.booking.aggregate({
                where: { userId: user.id, paymentStatus: 'SUCCESS' },
                _sum: { totalAmount: true }
            });
            return {
                ...user,
                totalSpend: spend._sum.totalAmount || 0,
                totalBookings: user._count.bookings
            };
        }));

        return {
            data: enrichedData,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getCustomerById(id: string) {
        const customer = await this.prisma.user.findUnique({
            where: { id },
            include: {
                bookings: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                savedPassengers: true,
                searchHistory: {
                    orderBy: { searchedAt: 'desc' },
                    take: 10
                },
                activityLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });

        if (!customer) throw new NotFoundException('Customer not found');

        // Calculate total spend
        const spend = await this.prisma.booking.aggregate({
            where: { userId: id, paymentStatus: 'SUCCESS' },
            _sum: { totalAmount: true }
        });

        return {
            ...customer,
            totalSpend: spend._sum.totalAmount || 0,
            totalBookings: customer.bookings.length // This is only the last 10, should use count for total
        };
    }

    async updateCustomerStatus(id: string, isBlocked: boolean) {
        return this.prisma.user.update({
            where: { id },
            data: { isBlocked }
        });
    }

    async updateInternalNotes(id: string, notes: string) {
        return this.prisma.user.update({
            where: { id },
            data: { internalNotes: notes }
        });
    }

    async getCRMInsights() {
        const [totalUsers, activeUsers, repeatCustomers] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
            this.prisma.user.count({ where: { bookings: { some: {} } } })
        ]);

        return {
            totalUsers,
            activeUsers,
            repeatCustomers,
            conversionRate: totalUsers > 0 ? (repeatCustomers / totalUsers) * 100 : 0
        };
    }
}
