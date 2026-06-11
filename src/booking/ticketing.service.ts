import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TicketPdfService } from './ticket-pdf.service';

@Injectable()
export class TicketingService {
    private readonly logger = new Logger(TicketingService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private ticketPdfService: TicketPdfService
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

    async issueTicket(bookingId: string, providerPnr: string | null, supplierRef?: string) {
        this.logger.log(`Issuing ticket for Booking ID: ${bookingId} with PNR: ${providerPnr} (Supplier Ref: ${supplierRef || 'N/A'})`);
        
        const isPnrValid = providerPnr && providerPnr.trim() !== '';
        const ticketNumber = isPnrValid ? this.generateTicketNumber() : null;
        
        const booking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                ticketNumber,
                pnr: providerPnr,
                supplierBookingRef: supplierRef, // Save the supplier's internal ID
                ticketIssuedAt: isPnrValid ? new Date() : null,
                bookingStatus: isPnrValid ? 'CONFIRMED' : 'TICKET_PENDING'
            },
            include: { passengers: true }
        });

        // Trigger Email Asynchronously ONLY if PNR is generated
        if (isPnrValid && booking.contactEmail && booking.passengers && booking.passengers.length > 0) {
            Promise.all([
                this.ticketPdfService.generateTicketPdf(booking.id),
                this.ticketPdfService.generateTicketEmailHtml(booking.id)
            ]).then(([htmlString, emailHtmlString]) => {
                this.emailService.sendETicketEmail(
                    booking.contactEmail as string, 
                    providerPnr as string,
                    htmlString,
                    emailHtmlString
                ).catch(err => this.logger.error(`Failed to send e-ticket email: ${err.message}`));
            }).catch(err => this.logger.error(`Failed to generate HTML for email: ${err.message}`));
        }

        return booking;
    }
}
