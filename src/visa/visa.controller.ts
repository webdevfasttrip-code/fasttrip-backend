import { Controller, Get, Param } from '@nestjs/common';
import { VisaService } from './visa.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Visa')
@Controller({
  path: 'visa',
  version: '1',
})
export class VisaController {
  constructor(private readonly visaService: VisaService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all active visa countries' })
  async getAllCountries() {
    return this.visaService.findAllCountries();
  }

  @Get('destinations')
  @ApiOperation({ summary: 'Get all active destinations for search' })
  async getAllDestinations() {
    return this.visaService.getAllDestinations();
  }

  @Get('destinations/featured')
  @ApiOperation({ summary: 'Get featured destinations for homepage' })
  async getFeaturedDestinations() {
    return this.visaService.getFeaturedDestinations();
  }

  @Get('country/:slug')
  @ApiOperation({ summary: 'Get visa details for a specific country by slug' })
  async getCountryBySlug(@Param('slug') slug: string) {
    return this.visaService.findCountryBySlug(slug);
  }
}
