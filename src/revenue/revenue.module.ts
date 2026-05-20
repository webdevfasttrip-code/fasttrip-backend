import { Module } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
