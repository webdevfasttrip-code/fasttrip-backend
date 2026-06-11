import { Controller, Post, Headers, Req, BadRequestException, Logger, RawBodyRequest, Body, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { BookingService } from '../booking/booking.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
    async createVisaOrder(@Body() body: any, @Req() req: any) {
        try {
            const order = await this.razorpayService.createOrder(body.amount, `visa_${Date.now()}`);
            
            let bookingRef = `FTV-${(body.country || 'XX').slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;
            
            // Extract token manually to see if user is logged in
            let userId: string | null = null;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                } catch (e) {}
            }
            
            // Find or create guest user
            if (!userId && body.contactEmail) {
                let user = await this.bookingService['prisma'].user.findUnique({ where: { email: body.contactEmail } });
                if (!user) {
                    user = await this.bookingService['prisma'].user.create({
                        data: {
                            email: body.contactEmail,
                            name: body.contactEmail.split('@')[0],
                            phone: body.contactPhone || null,
                        }
                    });
                }
                userId = user.id;
            }

            // Save as a Booking so it appears in My Bookings
            if (userId) {
                
                // Extract documents from travellers
                let allDocuments: any[] = [];
                let mappedPassengers: any[] = [];
                
                if (body.travellers && Array.isArray(body.travellers)) {
                    body.travellers.forEach((t: any) => {
                        mappedPassengers.push({
                            firstName: t.firstName || '',
                            lastName: t.lastName || '',
                            gender: t.gender || 'Unknown',
                            type: t.type || 'ADT',
                            dateOfBirth: t.dob ? new Date(t.dob) : null,
                            passportNumber: t.passportNumber || null,
                            nationality: t.nationality || '',
                        });
                        
                        if (t.passportFront) {
                            allDocuments.push({
                                name: 'Passport Front',
                                url: t.passportFront.base64 || t.passportFront.url || t.passportFront.preview || '',
                                fileName: t.passportFront.name || 'passport_front.jpg',
                                travellerName: t.firstName || 'Traveller',
                                status: 'UPLOADED',
                                date: new Date().toISOString()
                            });
                        }
                        
                        if (t.passportBack) {
                            allDocuments.push({
                                name: 'Passport Back',
                                url: t.passportBack.base64 || t.passportBack.url || t.passportBack.preview || '',
                                fileName: t.passportBack.name || 'passport_back.jpg',
                                travellerName: t.firstName || 'Traveller',
                                status: 'UPLOADED',
                                date: new Date().toISOString()
                            });
                        }
                        
                        if (t.photograph) {
                            allDocuments.push({
                                name: 'Photograph',
                                url: t.photograph.base64 || t.photograph.url || t.photograph.preview || '',
                                fileName: t.photograph.name || 'photograph.jpg',
                                travellerName: t.firstName || 'Traveller',
                                status: 'UPLOADED',
                                date: new Date().toISOString()
                            });
                        }

                        if (t.documents) {
                            Object.keys(t.documents).forEach(docKey => {
                                if (Array.isArray(t.documents[docKey])) {
                                    t.documents[docKey].forEach((file: any) => {
                                        allDocuments.push({
                                            name: docKey,
                                            url: file.base64 || file.url || file.preview || '',
                                            fileName: file.name || '',
                                            travellerName: t.firstName || 'Traveller',
                                            status: 'UPLOADED',
                                            date: new Date().toISOString()
                                        });
                                    });
                                }
                            });
                        }
                    });
                }

                await this.bookingService['prisma'].booking.create({
                    data: {
                        userId: userId,
                        bookingRef: bookingRef,
                        totalAmount: body.amount,
                        bookingStatus: 'PENDING',
                        paymentStatus: 'INITIATED',
                        supplier: 'VISA',
                        destination: body.country || 'Unknown',
                        origin: body.visaType || 'E-Visa', // Store visa type in origin
                        travelDate: body.travelDate ? new Date(body.travelDate) : null,
                        ttl: body.returnDate ? new Date(body.returnDate) : null, // Store return date in ttl for visas
                        contactEmail: body.contactEmail || '',
                        contactPhone: body.contactPhone || '',
                        paymentOrderId: order.id,
                        selectedFlightData: { travellers: body.travellers || [], travelDate: body.travelDate, returnDate: body.returnDate } as any,
                        visaDocuments: allDocuments as any,
                        passengers: {
                            create: mappedPassengers
                        }
                    }
                });
            }

            return { orderId: order.id, amount: order.amount, currency: order.currency, bookingRef };
        } catch (e) {
            this.logger.error('Error creating visa order: ' + e.message, e.stack);
            throw new BadRequestException('Failed to create visa order: ' + e.message);
        }
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
            
            // Fetch payment details to get payment method (UPI, Card, etc)
            let paymentMode = 'ONLINE';
            try {
                const rzpPayment = await this.razorpayService['razorpay'].payments.fetch(razorpay_payment_id);
                if (rzpPayment && rzpPayment.method) {
                    paymentMode = rzpPayment.method.toUpperCase();
                }
            } catch (e) {
                this.logger.error(`Failed to fetch razorpay payment details for mode: ${e.message}`);
            }

            const confirmedBooking = await this.bookingService.confirmBookingAfterPayment({
                paymentId: razorpay_payment_id,
                signature: razorpay_signature,
                orderId: razorpay_order_id,
                paymentMode: paymentMode
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

    @Post('failed')
    @ApiOperation({ summary: 'Log failed payment from frontend' })
    async logFailedPayment(@Body() body: { orderId: string; paymentId: string; reason: string }) {
        this.logger.log(`Frontend reported payment failed for order: ${body.orderId}, paymentId: ${body.paymentId}, reason: ${body.reason}`);
        
        try {
            const booking = await this.bookingService['prisma'].booking.findFirst({
                where: { paymentOrderId: body.orderId }
            });
            
            if (booking) {
                await this.bookingService['prisma'].booking.update({
                    where: { id: booking.id },
                    data: {
                        bookingStatus: 'FAILED',
                        paymentStatus: 'FAILED',
                        paymentId: body.paymentId,
                        cancelReason: body.reason,
                    }
                });
            }
        } catch (e) {
            this.logger.error("Failed to update booking status for failed payment", e);
        }
        
        return { status: 'logged' };
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
