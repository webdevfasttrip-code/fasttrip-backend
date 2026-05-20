import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as bwipjs from 'bwip-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketPdfService {
    private readonly logger = new Logger(TicketPdfService.name);

    constructor(private prisma: PrismaService) {}

    async generateTicketPdf(bookingId: string): Promise<Buffer> {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { passengers: true }
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        const flightData = booking.selectedFlightData as any;
        let airlineName = 'FastTrip Airlines';
        let flightNumber = 'FT-101';
        let origin = 'ORG';
        let destination = 'DST';
        let departureTime = 'TBD';
        let arrivalTime = 'TBD';
        
        if (flightData?.meta?.segments?.[0]) {
            const seg = flightData.meta.segments[0];
            airlineName = seg.airlineName || airlineName;
            flightNumber = seg.flightNumber || flightNumber;
            origin = seg.from || origin;
            destination = seg.to || destination;
            departureTime = new Date(seg.dep).toLocaleString();
            arrivalTime = new Date(seg.arr).toLocaleString();
        } else if (flightData?.itineraries?.[0]?.segments?.[0]) {
            const seg = flightData.itineraries[0].segments[0];
            const lastSeg = flightData.itineraries[0].segments[flightData.itineraries[0].segments.length - 1];
            airlineName = seg.carrierCode || airlineName;
            flightNumber = `${seg.carrierCode}-${seg.number}`;
            origin = seg.departure?.iataCode || origin;
            destination = lastSeg.arrival?.iataCode || destination;
            departureTime = new Date(seg.departure?.at).toLocaleString();
            arrivalTime = new Date(lastSeg.arrival?.at).toLocaleString();
        }

        const pnr = booking.pnr || 'PENDING';
        const ticketNumber = booking.ticketNumber || 'TBD';
        const passengerName = booking.passengers?.[0] ? `${booking.passengers[0].firstName} ${booking.passengers[0].lastName}` : 'Guest';

        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const buffers: Buffer[] = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // Header
                doc.fontSize(24).fillColor('#6A39E0').text('FastTrip E-Ticket', { align: 'center' });
                doc.moveDown();

                // Generate Barcode
                try {
                    const barcodeBuffer = await bwipjs.toBuffer({
                        bcid: 'code128',
                        text: `PNR:${pnr}-TKT:${ticketNumber}`,
                        scale: 3,
                        height: 10,
                        includetext: true,
                        textxalign: 'center',
                    });
                    // Add barcode image to PDF
                    doc.image(barcodeBuffer, (doc.page.width - 250) / 2, doc.y, { width: 250 });
                    doc.moveDown(4);
                } catch (barcodeErr) {
                    this.logger.error(`Barcode generation failed: ${barcodeErr}`);
                }

                doc.fillColor('#000000').fontSize(14).text('Booking Details', { underline: true });
                doc.moveDown(0.5);
                
                doc.fontSize(12);
                doc.text(`Booking Ref: ${booking.bookingRef}`);
                doc.text(`Airline PNR: ${pnr}`);
                doc.text(`Ticket Number: ${ticketNumber}`);
                doc.text(`Status: ${booking.bookingStatus}`);
                doc.moveDown();

                doc.fontSize(14).text('Passenger Information', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(12);
                booking.passengers?.forEach((pax: any, i) => {
                    const titlePrefix = pax.title ? `${pax.title}. ` : '';
                    doc.text(`${i + 1}. ${titlePrefix}${pax.firstName} ${pax.lastName} (${pax.type || 'Adult'})`);
                });
                doc.moveDown();

                doc.fontSize(14).text('Flight Itinerary', { underline: true });
                doc.moveDown(0.5);
                
                // Flight Box
                const boxTop = doc.y;
                doc.rect(50, boxTop, 495, 80).stroke('#6A39E0');
                
                doc.fontSize(12).text(`Airline: ${airlineName}`, 60, boxTop + 10);
                doc.text(`Flight No: ${flightNumber}`, 60, boxTop + 30);
                
                doc.text(`From: ${origin}`, 250, boxTop + 10);
                doc.text(`Dep: ${departureTime}`, 250, boxTop + 30);
                
                doc.text(`To: ${destination}`, 400, boxTop + 10);
                doc.text(`Arr: ${arrivalTime}`, 400, boxTop + 30);

                doc.moveDown(5);

                // Footer
                doc.fontSize(10).fillColor('gray').text('Please arrive at the airport at least 2 hours before departure. Carry a valid government ID matching the passenger name.', { align: 'center' });

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }
}
