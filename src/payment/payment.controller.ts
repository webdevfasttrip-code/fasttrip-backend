import { Controller, Post, Headers, Req, BadRequestException, Logger, RawBodyRequest, Body } from '@nestjs/common';
import type { Request } from 'express';
import { BookingService } from '../booking/booking.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('Payment')
@Controller({
    path: 'payment',
    version: '1',
})
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly bookingService: BookingService,
        private readonly razorpayService: RazorpayService,
    ) { }

    @Post('visa-order')
    @ApiOperation({ summary: 'Create generic Razorpay Order for Visa' })
    async createVisaOrder(@Body() body: { amount: number }) {
        const order = await this.razorpayService.createOrder(body.amount, `visa_${Date.now()}`);
        return { orderId: order.id, amount: order.amount, currency: order.currency };
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify Razorpay Payment' })
    async verifyPayment(@Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; bookingRef: string }) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingRef } = body;
        this.logger.log(`Verifying payment for bookingRef: ${bookingRef}, OrderId: ${razorpay_order_id}`);
        
        try {
            const text = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
                .update(text)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                this.logger.error(`Invalid Signature for bookingRef: ${bookingRef}`);
                throw new BadRequestException('Invalid Signature');
            }

            this.logger.log(`Signature valid. Confirming booking for bookingRef: ${bookingRef}`);
            const confirmedBooking = await this.bookingService.confirmBookingAfterPayment({
                paymentId: razorpay_payment_id,
                signature: razorpay_signature,
                orderId: razorpay_order_id,
            });

            this.logger.log(`Booking confirmed. PNR: ${confirmedBooking?.pnr}, Ref: ${confirmedBooking?.bookingRef}`);
            return { 
                status: 'success', 
                pnr: confirmedBooking?.pnr || bookingRef, 
                bookingRef: confirmedBooking?.bookingRef || bookingRef 
            };
        } catch (err) {
            this.logger.error(`Payment verification failed: ${err.message}`, err.stack);
            if (err instanceof BadRequestException) throw err;
            throw new BadRequestException(err.message || 'Payment verification failed');
        }
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Handle Razorpay Webhook' })
    @ApiResponse({ status: 200, description: 'Webhook processed' })
    @ApiResponse({ status: 400, description: 'Invalid signature or missing body' })
    async handleWebhook(
        @Req() req: any,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        if (!signature) {
            this.logger.error('Missing Razorpay signature header');
            throw new BadRequestException('Missing signature');
        }

        const rawBodyBuffer = req.rawBody;
        if (!rawBodyBuffer) {
            this.logger.error('Raw body not available for signature verification');
            throw new BadRequestException('Raw body missing');
        }

        const rawBody = rawBodyBuffer.toString();

        if (!this.razorpayService.verifyWebhookSignature(rawBody, signature)) {
            this.logger.error('Invalid Razorpay signature');
            throw new BadRequestException('Invalid signature');
        }

        const event = JSON.parse(rawBody);
        this.logger.log(`Received Razorpay event: ${event.event}`);

        // Handle payment.captured
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            this.logger.log(`Processing captured payment: ${paymentId} for order: ${orderId}`);

            await this.bookingService.confirmBookingAfterPayment({
                paymentId,
                signature,
                orderId,
            });
        } else if (event.event === 'payment.failed') {
            const payment = event.payload.payment.entity;
            this.logger.warn(`Payment failed for order: ${payment.order_id}`);
        }

        return { status: 'ok' };
    }
}
