import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, BookingStatus, CancelStatus, AdminRole, PaymentStatus, TicketStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async findById(id: string) {
        return this.prisma.adminUser.findUnique({ where: { id } });
    }

    async login(email: string, passwordString: string, ipAddress?: string, userAgent?: string) {
        const adminUser = await this.prisma.adminUser.findUnique({
            where: { email },
        });

        if (!adminUser) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!adminUser.isActive) {
            throw new ForbiddenException('Account is inactive');
        }

        if (!adminUser.password) {
             throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(passwordString, adminUser.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Record Login
        await this.prisma.loginLog.create({
            data: {
                adminUserId: adminUser.id,
                ipAddress,
                userAgent
            }
        });

        const payload = {
            sub: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            permissions: adminUser.permissions,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                role: adminUser.role,
                permissions: adminUser.permissions,
            },
        };
    }

    async getDashboardStats() {
        const [totalUsers, totalBookings, totalCancelRequests] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.booking.count(),
            this.prisma.booking.count({
                where: { cancelStatus: CancelStatus.REQUESTED }
            })
        ]);

        return {
            totalUsers,
            totalBookings,
            totalCancelRequests
        };
    }

    async getAggregatedStats() {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const [
            revenueTodayAgg, revenueYesterdayAgg,
            totalBookingsToday, successfulBookingsToday,
            totalBookingsYesterday, successfulBookingsYesterday,
            activeUsersToday, activeUsersYesterday,
            pendingTickets
        ] = await Promise.all([
            this.prisma.booking.aggregate({
                _sum: { totalAmount: true },
                where: { bookingStatus: BookingStatus.CONFIRMED, createdAt: { gte: twentyFourHoursAgo } }
            }),
            this.prisma.booking.aggregate({
                _sum: { totalAmount: true },
                where: { bookingStatus: BookingStatus.CONFIRMED, createdAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } }
            }),
            this.prisma.booking.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
            this.prisma.booking.count({ where: { bookingStatus: BookingStatus.CONFIRMED, createdAt: { gte: twentyFourHoursAgo } } }),
            this.prisma.booking.count({ where: { createdAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } } }),
            this.prisma.booking.count({ where: { bookingStatus: BookingStatus.CONFIRMED, createdAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } } }),
            this.prisma.user.count({ where: { lastLoginAt: { gte: twentyFourHoursAgo } } }),
            this.prisma.user.count({ where: { lastLoginAt: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } } }),
            this.prisma.booking.count({ where: { bookingStatus: BookingStatus.PENDING } })
        ]);

        const revenueToday = revenueTodayAgg._sum.totalAmount || 0;
        const revenueYesterday = revenueYesterdayAgg._sum.totalAmount || 0;

        const successRateToday = totalBookingsToday > 0 ? (successfulBookingsToday / totalBookingsToday) * 100 : 0;
        const successRateYesterday = totalBookingsYesterday > 0 ? (successfulBookingsYesterday / totalBookingsYesterday) * 100 : 0;

        const calcDelta = (today: number, yesterday: number) => {
            if (yesterday === 0) return today > 0 ? 100 : 0;
            return Number((((today - yesterday) / yesterday) * 100).toFixed(2));
        };

        return {
            revenue: {
                value: revenueToday,
                delta: calcDelta(revenueToday, revenueYesterday)
            },
            todayBookings: {
                value: totalBookingsToday,
                delta: calcDelta(totalBookingsToday, totalBookingsYesterday)
            },
            bookingSuccessRate: {
                value: Number(successRateToday.toFixed(2)),
                delta: calcDelta(successRateToday, successRateYesterday)
            },
            activeUsers: {
                value: activeUsersToday,
                delta: calcDelta(activeUsersToday, activeUsersYesterday)
            },
            pendingTickets: pendingTickets
        };
    }

    async getBookings(filters: { status?: BookingStatus, cancelStatus?: CancelStatus, search?: string, supplier?: string, page?: number, limit?: number }) {
        const { status, cancelStatus, search, supplier, page = 1, limit = 10 } = filters;
        
        let where: any = {};
        if (status) where.bookingStatus = status;
        if (cancelStatus) where.cancelStatus = cancelStatus;
        if (supplier) where.supplier = supplier;
        
        if (search) {
            where.OR = [
                { bookingRef: { contains: search, mode: 'insensitive' } },
                { pnr: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { airlineName: { contains: search, mode: 'insensitive' } },
                { supplierName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                include: { 
                    user: { select: { email: true, name: true } },
                    assignedTo: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            this.prisma.booking.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    async getBookingById(id: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                user: { select: { email: true, name: true, phone: true } },
                passengers: true,
                payment: true,
                refundRequests: true,
                assignedTo: { select: { name: true, id: true } },
                logs: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }

    async updateBookingStatus(id: string, status: any) {
        return this.prisma.booking.update({
            where: { id },
            data: { bookingStatus: status }
        });
    }

    async updateVisaStatus(id: string, visaStatus: string, remarks?: string) {
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id },
                data: { 
                    visaStatus,
                    remarks: remarks !== undefined ? remarks : undefined
                }
            });

            await tx.bookingLog.create({
                data: {
                    bookingId: id,
                    action: 'VISA_STATUS_UPDATE',
                    description: `Visa status updated to: ${visaStatus}. Remarks: ${remarks || 'None'}`,
                    performedBy: 'ADMIN'
                }
            });

            return updated;
        });
    }

    async approveCancel(id: string) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.cancelStatus !== CancelStatus.REQUESTED) {
            throw new ForbiddenException('Booking cancel status is not REQUESTED');
        }

        return this.prisma.booking.update({
            where: { id },
            data: {
                cancelStatus: CancelStatus.APPROVED,
                bookingStatus: BookingStatus.CANCELLED,
            }
        });
    }

    async rejectCancel(id: string) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.cancelStatus !== CancelStatus.REQUESTED) {
            throw new ForbiddenException('Booking cancel status is not REQUESTED');
        }

        return this.prisma.booking.update({
            where: { id },
            data: {
                cancelStatus: CancelStatus.REJECTED,
            }
        });
    }

    async markTicketed(id: string, pnr: string) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');
        
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id },
                data: {
                    bookingStatus: BookingStatus.TICKETED,
                    pnr: pnr || booking.pnr,
                    ticketIssuedAt: new Date()
                },
            });

            await tx.bookingLog.create({
                data: {
                    bookingId: id,
                    action: 'TICKET_ISSUED',
                    description: `Ticket successfully issued with PNR: ${pnr}`,
                    performedBy: 'ADMIN'
                }
            });

            return updated;
        });
    }

    async markFailed(id: string) {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');
        
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id },
                data: { bookingStatus: BookingStatus.FAILED },
            });

            await tx.bookingLog.create({
                data: {
                    bookingId: id,
                    action: 'TICKET_FAILED',
                    description: 'Automated/Manual ticketing attempt failed.',
                    performedBy: 'SYSTEM'
                }
            });

            return updated;
        });
    }

    async assignAgent(bookingId: string, agentId: string) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new NotFoundException('Booking not found');

        const agent = await this.prisma.adminUser.findUnique({ where: { id: agentId } });
        if (!agent) throw new NotFoundException('Agent not found');

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: { assignedToId: agentId }
            });

            await tx.bookingLog.create({
                data: {
                    bookingId,
                    action: 'AGENT_ASSIGNED',
                    description: `Booking assigned to agent: ${agent.name}`,
                    performedBy: 'ADMIN'
                }
            });

            return updated;
        });
    }

    async createOfflineBooking(data: any) {
        const {
            pnr, airlineCode, origin, destination,
            passengerName, phone, email, amount, paymentMode
        } = data;

        // Ensure user exists or create a placeholder user for offline booking
        let user: any = null;
        if (email) {
            user = await this.prisma.user.findUnique({ where: { email } });
        }
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: email || `offline_${Date.now()}@fasttrip.in`,
                    name: passengerName,
                    phone: phone || null,
                }
            });
        }

        const bookingRef = `OFF-${Math.floor(100000 + Math.random() * 900000)}`;

        const booking = await this.prisma.booking.create({
            data: {
                bookingRef,
                userId: user.id,
                ticketNumber: pnr,
                bookingStatus: BookingStatus.CONFIRMED,
                totalAmount: amount ? parseFloat(amount) : 0,
                // Add minimum required fields
                payment: {
                    create: {
                        amount: amount ? parseFloat(amount) : 0,
                        status: PaymentStatus.SUCCESS,
                        provider: paymentMode || 'OFFLINE',
                    }
                },
                passengers: {
                    create: [{
                        firstName: passengerName?.split(' ')[0] || 'Unknown',
                        lastName: passengerName?.split(' ').slice(1).join(' ') || 'Unknown',
                        gender: 'UNKNOWN',
                        dateOfBirth: new Date()
                    }]
                }
            }
        });

        return booking;
    }

    async getStaff() {
        return this.prisma.adminUser.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createStaff(data: { name: string; email: string; role: AdminRole; passwordString: string }) {
        const hashedPassword = await bcrypt.hash(data.passwordString, 10);
        return this.prisma.adminUser.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                password: hashedPassword,
                permissions: [] // In a full implementation, you map roles to specific permissions
            },
            select: { id: true, email: true, name: true, role: true }
        });
    }

    async getUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async blockUser(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        
        return this.prisma.user.update({
            where: { id },
            data: { isBlocked: true },
            select: { id: true, email: true, isBlocked: true }
        });
    }

    async getSupportTickets() {
        return this.prisma.supportTicket.findMany({
            include: { user: { select: { name: true, email: true } }, booking: { select: { bookingRef: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateTicketStatus(id: string, status: TicketStatus) {
        return this.prisma.supportTicket.update({
            where: { id },
            data: { status }
        });
    }

    async getLedger() {
        return this.prisma.ledgerEntry.findMany({
            include: { booking: { select: { bookingRef: true, user: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getProfitStats() {
        const stats = await this.prisma.booking.aggregate({
            _sum: {
                totalAmount: true,
                supplierCost: true,
                markupEarned: true
            },
            where: {
                bookingStatus: BookingStatus.CONFIRMED
            }
        });

        return {
            totalRevenue: stats._sum.totalAmount || 0,
            totalSupplierCost: stats._sum.supplierCost || 0,
            totalProfit: stats._sum.markupEarned || 0,
        };
    }

    async getRefunds() {
        return this.prisma.refundRequest.findMany({
            include: { booking: { select: { bookingRef: true, user: { select: { name: true, email: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async processRefund(id: string) {
        const refund = await this.prisma.refundRequest.findUnique({ where: { id } });
        if (!refund) throw new NotFoundException('Refund request not found');

        // Update refund status
        const updatedRefund = await this.prisma.refundRequest.update({
            where: { id },
            data: { status: 'PROCESSED' }
        });

        // Add ledger entry for the refund out
        await this.prisma.ledgerEntry.create({
            data: {
                bookingId: refund.bookingId,
                amount: refund.netRefund,
                type: 'DEBIT_CUSTOMER_REFUND',
                description: 'Processed refund to customer'
            }
        });

        return updatedRefund;
    }

    async getReconciliation() {
        // Find bookings where payment is not SUCCESS but booking is CONFIRMED
        // Or payment is SUCCESS but booking is FAILED/CANCELLED
        return this.prisma.booking.findMany({
            where: {
                OR: [
                    { bookingStatus: BookingStatus.CONFIRMED, paymentStatus: { not: PaymentStatus.SUCCESS } },
                    { bookingStatus: BookingStatus.CANCELLED, paymentStatus: PaymentStatus.SUCCESS }
                ]
            },
            include: { user: { select: { name: true, email: true } }, payment: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAirlineReport() {
        return this.prisma.booking.groupBy({
            by: ['airlineCode'],
            _count: { _all: true },
            _sum: { totalAmount: true, markupEarned: true },
            where: { bookingStatus: BookingStatus.CONFIRMED }
        });
    }

    async getRouteReport() {
        return this.prisma.booking.groupBy({
            by: ['origin', 'destination'],
            _count: { _all: true },
            _sum: { totalAmount: true, markupEarned: true },
            where: { bookingStatus: BookingStatus.CONFIRMED }
        });
    }

    async getAgentPerformance() {
        return this.prisma.booking.groupBy({
            by: ['assignedToId'],
            _count: { _all: true },
            _sum: { totalAmount: true, markupEarned: true },
            where: { bookingStatus: BookingStatus.CONFIRMED, assignedToId: { not: null } }
        });
    }

    async getConversionRate() {
        const totalSearches = await this.prisma.searchLog.count();
        const totalBookings = await this.prisma.booking.count({
            where: { bookingStatus: BookingStatus.CONFIRMED }
        });
        return {
            totalSearches,
            totalBookings,
            rate: totalSearches > 0 ? (totalBookings / totalSearches) * 100 : 0
        };
    }

    async getPeakHours() {
        const bookings = await this.prisma.booking.findMany({
            select: { createdAt: true },
            where: { bookingStatus: BookingStatus.CONFIRMED }
        });
        
        const hours = Array(24).fill(0);
        bookings.forEach(b => {
            const hour = new Date(b.createdAt).getHours();
            hours[hour]++;
        });
        
        return hours.map((count, hour) => ({ hour, count }));
    }

    async getFailedSearches() {
        return this.prisma.searchLog.findMany({
            where: { isConverted: false },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }

    async getAutomationSettings() {
        let settings = await this.prisma.automationSettings.findFirst();
        if (!settings) {
            settings = await this.prisma.automationSettings.create({ data: {} });
        }
        return settings;
    }

    async updateAutomationSettings(data: any) {
        const settings = await this.getAutomationSettings();
        return this.prisma.automationSettings.update({
            where: { id: settings.id },
            data: {
                autoTicketingEnabled: data.autoTicketingEnabled ?? settings.autoTicketingEnabled,
                autoRefundEnabled: data.autoRefundEnabled ?? settings.autoRefundEnabled,
                highValueThreshold: data.highValueThreshold ?? settings.highValueThreshold,
                requireApprovalEnabled: data.requireApprovalEnabled ?? settings.requireApprovalEnabled,
            }
        });
    }

    async getAuditLogs() {
        return this.prisma.adminAuditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    async getLoginLogs() {
        return this.prisma.loginLog.findMany({
            include: { adminUser: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    async createAuditLog(data: { action: string, performedBy: string, targetId?: string, details?: any }) {
        return this.prisma.adminAuditLog.create({
            data: {
                action: data.action,
                performedBy: data.performedBy,
                targetId: data.targetId,
                details: data.details
            }
        });
    }
}
