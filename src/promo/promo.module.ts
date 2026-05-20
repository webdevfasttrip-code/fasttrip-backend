import { Module } from '@nestjs/common';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [PromoController],
  providers: [PromoService, PrismaService, JwtService],
  exports: [PromoService],
})
export class PromoModule {}
