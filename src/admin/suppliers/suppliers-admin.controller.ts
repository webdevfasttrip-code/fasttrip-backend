import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SuppliersAdminService } from './suppliers-admin.service';
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
    path: 'admin/suppliers',
    version: '1',
})
@UseGuards(AuthGuard('admin-jwt'), RolesGuard, PermissionsGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class SuppliersAdminController {
    constructor(private readonly suppliersService: SuppliersAdminService) { }

    @Get()
    @ApiOperation({ summary: 'List all supplier configurations' })
    @Permissions('MANAGE_SUPPLIERS')
    findAll() {
        return this.suppliersService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create a new supplier configuration' })
    @Permissions('MANAGE_SUPPLIERS')
    create(@Body() data: any) {
        return this.suppliersService.create(data);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an existing supplier configuration' })
    @Permissions('MANAGE_SUPPLIERS')
    update(@Param('id') id: string, @Body() data: any) {
        return this.suppliersService.update(id, data);
    }

    @Patch(':id/toggle')
    @ApiOperation({ summary: 'Toggle supplier active status' })
    @Permissions('MANAGE_SUPPLIERS')
    toggle(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.suppliersService.update(id, { isActive });
    }

    @Get(':name/balance')
    @ApiOperation({ summary: 'Get live wallet balance for a supplier' })
    @Permissions('MANAGE_SUPPLIERS')
    getWalletBalance(@Param('name') name: string) {
        return this.suppliersService.getSupplierBalance(name);
    }
}
