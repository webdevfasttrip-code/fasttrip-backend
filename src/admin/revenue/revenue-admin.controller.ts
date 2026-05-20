import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MarkupService } from '../markup/markup.service';
import { SeriesFareService } from '../series-fares/series-fares.service';
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
    path: 'admin/revenue',
    version: '1',
})
@UseGuards(AuthGuard('admin-jwt'), RolesGuard, PermissionsGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class RevenueAdminController {
    constructor(
        private readonly markupService: MarkupService,
        private readonly seriesFareService: SeriesFareService,
    ) { }

    // Markup Rules
    @Get('markup')
    @ApiOperation({ summary: 'List all markup rules' })
    @Permissions('VIEW_REVENUE')
    getAllMarkup() {
        return this.markupService.getAllRules();
    }

    @Post('markup')
    @ApiOperation({ summary: 'Create or update a markup rule' })
    @Permissions('MANAGE_MARKUP')
    createMarkup(@Body() data: any) {
        return this.markupService.upsertRule(data);
    }

    @Delete('markup/:id')
    @ApiOperation({ summary: 'Delete a markup rule' })
    @Permissions('MANAGE_MARKUP')
    deleteMarkup(@Param('id') id: string) {
        return this.markupService.deleteRule(id);
    }

    // Series Fares
    @Get('series-fares')
    @ApiOperation({ summary: 'List all series fare overrides' })
    @Permissions('VIEW_REVENUE')
    getAllSeries() {
        return this.seriesFareService.getAll();
    }

    @Post('series-fares')
    @ApiOperation({ summary: 'Create a new series fare override' })
    @Permissions('MANAGE_SERIES_FARES')
    createSeries(@Body() data: any) {
        return this.seriesFareService.create(data);
    }

    @Patch('series-fares/:id')
    @ApiOperation({ summary: 'Update an existing series fare override' })
    @Permissions('MANAGE_SERIES_FARES')
    updateSeries(@Param('id') id: string, @Body() data: any) {
        return this.seriesFareService.update(id, data);
    }
}
