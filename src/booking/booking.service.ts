import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ManageBookingDto } from './dto/manage-booking.dto';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { RazorpayService } from '../razorpay/razorpay.service';
import { SearchService } from '../search/search.service';
import { MarkupService } from '../admin/markup/markup.service';
import { SeriesFareService } from '../admin/series-fares/series-fares.service';
import { EmailService } from '../email/email.service';
import { BookingGateway } from './booking.gateway';
import { PromoService } from '../promo/promo.service';
import { RevenueService } from '../revenue/revenue.service';
import { FlightsService } from '../flights/flights.service';
import { TicketingService } from './ticketing.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private searchService: SearchService,
    private markupService: MarkupService,
    private seriesFareService: SeriesFareService,
    private emailService: EmailService,
    private bookingGateway: BookingGateway,
    private promoService: PromoService,
    private revenueService: RevenueService,
    private flightsService: FlightsService,
    private ticketingService: TicketingService,
  ) { }

  /* -----------------------------
     Generate Alphanumeric Codes
  ------------------------------ */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTicketNumber(): string {
    // Generate 13-digit numeric string
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < 13; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }

  /* -----------------------------
     Generate Booking Reference
     Format: FT + AA + 4 Random
  ------------------------------ */
  private async generateBookingRef(): Promise<string> {
    const currentSeries = 'AA';
    let bookingRef: string;
    let exists = true;

    while (exists) {
      const randomPart = this.generateRandomCode(4);
      bookingRef = `FT${currentSeries}${randomPart}`;

      const existing = await this.prisma.booking.findUnique({
        where: { bookingRef },
      });

      exists = !!existing;
    }

    return bookingRef!;
  }

  /* -----------------------------
     Create Booking Draft
  ------------------------------ */
  async createDraft(data: CreateBookingDto) {
    this.logger.log(`Creating booking draft for email: ${data.email}`);
    this.logger.debug(`Draft Payload: ${JSON.stringify(data, null, 2)}`);

    // Step A — Revalidate Again (MANDATORY)
    let pricing: any;
    try {
      pricing = await this.searchService.revalidate(data.supplier || 'AMADEUS', data.rawOffer, data.passengers, data.supplierOfferId, data.passengerCount);
    } catch (err) {
      this.logger.error(`Supplier revalidation failed: ${err.message}`);
      throw new BadRequestException(`Supplier revalidation failed: ${err.message}. Please try again later.`);
    }

    // Step B — Recalculate Final Amount (Server-Side Revenue Rules)
    // 1. Check for Series Fare (Fixed Price Override)
    const seriesPrice = await this.seriesFareService.applySeriesFare(data.rawOffer);

    // 2. Base Supplier Price
    const supplierPrice = seriesPrice || pricing.totalPrice;

    // 3. Calculate Dynamic Revenue (Markup + Convenience Fee)
    const pricingBreakdown = await this.revenueService.calculateFinalPricing({
      baseFare: supplierPrice * 0.8, // Approximation for base fare if not split
      taxes: supplierPrice * 0.2, // Approximation for taxes
      airlineCode: data.selectedFlightData?.airlineCode || '6E',
      origin: data.selectedFlightData?.origin || 'DEL',
      destination: data.selectedFlightData?.destination || 'BOM',
      sector: data.supplier === 'AMADEUS' ? 'INTERNATIONAL' : 'DOMESTIC', // Simple logic for now
      supplier: data.supplier as any,
      userType: 'B2C',
      passengerCount: data.passengers?.length || 1,
      paymentMethod: 'UPI' // Default for draft, updated during payment
    });

    let finalAmount = pricingBreakdown.totalPayable;

    // Add-ons calculation
    if (data.selectedAddOns && Array.isArray(data.selectedAddOns)) {
      data.selectedAddOns.forEach((addon: any) => {
        finalAmount += addon.price;
      });
    }

    // Step C — Validation (Simple price protection)
    // We allow a small margin for float precision
    if (Math.abs(finalAmount - data.totalAmount) > 5) { // Increased tolerance for markup variation
      this.logger.warn(`Price mismatch. Server: ${finalAmount}, Request: ${data.totalAmount}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const bookingRef = await this.generateBookingRef();

      // Step D — Auto Create or Link User
      const user = await tx.user.upsert({
        where: { email: data.email },
        update: {},
        create: {
          email: data.email,
          password: data.password || this.generateRandomCode(10), // Random if not provided
        },
      });

      // Step E — Set Expiry (15 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Step F — Create Booking Atomically
      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          bookingRef,
          totalAmount: finalAmount,
          bookingStatus: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.INITIATED,
          supplier: data.supplier,
          supplierOfferId: data.supplierOfferId,
          selectedFlightData: data.selectedFlightData,
          selectedFareOption: data.selectedFareOption,
          selectedAddOns: data.selectedAddOns as any,
          pricingSnapshot: pricing.rawPricingResponse,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          gstDetails: data.gstDetails as any,
          expiresAt: expiresAt as any,
          passengers: {
            create: data.passengers.map((p) => ({
              firstName: p.firstName,
              lastName: p.lastName,
              title: p.title,
              gender: p.gender,
              dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
              type: p.type || 'ADT',
            })),
          },
        } as any,
        include: {
          passengers: true,
        },
      });

      this.logger.log(`Booking draft created successfully: ${booking.bookingRef}`);
      return booking;
    });
  }

  // Backward compatibility method
  async createBooking(data: CreateBookingDto) {
    return this.createDraft(data);
  }

  /* -----------------------------
     Manage Booking (PNR + Email Verification)
  ------------------------------ */
  async manageBooking(data: ManageBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef: data.bookingRef },
      include: {
        user: { select: { email: true } },
        passengers: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.user.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new UnauthorizedException('Email does not match booking records');
    }

    return booking;
  }

  /* -----------------------------
     Lifecycle Methods (using Ref)
  ------------------------------ */
  async confirmBooking(bookingRef: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if ((booking as any).bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }
    if ((booking as any).paymentStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Cannot confirm booking without success payment');
    }

    this.logger.log(`Confirming booking: ${bookingRef}`);
    return this.prisma.booking.update({
      where: { bookingRef },
      data: { bookingStatus: BookingStatus.CONFIRMED } as any,
    });
  }

  async cancelBooking(bookingRef: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if ((booking as any).bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    this.logger.log(`Cancelling booking: ${bookingRef}`);
    return this.prisma.booking.update({
      where: { bookingRef },
      data: { bookingStatus: BookingStatus.CANCELLED },
    });
  }

  /* -----------------------------
     Payment Integration
  ------------------------------ */
  async createPaymentOrder(bookingRef: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if ((booking as any).bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking not eligible for payment');
    }

    if ((booking as any).expiresAt && new Date() > (booking as any).expiresAt) {
      await this.prisma.booking.update({
        where: { bookingRef },
        data: { paymentStatus: 'EXPIRED' as any },
      });
      throw new BadRequestException('Booking draft expired. Please re-search and revalidate.');
    }

    this.logger.log(`Creating Razorpay order for booking: ${bookingRef}`);
    const order = await this.razorpayService.createOrder(
      booking.totalAmount,
      bookingRef,
    );

    // Store paymentOrderId
    await this.prisma.booking.update({
      where: { bookingRef },
      data: { paymentOrderId: order.id } as any,
    });

    return order;
  }

  async confirmBookingAfterPayment(paymentData: {
    paymentId: string;
    signature: string;
    orderId: string;
    paymentMode?: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { paymentOrderId: paymentData.orderId } as any,
      include: { passengers: true },
    });

    if (!booking) {
      this.logger.error(`Booking not found for Razorpay order: ${paymentData.orderId}`);
      throw new BadRequestException('Booking not found');
    }

    if ((booking as any).paymentStatus === 'SUCCESS') {
       return booking; // Idempotency check 
    }
    
    // 1. Instant Re-Price Check
    let rawOffer = (booking as any).pricingSnapshot;
    if (rawOffer?.data?.flightOffers) {
        rawOffer = rawOffer.data.flightOffers[0];
    }

    // For MakeVoyage, pricingSnapshot loses referenceId, flightId etc. 
    // We must use the original raw data from selectedFareOption or selectedFlightData.
    const supplierName = ((booking as any).supplier || 'AMADEUS').toUpperCase();
    
    // --- BYPASS FOR VISA BOOKINGS ---
    if (supplierName === 'VISA') {
        this.logger.log(`Visa booking payment confirmed. Skipping flight initiation for ${booking.bookingRef}`);
        const confirmedVisa = await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                bookingStatus: 'CONFIRMED',
                paymentStatus: 'SUCCESS',
                paymentId: paymentData.paymentId,
                paymentSignature: paymentData.signature,
                paymentMode: paymentData.paymentMode || 'ONLINE',
                paidAt: new Date(),
                ticketNumber: `VISA-${paymentData.orderId.slice(-6)}`,
            } as any
        });
        return confirmedVisa;
    }
    // --------------------------------

    if (supplierName === 'MAKEVOYAGE' || supplierName === 'MVFD' || supplierName === 'FTSPECIAL') {
        const fareOption = booking.selectedFareOption as any;
        const flightData = booking.selectedFlightData as any;
        this.logger.debug(`MVFD Confirmation State - FareOption: ${!!fareOption}, FlightData: ${!!flightData}`);
        rawOffer = fareOption?.raw || flightData?.rawData || rawOffer;
    }

    this.logger.debug(`Final RawOffer for Revalidation: ${JSON.stringify({
        referenceId: rawOffer?.referenceId,
        flightId: rawOffer?.flightId,
        hasPriceDetails: !!rawOffer?.priceDetails
    })}`);
    
    let freshBookingId = '';
    try {
        const repricing = await this.searchService.revalidate((booking as any).supplier || 'AMADEUS', rawOffer, (booking as any).passengers, (booking as any).supplierOfferId, (booking as any).passengerCount || undefined);
        
        // Extract fresh bookingId for MVFD
        freshBookingId = (repricing.rawPricingResponse as any)?.bookingId;
        if (freshBookingId) {
            this.logger.log(`Obtained fresh bookingId for MVFD: ${freshBookingId}`);
        }

        if (repricing.totalPrice > booking.totalAmount) {
            // Price Jumped! Abort booking. User requires refund.
            this.logger.error(`Price increased for Ref ${booking.bookingRef}. Old: ${booking.totalAmount}, New: ${repricing.totalPrice}`);
            
            await this.prisma.booking.update({
                where: { id: booking.id },
                data: {
                    paymentStatus: 'REFUND_PENDING',
                    bookingStatus: 'FAILED',
                    paymentId: paymentData.paymentId,
                    paymentSignature: paymentData.signature,
                }
            });
            throw new BadRequestException('The airline increased the price before the ticket could be issued. The payment will be refunded.');
        }
    } catch(err) {
        this.logger.error(`Repricing failed during ticket issue: ${err}`);
        throw new BadRequestException('Verification failed: Flight is no longer available. Payment will be refunded.');
    }

    // 2. Initiate Supplier Booking
    let providerPnr: string | null = '';
    let initiateRes: any = null;
    try {
        const supplier = (booking as any).supplier || 'AMADEUS';
        this.logger.log(`Initiating supplier booking for ${booking.bookingRef} via ${supplier}. PNR: ${providerPnr}`);
        
        initiateRes = await this.flightsService.initiate({
            supplier,
            bookingId: freshBookingId || booking.supplierOfferId,
            internalBookingId: booking.id,
            userId: booking.userId, // Pass the real user ID
            passengers: (booking as any).passengers,
            contact: {
                email: booking.contactEmail,
                phone: booking.contactPhone
            }
        });
        
        providerPnr = (Array.isArray(initiateRes.pnr) && initiateRes.pnr.length > 0) 
            ? initiateRes.pnr[0]?.pnr 
            : initiateRes.pnr;
            
        // If providerPnr is null or an empty string, we let it be null
        if (typeof providerPnr === 'object' || !providerPnr) {
             providerPnr = null;
        }
    } catch (initiateErr) {
        this.logger.error(`Supplier Initiation Error: ${initiateErr.message}`);
        // If it fails here, the user has paid but booking failed. 
        // We should mark for manual intervention or auto-refund.
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                bookingStatus: 'FAILED',
                paymentStatus: 'REFUND_PENDING'
            }
        });
        throw new BadRequestException(`Booking failed: ${initiateErr.message}. Our team will contact you for refund.`);
    }

    // 3. Increment Promo Usage if applied
    if (booking.promoCodeId) {
        try {
            await this.prisma.promoCode.update({
                where: { id: booking.promoCodeId },
                data: { usageCount: { increment: 1 } }
            });

            // Create Granular Usage Record for Analytics
            await this.prisma.promoUsage.create({
                data: {
                    userId: booking.userId,
                    promoCodeId: booking.promoCodeId,
                    bookingId: booking.id,
                    discountAmount: (booking as any).discountAmount || 0
                }
            });
        } catch (promoErr) {
            this.logger.error(`Failed to record promo usage: ${promoErr.message}`);
        }
    }

    // Delegate to TicketingService to issue the ticket
    const confirmedBooking = await this.ticketingService.issueTicket(booking.id, providerPnr, initiateRes.bookingRef);
    
    // Additional payment info update since ticketing service doesn't know about razorpay specifics
    await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
            paymentStatus: 'SUCCESS',
            paymentId: paymentData.paymentId,
            paymentSignature: paymentData.signature,
            paidAt: new Date(),
        } as any
    });
    
    // Emit Real-Time Booking Event
    try {
      let route = 'Unknown';
      const flightData = confirmedBooking.selectedFlightData as any;
      if (flightData?.itineraries?.[0]?.segments?.length) {
          const segments = flightData.itineraries[0].segments;
          const origin = segments[0]?.departure?.iataCode;
          const dest = segments[segments.length - 1]?.arrival?.iataCode;
          if (origin && dest) route = `${origin} - ${dest}`;
      }

      this.bookingGateway.emitNewBooking({
          pnr: providerPnr,
          userEmail: confirmedBooking.contactEmail || 'Guest',
          totalAmount: confirmedBooking.totalAmount,
          route,
          createdAt: confirmedBooking.createdAt
      });
    } catch(err) {
      this.logger.error(`Failed to emit socket event: ${err.message}`);
    }
    
    return confirmedBooking;
  }

  /* -----------------------------
     Queries
  ------------------------------ */
  async getBookingByRef(bookingRef: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { bookingRef: bookingRef },
          { pnr: bookingRef },
        ],
      },
      include: {
        passengers: true,
        user: { select: { email: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getBookingsByUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { passengers: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* -----------------------------
     My Trips & Cancellation
  ------------------------------ */
  async getBookingByIdForUser(id: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, userId },
      include: { passengers: true, payment: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found or access denied');
    }
    return booking;
  }

  async requestCancellation(id: string, userId: string, reason: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or access denied');
    }

    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled. Cannot be requested again.');
    }

    // Safely cast cancelStatus to string in case Types aren't totally generated yet
    const cancelStatus = (booking as any).cancelStatus;
    
    if (cancelStatus === 'REQUESTED') {
      throw new BadRequestException('A cancellation request is already pending for this booking.');
    }
    if (cancelStatus === 'APPROVED' || cancelStatus === 'REJECTED') {
      throw new BadRequestException(`Cannot request cancellation. Current status is ${cancelStatus}.`);
    }

    this.logger.log(`User ${userId} requested cancellation for booking ${id} with reason: ${reason}`);

    return this.prisma.booking.update({
      where: { id },
      data: {
        cancelStatus: 'REQUESTED' as any,
        cancelReason: reason,
      },
    });
  }

  async applyPromo(bookingRef: string, code: string, context: any = {}) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
      include: { promo: true }
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Promo can only be applied to pending bookings');
    }

    const validation = await this.promoService.validatePromo(code, booking.totalAmount, context);

    return this.prisma.booking.update({
        where: { id: booking.id },
        data: {
            promoCodeId: validation.promoId,
            discountAmount: validation.discount
        },
        include: { promo: true }
    });
  }

  async removePromo(bookingRef: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef }
    });

    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        promoCodeId: null,
        discountAmount: 0
      },
      include: { promo: true }
    });
  }

  async updateContactInfo(bookingId: string, email: string, phone: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { contactEmail: email, contactPhone: phone }
    });
  }
}
