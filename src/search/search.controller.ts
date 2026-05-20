import {
    Controller,
    Post,
    Body,
    UsePipes,
    ValidationPipe,
    Get,
    Query,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchFlightDto } from '../flights/dto/search-flight.dto';
import { SearchAirportDto } from './dto/search-airport.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Param } from '@nestjs/common';
import { FareResult } from './interfaces/fare-result.interface';

@ApiTags('Search')
@Controller({
    path: 'search',
    version: '1',
})
export class SearchController {
    constructor(private searchService: SearchService) { }

    @Post()
    @ApiOperation({ summary: 'Search for flight offers' })
    @ApiResponse({ status: 201, description: 'List of flight offers return' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async search(@Body() body: SearchFlightDto) {
        return this.searchService.search(body);
    }

    @Get('airports')
    @ApiOperation({ summary: 'Search for airports/cities' })
    @ApiResponse({ status: 200, description: 'List of airports return' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async searchAirports(@Query() query: SearchAirportDto) {
        return this.searchService.searchAirports(query);
    }

    @Get('airports/nearby')
    @ApiOperation({ summary: 'Get nearby airports based on Haversine distance' })
    @ApiResponse({ status: 200, description: 'List of nearby airports' })
    async getNearbyAirports(@Query('iataCode') iataCode: string) {
        return this.searchService.getNearbyAirports(iataCode);
    }

    @Post('airports/bulk')
    @ApiOperation({ summary: 'Get multiple airports by IATA codes' })
    @ApiResponse({ status: 201, description: 'List of enriched airports' })
    async getAirportsByCodes(@Body() body: { codes: string[] }) {
        return this.searchService.getAirportsByCodes(body.codes);
    }

    @Post('revalidate')
    @ApiOperation({ summary: 'Revalidate a flight offer price' })
    @ApiResponse({ status: 201, description: 'Revalidated pricing return' })
    async revalidate(@Body() body: { supplier: string; rawOffer: any }) {
        return this.searchService.revalidate(body.supplier, body.rawOffer);
    }

    @Get('calendar')
    @ApiOperation({ summary: 'Get cheapest fares for a date range' })
    async getCalendar(
        @Query('origin') origin: string,
        @Query('destination') destination: string,
        @Query('date') date: string
    ): Promise<FareResult[]> {
        return this.searchService.getCalendar(origin, destination, date);
    }
}
