import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { MarkupService } from './markup.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

@ApiTags('Admin Markup')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
    path: 'admin/markup',
    version: '1',
})
export class MarkupController {
    constructor(private readonly markupService: MarkupService) { }

    @Get()
    @ApiOperation({ summary: 'Get all markup rules' })
    async getAllRules() {
        return this.markupService.getAllRules();
    }

    @Post()
    @ApiOperation({ summary: 'Create or update a markup rule' })
    async upsertRule(@Body() data: any) {
        return this.markupService.upsertRule(data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a markup rule' })
    async deleteRule(@Param('id') id: string) {
        return this.markupService.deleteRule(id);
    }
}
