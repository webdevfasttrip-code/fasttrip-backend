import { Controller, Get, Post, Body, Query, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightDto } from './dto/search-flight.dto';
import { FaresDto } from './dto/fares.dto';
import { LockFareDto } from './dto/lock-fare.dto';
import { BookFlightDto } from './dto/book-flight.dto';
import { TicketDto } from './dto/ticket.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Flights')
@Controller({ path: 'flights', version: '1' })
export class FlightsController {
    constructor(private readonly flightsService: FlightsService) { }

    @Get('test-providers')
    @ApiOperation({ summary: 'Validate provider responses' })
    async testProviders(@Query() dto: SearchFlightDto) {
        return this.flightsService.testProviders(dto);
    }

    @Get('mvfd/sectors')
    @ApiOperation({ summary: 'Get available sectors for Makevoyage Fixed Departures' })
    async getMVFDSectors() {
        return this.flightsService.getMVFDSectors();
    }

    @Post('search')
    @ApiOperation({ summary: 'Search flight offers' })
    @UsePipes(new ValidationPipe({ transform: true }))
    async search(@Body() dto: SearchFlightDto) {
        return this.flightsService.search(dto);
    }

    @Post('validate-roundtrip-price')
    @ApiOperation({ summary: 'Validate round-trip price' })
    async validateRoundtripPrice(@Body() offer: any) {
        return this.flightsService.validateRoundtripPrice(offer);
    }

    @Get('status')
    @ApiOperation({ summary: 'Get flight status' })
    async status(@Query() query: { airline: string; flightNumber: string; date?: string }) {
        return this.flightsService.status(query);
    }

    @Get('fares')
    @ApiOperation({ summary: 'Retrieve fare list' })
    async getFares(@Query() dto: FaresDto) {
        return this.flightsService.getFares(dto);
    }

    @Post('lock-fare')
    @ApiOperation({ summary: 'Lock a fare' })
    async lockFare(@Body() dto: LockFareDto) {
        return this.flightsService.lockFare(dto);
    }

    @Post('upsell')
    @ApiOperation({ summary: 'Get Upsell Branded Fares' })
    async getUpsellOffers(@Body() dto: { offer: any }) {
        return this.flightsService.getUpsellOffers(dto.offer);
    }

    @Post('seatmap')
    @ApiOperation({ summary: 'Get seat map for flight offer' })
    async getSeatMap(@Body() dto: { offer: any }) {
        return this.flightsService.getSeatMap(dto.offer);
    }

    @Post('pricing-ancillaries')
    @ApiOperation({ summary: 'Price offer with selected ancillaries (Review Module)' })
    async priceOfferWithAncillaries(@Body() dto: any) {
        return this.flightsService.priceOfferWithAncillaries(dto);
    }

    @Post('book')
    @ApiOperation({ summary: 'Create booking' })
    async book(@Body() dto: BookFlightDto) {
        return this.flightsService.book(dto);
    }

    @Post('initiate')
    @ApiOperation({ summary: 'Initiate supplier booking' })
    async initiate(@Body() dto: any) {
        return this.flightsService.initiate(dto);
    }

    @Post('ticket')
    @ApiOperation({ summary: 'Issue ticket' })
    async ticket(@Body() dto: TicketDto) {
        return this.flightsService.ticket(dto);
    }

    @Get('bookings/:id')
    @ApiOperation({ summary: 'Fetch booking by ID' })
    async getBooking(@Param('id') id: string) {
        return this.flightsService.getBooking(id);
    }
}
