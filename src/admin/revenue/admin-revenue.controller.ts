import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../guards/admin-jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole, SectorType, SupplierType, MarkupType, FeeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin Revenue Control')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
    path: 'admin/revenue',
    version: '1',
})
export class AdminRevenueController {
    constructor(private prisma: PrismaService) { }

    // Markup Rules
    @Get('markup')
    @ApiOperation({ summary: 'Get all markup rules' })
    async getMarkupRules() {
        return this.prisma.markupRule.findMany({
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        });
    }

    @Post('markup')
    @ApiOperation({ summary: 'Create or update markup rule' })
    async upsertMarkupRule(@Body() data: any) {
        if (data.id) {
            return this.prisma.markupRule.update({
                where: { id: data.id },
                data,
            });
        }
        return this.prisma.markupRule.create({ data });
    }

    @Delete('markup/:id')
    async deleteMarkupRule(@Param('id') id: string) {
        return this.prisma.markupRule.delete({ where: { id } });
    }

    // Convenience Fees
    @Get('fees')
    @ApiOperation({ summary: 'Get all convenience fees' })
    async getFees() {
        return this.prisma.convenienceFee.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    @Post('fees')
    @ApiOperation({ summary: 'Create or update convenience fee' })
    async upsertFee(@Body() data: any) {
        if (data.id) {
            return this.prisma.convenienceFee.update({
                where: { id: data.id },
                data,
            });
        }
        return this.prisma.convenienceFee.create({ data });
    }

    @Delete('fees/:id')
    async deleteFee(@Param('id') id: string) {
        return this.prisma.convenienceFee.delete({ where: { id } });
    }

    @Get('config')
    async getConfigEnums() {
        return {
            sectors: Object.values(SectorType),
            suppliers: Object.values(SupplierType),
            markupTypes: Object.values(MarkupType),
            feeTypes: Object.values(FeeType)
        };
    }
}
