import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AdminRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Supplier Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
  path: 'admin/suppliers',
  version: '1',
})
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers with health metrics' })
  async findAll() {
    return this.supplierService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier configuration (Timeout, Priority, etc.)' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.supplierService.update(id, data);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Kill Switch: Enable or Disable supplier' })
  async toggle(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.supplierService.toggleStatus(id, isActive);
  }

  @Get('balance/:name')
  @ApiOperation({ summary: 'Get live wallet balance for a supplier' })
  async getWalletBalance(@Param('name') name: string) {
    return this.supplierService.getSupplierBalance(name);
  }
}
