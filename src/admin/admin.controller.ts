import { Controller, Get, Post, Patch, Param, Query, UseGuards, Body, UseInterceptors } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingStatus, CancelStatus, AdminRole, TicketStatus } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
    path: 'admin',
    version: '1',
})
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Get aggregated KPI stats and real-time trends' })
    async getStats() {
        return this.adminService.getAggregatedStats();
    }

    @Get('dashboard')
    @Permissions('VIEW_BOOKINGS', 'VIEW_REVENUE')
    @ApiOperation({ summary: 'Get fallback dashboard stats' })
    async getDashboardStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('bookings')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'List all bookings' })
    async getBookings(
        @Query('status') status?: BookingStatus,
        @Query('cancelStatus') cancelStatus?: CancelStatus,
        @Query('search') search?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.adminService.getBookings({ status, cancelStatus, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit): undefined });
    }

    @Get('bookings/:id')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'Get a specific booking' })
    async getBookingById(@Param('id') id: string) {
        return this.adminService.getBookingById(id);
    }

    @Post('bookings/:id/approve-cancel')
    @Permissions('CANCEL_BOOKING')
    @ApiOperation({ summary: 'Approve cancel request' })
    async approveCancel(@Param('id') id: string) {
        return this.adminService.approveCancel(id);
    }

    @Post('bookings/:id/reject-cancel')
    @Permissions('CANCEL_BOOKING')
    @ApiOperation({ summary: 'Reject cancel request' })
    async rejectCancel(@Param('id') id: string) {
        return this.adminService.rejectCancel(id);
    }

    @Post('bookings/:id/mark-ticketed')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'Mark booking as ticketed and save PNR' })
    async markTicketed(@Param('id') id: string, @Body() data: { pnr: string }) {
        return this.adminService.markTicketed(id, data.pnr);
    }

    @Post('bookings/:id/mark-failed')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'Mark booking as failed' })
    async markFailed(@Param('id') id: string) {
        return this.adminService.markFailed(id);
    }

    @Patch('bookings/:id/assign')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'Assign an agent to a booking' })
    async assignAgent(@Param('id') bookingId: string, @Body() data: { agentId: string }) {
        return this.adminService.assignAgent(bookingId, data.agentId);
    }

    @Post('bookings/offline')
    @Permissions('VIEW_BOOKINGS')
    @ApiOperation({ summary: 'Create an offline booking' })
    async createOfflineBooking(@Body() data: any) {
        return this.adminService.createOfflineBooking(data);
    }

    @Get('users')
    @Permissions('VIEW_USERS')
    @ApiOperation({ summary: 'List all regular users' })
    async getUsers() {
        return this.adminService.getUsers();
    }

    @Get('staff')
    @Permissions('VIEW_USERS')
    @ApiOperation({ summary: 'List all staff members' })
    async getStaff() {
        return this.adminService.getStaff();
    }

    @Post('staff')
    @Permissions('MANAGE_USERS')
    @ApiOperation({ summary: 'Create a new staff member' })
    async createStaff(@Body() data: any) {
        return this.adminService.createStaff(data);
    }

    @Post('users/:id/block')
    @Permissions('MANAGE_USERS')
    @ApiOperation({ summary: 'Block a user' })
    async blockUser(@Param('id') id: string) {
        return this.adminService.blockUser(id);
    }

    @Get('support')
    @Permissions('VIEW_BOOKINGS') // Generic permission for now
    @ApiOperation({ summary: 'List all support tickets' })
    async getSupportTickets() {
        return this.adminService.getSupportTickets();
    }

    @Patch('support/:id/status')
    @Permissions('VIEW_BOOKINGS') // Generic permission for now
    @ApiOperation({ summary: 'Update support ticket status' })
    async updateTicketStatus(@Param('id') id: string, @Body() data: { status: TicketStatus }) {
        return this.adminService.updateTicketStatus(id, data.status);
    }

    @Get('finance/ledger')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Get all ledger entries' })
    async getLedger() {
        return this.adminService.getLedger();
    }

    @Get('finance/profit')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Get total profit and supplier costs' })
    async getProfitStats() {
        return this.adminService.getProfitStats();
    }

    @Get('refunds')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'List all refund requests' })
    async getRefunds() {
        return this.adminService.getRefunds();
    }

    @Patch('refunds/:id/process')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Process a refund' })
    async processRefund(@Param('id') id: string) {
        return this.adminService.processRefund(id);
    }

    @Get('finance/reconciliation')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'List mismatched payments' })
    async getReconciliation() {
        return this.adminService.getReconciliation();
    }

    @Get('automation/settings')
    @Permissions('VIEW_REVENUE') // Generic permission for now
    @ApiOperation({ summary: 'Get automation settings' })
    async getAutomationSettings() {
        return this.adminService.getAutomationSettings();
    }

    @Patch('automation/settings')
    @Permissions('VIEW_REVENUE') // Generic permission for now
    @ApiOperation({ summary: 'Update automation settings' })
    async updateAutomationSettings(@Body() data: any) {
        return this.adminService.updateAutomationSettings(data);
    }

    @Get('analytics/airlines')
    @Permissions('VIEW_REVENUE')
    async getAirlineReport() {
        return this.adminService.getAirlineReport();
    }

    @Get('analytics/routes')
    @Permissions('VIEW_REVENUE')
    async getRouteReport() {
        return this.adminService.getRouteReport();
    }

    @Get('analytics/agents')
    @Permissions('VIEW_REVENUE')
    async getAgentPerformance() {
        return this.adminService.getAgentPerformance();
    }

    @Get('analytics/conversion')
    @Permissions('VIEW_REVENUE')
    async getConversionRate() {
        return this.adminService.getConversionRate();
    }

    @Get('analytics/peak-hours')
    @Permissions('VIEW_REVENUE')
    async getPeakHours() {
        return this.adminService.getPeakHours();
    }

    @Get('analytics/failed-searches')
    @Permissions('VIEW_REVENUE')
    async getFailedSearches() {
        return this.adminService.getFailedSearches();
    }

    @Get('security/audit-logs')
    @Permissions('SUPER_ADMIN')
    async getAuditLogs() {
        return this.adminService.getAuditLogs();
    }

    @Get('security/login-logs')
    @Permissions('SUPER_ADMIN')
    async getLoginLogs() {
        return this.adminService.getLoginLogs();
    }
}
