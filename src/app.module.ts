import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './booking/booking.module';
import { RazorpayModule } from './razorpay/razorpay.module';
import { SearchModule } from './search/search.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';

import { FlightsModule } from './flights/flights.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PromoModule } from './promo/promo.module';
import { RevenueModule } from './revenue/revenue.module';
import { VisaModule } from './visa/visa.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BookingModule,
    RazorpayModule,
    SearchModule,
    PaymentModule,
    AdminModule,
    FlightsModule,
    EmailModule,
    AuthModule,
    UsersModule,
    PromoModule,
    RevenueModule,
    VisaModule,
  ],
})
export class AppModule { }
