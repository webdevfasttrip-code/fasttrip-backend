import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MasterAdminService } from './master-admin.service';
import { Prisma } from '@prisma/client';
import { AdminJwtAuthGuard } from '../guards/admin-jwt.guard';

@Controller('admin/master')
@UseGuards(AdminJwtAuthGuard)
export class MasterAdminController {
    constructor(private readonly masterAdminService: MasterAdminService) {}

    // ==========================================
    // AIRPORTS
    // ==========================================

    @Get('airports')
    async getAirports(@Query() query: any) {
        return this.masterAdminService.getAirports(query);
    }

    @Post('airports')
    async createAirport(@Body() data: Prisma.AirportCreateInput) {
        return this.masterAdminService.createAirport(data);
    }

    @Put('airports/:id')
    async updateAirport(@Param('id') id: string, @Body() data: Prisma.AirportUpdateInput) {
        return this.masterAdminService.updateAirport(id, data);
    }

    @Delete('airports/:id')
    async deleteAirport(@Param('id') id: string) {
        return this.masterAdminService.deleteAirport(id);
    }

    // ==========================================
    // AIRLINES
    // ==========================================

    @Get('airlines')
    async getAirlines(@Query() query: any) {
        return this.masterAdminService.getAirlines(query);
    }

    @Post('airlines')
    async createAirline(@Body() data: Prisma.AirlineCreateInput) {
        return this.masterAdminService.createAirline(data);
    }

    @Put('airlines/:id')
    async updateAirline(@Param('id') id: string, @Body() data: Prisma.AirlineUpdateInput) {
        return this.masterAdminService.updateAirline(id, data);
    }

    @Delete('airlines/:id')
    async deleteAirline(@Param('id') id: string) {
        return this.masterAdminService.deleteAirline(id);
    }
}
