import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TicketingService {
    private readonly logger = new Logger(TicketingService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) {}

    private generateTicketNumber(): string {
        // Generates a standard 13-digit e-ticket number
        const prefix = ['125', '098', '775', '312']; // Mock airline codes
        const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
        const digits = '0123456789';
        let remaining = '';
        for (let i = 0; i < 10; i++) {
            remaining += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return `${randomPrefix}-${remaining}`;
    }

    async issueTicket(bookingId: string, providerPnr: string, supplierRef?: string) {
        this.logger.log(`Issuing ticket for Booking ID: ${bookingId} with PNR: ${providerPnr} (Supplier Ref: ${supplierRef || 'N/A'})`);
        
        const ticketNumber = this.generateTicketNumber();
        
        const booking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                ticketNumber,
                pnr: providerPnr,
                supplierBookingRef: supplierRef, // Save the supplier's internal ID
                ticketIssuedAt: new Date(),
                bookingStatus: 'CONFIRMED'
            },
            include: { passengers: true }
        });

        // Trigger Email Asynchronously
        if (booking.contactEmail && booking.passengers && booking.passengers.length > 0) {
            const primaryPassenger = `${booking.passengers[0].firstName} ${booking.passengers[0].lastName}`;
            this.emailService.sendETicketEmail(
                booking.contactEmail, 
                booking.bookingRef, 
                primaryPassenger, 
                providerPnr
            ).catch(err => this.logger.error(`Failed to send e-ticket email: ${err.message}`));
        }

        return booking;
    }
}
