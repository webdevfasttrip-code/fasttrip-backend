import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FlightsService } from '../../flights/flights.service';

@Injectable()
export class SuppliersAdminService {
    private readonly logger = new Logger(SuppliersAdminService.name);

    constructor(
        private prisma: PrismaService,
        private flightsService: FlightsService
    ) { }

    async findAll() {
        return this.prisma.supplierConfig.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                priority: true,
                timeout: true,
                isActive: true,
                errorRate: true,
                responseTime: true,
                endpoint: true,
                apiKey: true,
                createdAt: true,
                updatedAt: true,
                lastCheckedAt: true,
            },
            orderBy: { priority: 'asc' }
        });
    }

    async getSupplierBalance(name: string) {
        // Find if supplier exists - case insensitive
        const supplier = await this.prisma.supplierConfig.findFirst({
            where: { 
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });
        
        if (!supplier) {
            this.logger.error(`Supplier matching name "${name}" not found in DB`);
            throw new NotFoundException(`Supplier ${name} not found`);
        }

        try {
            // Standardize name for provider manager
            const normalizedName = name.toUpperCase();
            const providerKey = (normalizedName === 'MVFD' || normalizedName === 'MAKEVOYAGE') ? 'makevoyage' : name;
            
            this.logger.log(`Fetching live balance for ${name} using provider key: ${providerKey}`);
            const balance = await this.flightsService.getWalletBalance(providerKey);
            
            // Update last checked time in DB
            await this.prisma.supplierConfig.update({
                where: { id: supplier.id },
                data: { lastCheckedAt: new Date() }
            });

            return { ...balance, success: true };
        } catch (err) {
            this.logger.error(`Error fetching balance for ${name}: ${err.message}`);
            return { 
                balance: 0, 
                credit: 0, 
                currency: 'INR', 
                success: false, 
                error: err.message 
            };
        }
    }

    async create(data: any) {
        return this.prisma.supplierConfig.create({
            data: {
                name: data.name,
                apiKey: data.apiKey,
                apiSecret: data.apiSecret,
                isActive: data.isActive ?? true,
                type: data.type || 'GDS'
            },
        });
    }

    async update(id: string, data: any) {
        const supplier = await this.prisma.supplierConfig.findUnique({ where: { id } });
        if (!supplier) throw new NotFoundException('Supplier not found');

        return this.prisma.supplierConfig.update({
            where: { id },
            data: {
                ...data,
                name: data.name || supplier.name,
            },
        });
    }
}
