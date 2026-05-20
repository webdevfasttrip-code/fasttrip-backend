import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException, Version } from '@nestjs/common';
import { PromoService } from './promo.service';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { Permissions } from '../admin/decorators/permissions.decorator';
import { AdminRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Promo Codes')
@Controller('promo')
export class PromoController {
    constructor(private readonly promoService: PromoService) {}

    // Public / User Checkout Validation
    @Post('validate')
    @ApiOperation({ summary: 'Validate a promo code for checkout' })
    async validatePromo(@Body() data: { code: string, bookingAmount: number, context?: any }) {
        if (!data.code || !data.bookingAmount) {
            throw new BadRequestException('Code and bookingAmount are required');
        }
        return this.promoService.validatePromo(data.code, data.bookingAmount, data.context);
    }

    @Get('banners')
    @ApiOperation({ summary: 'Get active promo banners for frontend' })
    async getBanners() {
        return this.promoService.getBanners();
    }

    // Admin APIs
    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Get('admin/list')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Admin: List all promo codes' })
    async listPromos(@Query() filters: any) {
        return this.promoService.getPromos(filters);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Get('admin/detail/:id')
    @Permissions('VIEW_REVENUE')
    @ApiOperation({ summary: 'Admin: Get promo code detail' })
    async getPromoDetail(@Param('id') id: string) {
        return this.promoService.getPromoById(id);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Post('admin/create')
    @Permissions('MANAGE_PROMOS')
    @ApiOperation({ summary: 'Admin: Create a new promo code' })
    async createPromo(@Body() data: any) {
        return this.promoService.createPromo(data);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Patch('admin/:id')
    @Permissions('MANAGE_PROMOS')
    @ApiOperation({ summary: 'Admin: Update a promo code' })
    async updatePromo(@Param('id') id: string, @Body() data: any) {
        return this.promoService.updatePromo(id, data);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Get('admin/analytics')
    @Permissions('VIEW_REVENUE')
    async getAnalytics() {
        return this.promoService.getPromoAnalytics();
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Get('admin/banners')
    @Permissions('VIEW_REVENUE')
    async getAdminBanners() {
        return this.promoService.getAllBanners();
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Post('admin/banners')
    @Permissions('MANAGE_USERS')
    async createBanner(@Body() data: any) {
        return this.promoService.createBanner(data);
    }
    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Patch('admin/banners/:id')
    @Permissions('MANAGE_USERS')
    async updateBanner(@Param('id') id: string, @Body() data: any) {
        return this.promoService.updateBanner(id, data);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Delete('admin/banners/:id')
    @Permissions('MANAGE_USERS')
    async deleteBanner(@Param('id') id: string) {
        return this.promoService.deleteBanner(id);
    }
    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Get('admin/rules')
    @Permissions('MANAGE_PROMOS')
    async getRules(@Query('promoId') promoId: string) {
        return this.promoService.getRules(promoId);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Post('admin/rules')
    @Permissions('MANAGE_PROMOS')
    async createRule(@Body() data: any) {
        return this.promoService.createRule(data);
    }

    @ApiBearerAuth()
    @UseGuards(AdminJwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
    @Delete('admin/rules/:id')
    @Permissions('MANAGE_PROMOS')
    async deleteRule(@Param('id') id: string) {
        return this.promoService.deleteRule(id);
    }
}
