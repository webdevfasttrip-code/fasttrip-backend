import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingGateway } from './booking.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { SearchModule } from '../search/search.module';
import { AdminModule } from '../admin/admin.module';
import { EmailModule } from '../email/email.module';
import { PromoModule } from '../promo/promo.module';
import { RevenueModule } from '../revenue/revenue.module';
import { FlightsModule } from '../flights/flights.module';

import { TicketingService } from './ticketing.service';
import { TicketPdfService } from './ticket-pdf.service';

@Module({
  imports: [PrismaModule, RazorpayModule, SearchModule, AdminModule, EmailModule, PromoModule, RevenueModule, FlightsModule],
  controllers: [BookingController],
  providers: [BookingService, BookingGateway, TicketingService, TicketPdfService],
  exports: [BookingService, TicketingService, TicketPdfService],
})
export class BookingModule { }
