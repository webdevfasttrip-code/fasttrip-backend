import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkupType, SectorType, SupplierType, FeeType } from '@prisma/client';

export interface PricingContext {
  baseFare: number;
  taxes: number;
  airlineCode: string;
  origin: string;
  destination: string;
  sector: SectorType;
  supplier: SupplierType;
  userType: string; // B2C, AGENT, VIP
  cabinClass?: string;
  paymentMethod?: string;
  passengerCount: number;
}

export interface PricingBreakdown {
  baseFare: number;
  taxes: number;
  markup: number;
  convenienceFee: number;
  totalPayable: number;
  appliedMarkupRule?: string;
  appliedFeeRule?: string;
}

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(private prisma: PrismaService) {}

  async calculateFinalPricing(context: PricingContext): Promise<PricingBreakdown> {
    const { baseFare, taxes, passengerCount } = context;

    // 1. Calculate Markup
    const markupResult = await this.getMarkup(context);
    
    // 2. Calculate Convenience Fee
    const feeResult = await this.getConvenienceFee(context);

    const totalPayable = baseFare + taxes + markupResult.value + feeResult.value;

    return {
      baseFare,
      taxes,
      markup: markupResult.value,
      convenienceFee: feeResult.value,
      totalPayable,
      appliedMarkupRule: markupResult.ruleName,
      appliedFeeRule: feeResult.ruleName,
    };
  }

  private async getMarkup(context: PricingContext): Promise<{ value: number; ruleName: string }> {
    const rules = await this.prisma.markupRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    // Filtering logic based on non-null conditions
    const matchedRule = rules.find((rule) => {
      const airlineMatch = !rule.airlineCode || rule.airlineCode === context.airlineCode;
      const sectorMatch = rule.sector === 'ALL' || rule.sector === context.sector;
      const supplierMatch = rule.supplier === 'ALL' || rule.supplier === context.supplier;
      const cabinMatch = !rule.cabinClass || rule.cabinClass === context.cabinClass;
      const userMatch = !rule.userType || rule.userType === context.userType;
      const routeFromMatch = !rule.routeFrom || rule.routeFrom === context.origin;
      const routeToMatch = !rule.routeTo || rule.routeTo === context.destination;

      return airlineMatch && sectorMatch && supplierMatch && cabinMatch && userMatch && routeFromMatch && routeToMatch;
    });

    if (!matchedRule) {
      this.logger.warn(`No markup rule matched for ${context.airlineCode}. Returning 0.`);
      return { value: 0, ruleName: 'NONE' };
    }

    let markupValue = 0;
    if (matchedRule.markupType === MarkupType.FLAT) {
      markupValue = matchedRule.markupValue;
    } else {
      markupValue = (context.baseFare * matchedRule.markupValue) / 100;
    }

    return { value: Math.round(markupValue), ruleName: matchedRule.name };
  }

  private async getConvenienceFee(context: PricingContext): Promise<{ value: number; ruleName: string }> {
    const fees = await this.prisma.convenienceFee.findMany({
      where: { isActive: true },
    });

    // Best match for fees
    const matchedFee = fees.find((fee) => {
      const airlineMatch = !fee.airlineCode || fee.airlineCode === context.airlineCode;
      const sectorMatch = fee.sector === 'ALL' || fee.sector === context.sector;
      const paymentMatch = !fee.paymentMethod || fee.paymentMethod === context.paymentMethod;
      const userMatch = !fee.userType || fee.userType === context.userType;

      return airlineMatch && sectorMatch && paymentMatch && userMatch;
    });

    if (!matchedFee) return { value: 0, ruleName: 'NONE' };

    let feeValue = 0;
    if (matchedFee.type === FeeType.PER_PAX) {
      feeValue = matchedFee.value * context.passengerCount;
    } else if (matchedFee.type === FeeType.PER_PNR) {
      feeValue = matchedFee.value;
    } else if (matchedFee.type === FeeType.PERCENTAGE) {
      feeValue = ((context.baseFare + context.taxes) * matchedFee.value) / 100;
    }

    return { value: Math.round(feeValue), ruleName: matchedFee.name };
  }
}
