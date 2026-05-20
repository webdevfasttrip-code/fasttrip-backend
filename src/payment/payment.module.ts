import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { BookingModule } from '../booking/booking.module';
import { RazorpayModule } from '../razorpay/razorpay.module';

@Module({
    imports: [BookingModule, RazorpayModule],
    controllers: [PaymentController],
})
export class PaymentModule { }
