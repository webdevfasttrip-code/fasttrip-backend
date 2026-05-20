import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FlightsService } from '../../flights/flights.service';
import { SupplierType } from '@prisma/client';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private prisma: PrismaService,
    private flightsService: FlightsService
  ) {}

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

  async findAll() {
    return this.prisma.supplierConfig.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.supplierConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  async update(id: string, data: any) {
    const supplier = await this.prisma.supplierConfig.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.supplierConfig.update({
      where: { id },
      data,
    });
  }

  async toggleStatus(id: string, isActive: boolean) {
    return this.prisma.supplierConfig.update({
      where: { id },
      data: { isActive },
    });
  }

  async updatePriority(id: string, priority: number) {
    return this.prisma.supplierConfig.update({
      where: { id },
      data: { priority },
    });
  }

  // Routing Logic (Phase 2)
  async getRouting(flightType: 'DOMESTIC' | 'INTERNATIONAL', airlineCode?: string) {
    const activeSuppliers = await this.findActive();

    // Custom Routing Logic
    if (flightType === 'DOMESTIC') {
      // Prefer LCC if available
      return activeSuppliers.sort((a, b) => {
        if (a.type === 'LCC' && b.type !== 'LCC') return -1;
        if (a.type !== 'LCC' && b.type === 'LCC') return 1;
        return a.priority - b.priority;
      });
    }

    if (airlineCode === '6E' || airlineCode === 'I5') { // IndiGo or AirAsia
       // Always prefer LCC for these airlines
       return activeSuppliers.sort((a, b) => {
         if (a.type === 'LCC' && b.type !== 'LCC') return -1;
         return a.priority - b.priority;
       });
    }

    return activeSuppliers;
  }
}
