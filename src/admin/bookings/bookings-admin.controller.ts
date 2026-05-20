import { Controller, Get, UseGuards } from '@nestjs/common';
import { BookingsAdminService } from './bookings-admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({
    path: 'admin/bookings',
    version: '1',
})
@UseGuards(AuthGuard('admin-jwt'), RolesGuard, PermissionsGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class BookingsAdminController {
    constructor(private readonly bookingsService: BookingsAdminService) { }

    @Get()
    @ApiOperation({ summary: 'List all bookings' })
    @Permissions('VIEW_BOOKINGS')
    findAll() {
        return this.bookingsService.findAll();
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get booking metrics and stats' })
    @Permissions('VIEW_REVENUE')
    getStats() {
        return this.bookingsService.getStats();
    }

    @Get('revenue')
    @ApiOperation({ summary: 'Get revenue analytics by supplier' })
    @Permissions('VIEW_REVENUE')
    getRevenue() {
        return this.bookingsService.getRevenueAnalytics();
    }
}
