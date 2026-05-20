import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CRMService } from './crm.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AdminRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin CRM')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
    path: 'admin/crm',
    version: '1',
})
export class CRMController {
    constructor(private readonly crmService: CRMService) { }

    @Get('customers')
    @ApiOperation({ summary: 'Get all customers with advanced filtering' })
    async getCustomers(@Query() query: any) {
        return this.crmService.getCustomers(query);
    }

    @Get('insights')
    async getInsights() {
        return this.crmService.getCRMInsights();
    }

    @Get('customers/:id')
    async getCustomerById(@Param('id') id: string) {
        return this.crmService.getCustomerById(id);
    }

    @Patch('customers/:id/status')
    async updateStatus(@Param('id') id: string, @Body('isBlocked') isBlocked: boolean) {
        return this.crmService.updateCustomerStatus(id, isBlocked);
    }

    @Patch('customers/:id/notes')
    async updateNotes(@Param('id') id: string, @Body('notes') notes: string) {
        return this.crmService.updateInternalNotes(id, notes);
    }
}
