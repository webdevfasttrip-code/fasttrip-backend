import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersAdminService {
    private readonly logger = new Logger(UsersAdminService.name);

    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                phone: true,
                isBlocked: true,
                lastLoginAt: true,
                createdAt: true,
                _count: { select: { bookings: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { bookings: true },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async toggleBlock(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        return this.prisma.user.update({
            where: { id },
            data: { isBlocked: !user.isBlocked },
        });
    }

    async getStats() {
        const totalUsers = await this.prisma.user.count();
        const blockedUsers = await this.prisma.user.count({ where: { isBlocked: true } });

        // Active users: booked in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeUsers = await this.prisma.user.count({
            where: {
                bookings: {
                    some: { createdAt: { gte: thirtyDaysAgo } }
                }
            }
        });

        // Daily registrations (last 7 days example)
        const registrations = await this.prisma.user.groupBy({
            by: ['createdAt'],
            _count: true,
            orderBy: { createdAt: 'asc' },
        });

        return {
            totalUsers,
            blockedUsers,
            activeUsers,
            registrations
        };
    }
}
