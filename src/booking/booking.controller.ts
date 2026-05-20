import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { BookingService } from './booking.service';
import { TicketPdfService } from './ticket-pdf.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ManageBookingDto } from './dto/manage-booking.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Booking')
@Controller({
  path: 'booking',
  version: '1',
})
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private ticketPdfService: TicketPdfService
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new booking (legacy)' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  createBooking(@Body() body: CreateBookingDto) {
    return this.bookingService.createBooking(body);
  }

  @Post('draft')
  @ApiOperation({ summary: 'Create a booking draft' })
  @ApiResponse({ status: 201, description: 'Draft created successfully' })
  @ApiResponse({ status: 400, description: 'Price mismatch or validation error' })
  createDraft(@Body() body: CreateBookingDto) {
    return this.bookingService.createDraft(body);
  }

  @Post('manage')
  @ApiOperation({ summary: 'Manage a booking (find by Ref + Email)' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  manageBooking(@Body() body: ManageBookingDto) {
    return this.bookingService.manageBooking(body);
  }

  @Get('ref/:bookingRef')
  @ApiOperation({ summary: 'Get booking details by reference' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  getBookingByRef(@Param('bookingRef') bookingRef: string) {
    return this.bookingService.getBookingByRef(bookingRef);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all bookings for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of logged in user bookings' })
  getMyBookings(@CurrentUser() user: User) {
    return this.bookingService.getBookingsByUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get booking details ensuring user owns it' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  getBookingById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.getBookingByIdForUser(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel-request')
  @ApiOperation({ summary: 'Request booking cancellation' })
  @ApiResponse({ status: 200, description: 'Cancellation requested successfully' })
  requestCancellation(
    @Param('id') id: string,
    @Body() body: CancelRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingService.requestCancellation(id, user.id, body.reason);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all bookings for a user (Legacy)' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  getBookingsByUser(@Param('userId') userId: string) {
    return this.bookingService.getBookingsByUser(userId);
  }

  @Patch('ref/:bookingRef/confirm')
  @ApiOperation({ summary: 'Confirm a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  confirmBooking(@Param('bookingRef') bookingRef: string) {
    return this.bookingService.confirmBooking(bookingRef);
  }

  @Patch('ref/:bookingRef/cancel')
  @ApiOperation({ summary: 'Cancel an existing booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  cancelBooking(@Param('bookingRef') bookingRef: string) {
    return this.bookingService.cancelBooking(bookingRef);
  }

  @Post('ref/:bookingRef/pay')
  @ApiOperation({ summary: 'Initiate payment for a booking' })
  @ApiResponse({ status: 201, description: 'Payment order created' })
  async createPayment(@Param('bookingRef') bookingRef: string) {
    return this.bookingService.createPaymentOrder(bookingRef);
  }

  @Post('ref/:bookingRef/apply-promo')
  @ApiOperation({ summary: 'Apply a promo code to a booking' })
  @ApiResponse({ status: 200, description: 'Promo applied' })
  async applyPromo(@Param('bookingRef') bookingRef: string, @Body() body: { code: string, context?: any }) {
    return this.bookingService.applyPromo(bookingRef, body.code, body.context);
  }

  @Post('ref/:bookingRef/remove-promo')
  @ApiOperation({ summary: 'Remove an applied promo code from a booking' })
  @ApiResponse({ status: 200, description: 'Promo removed' })
  async removePromo(@Param('bookingRef') bookingRef: string) {
    return this.bookingService.removePromo(bookingRef);
  }

  @Get('ref/:bookingRef/ticket')
  @ApiOperation({ summary: 'Download E-Ticket PDF' })
  @ApiResponse({ status: 200, description: 'PDF Ticket' })
  async downloadTicket(@Param('bookingRef') bookingRef: string, @Res() res: Response) {
    const booking = await this.bookingService.getBookingByRef(bookingRef);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const pdfBuffer = await this.ticketPdfService.generateTicketPdf(booking.id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="e-ticket-${booking.pnr || bookingRef}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }
}
