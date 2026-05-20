import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MasterAdminService {
    constructor(private prisma: PrismaService) {}

    // AIRPORTS

    async getAirports(query: { search?: string; type?: string; country?: string; isSearchable?: string; isMajor?: string; take?: number; skip?: number }) {
        const { search, type, country, isSearchable, isMajor, take = 50, skip = 0 } = query;
        const where: Prisma.AirportWhereInput = {};

        if (search) {
            where.OR = [
                { iataCode: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { airportName: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (type) where.airportType = type;
        if (country) where.isoCountry = country;
        if (isSearchable !== undefined) where.isSearchable = isSearchable === 'true';
        if (isMajor !== undefined) where.isMajor = isMajor === 'true';

        const [data, total] = await Promise.all([
            this.prisma.airport.findMany({
                where,
                take: Number(take),
                skip: Number(skip),
                orderBy: [{ priorityScore: 'desc' }, { isMajor: 'desc' }, { iataCode: 'asc' }]
            }),
            this.prisma.airport.count({ where })
        ]);

        return { data, total, page: skip / take + 1, limit: take };
    }

    async createAirport(data: Prisma.AirportCreateInput) {
        return this.prisma.airport.create({ data });
    }

    async updateAirport(id: string, data: Prisma.AirportUpdateInput) {
        return this.prisma.airport.update({ where: { id }, data });
    }

    async deleteAirport(id: string) {
        return this.prisma.airport.delete({ where: { id } });
    }

    // AIRLINES

    async getAirlines(query: { search?: string; isActive?: string; isSearchable?: string; take?: number; skip?: number }) {
        const { search, isActive, isSearchable, take = 50, skip = 0 } = query;
        const where: Prisma.AirlineWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { iata: { contains: search, mode: 'insensitive' } },
                { icao: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (isSearchable !== undefined) where.isSearchable = isSearchable === 'true';

        const [data, total] = await Promise.all([
            this.prisma.airline.findMany({
                where,
                take: Number(take),
                skip: Number(skip),
                orderBy: { name: 'asc' }
            }),
            this.prisma.airline.count({ where })
        ]);

        return { data, total, page: skip / take + 1, limit: take };
    }

    async createAirline(data: Prisma.AirlineCreateInput) {
        return this.prisma.airline.create({ data });
    }

    async updateAirline(id: string, data: Prisma.AirlineUpdateInput) {
        return this.prisma.airline.update({ where: { id }, data });
    }

    async deleteAirline(id: string) {
        return this.prisma.airline.delete({ where: { id } });
    }
}
