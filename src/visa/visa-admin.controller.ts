import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VisaService } from './visa.service';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { CreateVisaCountryDto, UpdateVisaCountryDto } from './dto/visa-country.dto';

@ApiTags('Admin Visa')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller({
  path: 'admin/visa',
  version: '1',
})
export class VisaAdminController {
  constructor(private readonly visaService: VisaService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries for admin' })
  async getAllCountries() {
    console.log('GET /admin/visa/countries - Request received');
    const countries = await this.visaService.findAllCountries();
    console.log(`GET /admin/visa/countries - Found ${countries.length} records`);
    return countries;
  }

  @Get('country/:id')
  @ApiOperation({ summary: 'Get full country details for editing' })
  async getCountryById(@Param('id') id: string) {
    return this.visaService.getAdminCountryById(id);
  }

  @Post('country')
  @ApiOperation({ summary: 'Create a new visa country with all details' })
  async createCountry(@Body() dto: CreateVisaCountryDto) {
    return this.visaService.createCountry(dto);
  }

  @Put('country/:id')
  @ApiOperation({ summary: 'Update a visa country and its nested details' })
  async updateCountry(@Param('id') id: string, @Body() dto: UpdateVisaCountryDto) {
    console.log('Admin updating country:', id);
    return this.visaService.updateCountry(id, dto);
  }

  @Delete('country/:id')
  @ApiOperation({ summary: 'Delete a visa country' })
  async deleteCountry(@Param('id') id: string) {
    return this.visaService.deleteCountry(id);
  }
}
