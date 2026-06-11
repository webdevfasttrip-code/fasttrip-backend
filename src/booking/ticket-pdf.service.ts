import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TicketPdfService {
    private readonly logger = new Logger(TicketPdfService.name);

    constructor(private prisma: PrismaService) { }

    async generateTicketPdf(bookingId: string): Promise<string> {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { passengers: true }
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        const flightData = booking.selectedFlightData as any;
        const meta = flightData?.meta || {};
        const segments = Array.isArray(meta.segments) ? meta.segments : [];
        const fareOptions = Array.isArray(flightData?.fareOptions) ? flightData.fareOptions : [];

        let airlineName = 'FastTrip Airlines';
        let carrierCode = '6E';
        let flightNumber = '101';
        let originCode = 'ORG';
        let destCode = 'DST';
        let originCity = 'Origin';
        let destCity = 'Destination';
        let originAirport = 'Origin Airport';
        let destAirport = 'Destination Airport';
        let departureTimeStr = new Date().toISOString();
        let arrivalTimeStr = new Date().toISOString();
        let duration = '0h 0m';
        
        let cabinBaggageText = '7 Kg (1 Piece)';
        let checkinBaggageText = '15 Kg (1 Piece)';

        const directBaggage = fareOptions[0]?.baggage;
        if (directBaggage) {
            const checkin = directBaggage.checkin?.weight;
            const cabin = directBaggage.cabin?.weight;
            if (checkin) checkinBaggageText = `${checkin} Kg`;
            if (cabin) cabinBaggageText = `${cabin} Kg`;
        } else {
             const fallbackTraveler = fareOptions[0]?.raw?.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
             const fbCheckin = fallbackTraveler?.includedCheckedBags?.weight;
             const fbCabin = fallbackTraveler?.includedCabinBags?.weight;
             if (fbCheckin) checkinBaggageText = `${fbCheckin} Kg`;
             if (fbCabin) cabinBaggageText = `${fbCabin} Kg`;
        }
        
        let baggageText = `${checkinBaggageText} Check-in / ${cabinBaggageText} Cabin`;

        if (flightData?.priceDetails?.[0]?.singlePaxDetails?.adult?.checkingBaggage) {
             const checkinBaggage = flightData.priceDetails[0].singlePaxDetails.adult.checkingBaggage;
             baggageText = `Check-In : ${checkinBaggage}`;
             checkinBaggageText = checkinBaggage;
        }

        if (segments.length > 0) {
            const firstSeg = segments[0];
            const lastSeg = segments[segments.length - 1];
            
            airlineName = firstSeg.airlineName || meta.airlineName || airlineName;
            carrierCode = firstSeg.airline || meta.airline || carrierCode;
            flightNumber = firstSeg.flightNumber || meta.flightNumber || flightNumber;
            
            originCode = firstSeg.from || originCode;
            destCode = lastSeg.to || destCode;
            
            originCity = meta.originCity || meta.origin || originCode;
            destCity = meta.destinationCity || meta.destination || destCode;
            
            originAirport = firstSeg.originAirport || `${originCode} Airport`;
            destAirport = lastSeg.destinationAirport || `${destCode} Airport`;
            
            departureTimeStr = firstSeg.dep || meta.departure || departureTimeStr;
            arrivalTimeStr = lastSeg.arr || meta.arrival || arrivalTimeStr;
            
            duration = firstSeg.duration || meta.duration || duration;
        } else if (flightData?.itineraries?.[0]?.segments?.[0]) {
            const seg = flightData.itineraries[0].segments[0];
            const lastSeg = flightData.itineraries[0].segments[flightData.itineraries[0].segments.length - 1];
            carrierCode = seg.carrierCode || carrierCode;
            airlineName = seg.carrierCode || airlineName;
            flightNumber = seg.number || flightNumber;
            originCode = seg.departure?.iataCode || originCode;
            destCode = lastSeg.arrival?.iataCode || destCode;
            originCity = originCode; destCity = destCode;
            originAirport = `${originCode} Airport`;
            destAirport = `${destCode} Airport`;
            departureTimeStr = seg.departure?.at || departureTimeStr;
            arrivalTimeStr = lastSeg.arrival?.at || arrivalTimeStr;
            duration = flightData.itineraries[0].duration || duration;
        }

        if (typeof duration === 'string' && duration.startsWith('PT')) {
            duration = duration.replace('PT', '').toLowerCase();
        } else if (!isNaN(Number(duration)) && String(duration).trim() !== '') {
            const totalMins = Number(duration);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            duration = `${hrs}h ${mins}m`;
        }

        try {
            const orgAirport = await this.prisma.airport.findFirst({ where: { iataCode: originCode } });
            if (orgAirport) {
                if (orgAirport.city) originCity = orgAirport.city;
                if (orgAirport.airportName) originAirport = orgAirport.airportName;
            }
            const dstAirport = await this.prisma.airport.findFirst({ where: { iataCode: destCode } });
            if (dstAirport) {
                if (dstAirport.city) destCity = dstAirport.city;
                if (dstAirport.airportName) destAirport = dstAirport.airportName;
            }
        } catch(e) {
            this.logger.warn(`Failed to fetch airport cities and names: ${e.message}`);
        }

        // Fetch airline logo from the database
        let airlineLogoUrl = `https://pics.avs.io/200/200/${carrierCode}.png`;
        try {
            const dbAirline = await this.prisma.airline.findFirst({
                where: { iata: carrierCode }
            });
            if (dbAirline) {
                airlineLogoUrl = dbAirline.logoPngUrl || dbAirline.logoSvgUrl || airlineLogoUrl;
            }
        } catch(e) {
            this.logger.warn(`Failed to fetch airline logo from DB for ${carrierCode}: ${e.message}`);
        }



        const pnr = booking.pnr || 'PENDING';
        const contactPhone = booking.contactPhone || 'N/A';
        const contactEmail = booking.contactEmail || 'N/A';
        const grossFare = booking.totalAmount || 0;
        
        let baseFare = 0;
        let taxes = 0;
        let convenienceFee = 0;
        
        const pricing = booking.pricingSnapshot as any;
        if (pricing && pricing.fare) {
            baseFare = pricing.fare.base || 0;
            taxes = pricing.fare.tax || 0;
            convenienceFee = grossFare - baseFare - taxes;
            if (convenienceFee < 0) convenienceFee = 0;
        } else {
            baseFare = Math.floor(grossFare * 0.85);
            taxes = Math.floor(grossFare * 0.1);
            convenienceFee = grossFare - baseFare - taxes;
        }

        const depDate = dayjs(departureTimeStr);
        const arrDate = dayjs(arrivalTimeStr);

        let passengersHtml = '';

        booking.passengers.forEach((pax: any, i: number) => {
            const title = pax.title ? `${pax.title}. ` : '';
            const fullName = `${title}${pax.firstName} ${pax.lastName}`;
            const baggage = pax.baggage || baggageText;

            const lastName = (pax.lastName || '').toUpperCase();
            const firstName = (pax.firstName || '').toUpperCase();
            const travelDate = depDate.format('DDMMM').toUpperCase() + depDate.format('YYYY');
            
            const iataTextString = `${lastName}/${firstName} ${pnr} ${travelDate} ${carrierCode}${flightNumber} ${originCode}${destCode}`;

            passengersHtml += `
                <div class="passenger-row">
                    <div class="passenger-name">${fullName}</div>
                    <div class="passenger-baggage">Baggage: <strong>${baggage}</strong></div>
                    <div class="barcode-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(iataTextString)}" alt="Ticket QR Code" width="64" height="64" />
                    </div>
                </div>`;
        });

        let fareRulesHtml = `
            <div class="rule-item">
                <span class="material-symbols-outlined icon-red">close</span>
                <span><strong>CANCELLATION:</strong> Non Refundable. This ticket, once booked, cannot be cancelled or changed.</span>
            </div>
            <div class="rule-item">
                <span class="material-symbols-outlined icon-blue">info</span>
                <span><strong>WEB CHECK-IN:</strong> Can be done 1 day before the journey date, after 7 PM. You can do web check-in yourself.</span>
            </div>
            <div class="rule-item">
                <span class="material-symbols-outlined icon-orange">warning</span>
                <span>Must Re-verify Terminal Information & Flight Timings with Boarding Pass.</span>
            </div>
            <div class="rule-item">
                <span class="material-symbols-outlined icon-gray">airline_seat_recline_normal</span>
                <span>Seat & Meals not included in the fare, and can be pre-purchased at the time of Web CheckIn.</span>
            </div>
            <div class="baggage-highlight-row">
                <div class="rule-item">
                    <span class="material-symbols-outlined icon-gray">work</span>
                    <span><strong>CABIN:</strong> ${cabinBaggageText}</span>
                </div>
                <div class="rule-item">
                    <span class="material-symbols-outlined icon-gray">luggage</span>
                    <span><strong>CHECK-IN:</strong> ${checkinBaggageText}</span>
                </div>
            </div>
        `;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Full Ticket Confirmation - Fast Trip</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            color: #1a1a1a;
        }
        body {
            background-color: #e2e8f0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px; 
        }
        
        .page {
            width: 790px;
            background: #ffffff;
            padding: 45px 50px;
            position: relative;
            min-height: 1050px; 
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .no-print-btn {
            position: absolute;
            top: 25px;
            right: 50px;
            padding: 10px 20px;
            background-color: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        }

        @media print {
            body { background-color: #ffffff; padding: 0; margin: 0; display: block; }
            .page { box-shadow: none; margin: 0; padding: 40px; page-break-after: always; min-height: auto; }
            .page:last-child { page-break-after: auto; }
            .no-print-btn { display: none !important; }
        }

        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .logo-container img { height: 48px; width: auto; object-fit: contain; }
        .ticket-title { text-align: right; font-size: 24px; font-weight: 800; line-height: 1.15; letter-spacing: 0.5px; }
        .booking-info { font-size: 18px; margin-bottom: 12px; font-weight: 500; }
        .booking-info strong { font-weight: 800; }
        .route-badge { display: inline-block; background-color: #cacaca; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 12px; margin-bottom: 20px; }
        
        .flight-card { background-color: #ffebe3; border-radius: 16px; padding: 25px 35px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
        .airline-info { display: flex; flex-direction: column; align-items: center; width: 90px; text-align: center; }
        .airline-logo-box { background-color: #ffffff; width: 54px; height: 54px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; border: 1px solid #eaeaea; }
        .airline-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
        .airline-name { font-size: 14px; font-weight: 800; line-height: 1.2; }
        .flight-number { font-size: 12px; color: #444; font-weight: 600; }
        .flight-node { flex: 1; padding: 0 20px; }
        .node-city { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
        .node-airport { font-size: 13px; color: #444; line-height: 1.3; margin-bottom: 10px; min-height: 30px; }
        .node-time-box { background: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; }
        .node-time-box strong { font-weight: 800; font-size: 15px; }
        .flight-arrow { display: flex; align-items: center; padding-bottom: 24px; }
        .flight-arrow .material-symbols-outlined { font-size: 24px; font-weight: 700; }
        .duration-info { text-align: center; width: 85px; }
        .duration-label { font-size: 14px; font-weight: 800; margin-bottom: 6px; }
        .duration-icon-box { display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
        .duration-icon-box .material-symbols-outlined { font-size: 28px; color: #333; }
        .duration-value { font-size: 13px; color: #333; font-weight: 600; }

        .section-heading { font-size: 15px; font-weight: 800; margin-bottom: 12px; }
        .contact-details { display: flex; gap: 40px; font-size: 14px; margin-bottom: 25px; }
        .contact-details p strong { font-weight: 800; }

        .passenger-section-title { text-align: center; font-size: 16px; font-weight: 800; margin-bottom: 16px; letter-spacing: 0.3px; }
        .passenger-row { background: #ffffff; border-radius: 8px; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #eaeaea; }
        .passenger-name { font-size: 14px; font-weight: 700; width: 35%; }
        .passenger-baggage { font-size: 14px; font-weight: 500; }
        .passenger-baggage strong { font-weight: 700; }
        .barcode-box { display: flex; align-items: center; gap: 1px; }

        .fare-rule-box { background-color: #fff9f9; border: 1px solid #ffe3e3; border-radius: 12px; padding: 22px 28px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(211, 47, 47, 0.05); }
        .fare-rule-title { font-size: 15px; font-weight: 800; color: #d32f2f; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        .rule-list { display: flex; flex-direction: column; gap: 12px; }
        .rule-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.4; color: #333; }
        .rule-item .material-symbols-outlined { font-size: 18px; margin-top: 1px; }
        .rule-item strong { font-weight: 700; color: #1a1a1a; }
        
        .icon-red { color: #d32f2f; }
        .icon-blue { color: #1976d2; }
        .icon-orange { color: #f57c00; }
        .icon-gray { color: #555555; }
        
        .baggage-highlight-row { display: flex; gap: 25px; margin-top: 6px; padding-top: 12px; border-top: 1px dashed #ffe3e3; }
        .baggage-highlight-row .rule-item { align-items: center; }
        .baggage-highlight-row .material-symbols-outlined { font-size: 20px; margin-top: 0; }

        .payment-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 30px;
            margin-top: auto;
        }
        .payment-table th, .payment-table td {
            border: 1px solid #dcdcdc;
            padding: 8px 12px;
            text-align: left;
        }
        .payment-table td:last-child {
            text-align: right;
        }

        .footer { margin-top: auto; border-top: 1.5px solid #000000; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; line-height: 1.4; width: 100%;}
        .footer-left strong { font-size: 13px; font-weight: 800; }
        .footer-left p { color: #333; font-weight: 500; }
        .footer-right { font-weight: 800; }

        .info-title { font-size: 16px; font-weight: 800; margin-bottom: 18px; }
        .info-list { list-style: none; }
        .info-list li { font-size: 13px; line-height: 1.5; color: #333333; margin-bottom: 8px; position: relative; padding-left: 14px; text-align: justify; }
        .info-list li::before { content: "•"; position: absolute; left: 0; color: #333333; }

        .baggage-guidelines { margin-top: 40px; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .status-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 16px; }
        .status-header .material-symbols-outlined { font-size: 36px; }
        .status-header.green .material-symbols-outlined { color: #139c49; }
        .status-header.red .material-symbols-outlined { color: #d32f2f; }
        .status-title { font-size: 16px; font-weight: 700; line-height: 1.3; margin-top: 8px; }
        .status-title.green-text { color: #139c49; }
        .status-title.red-text { color: #d32f2f; }
        
        .prohibited-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            width: 100%;
            margin-top: 10px;
        }
        .prohibited-item {
            background: #fff;
            border: 1px solid #ffe3e3;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(211, 47, 47, 0.05);
        }
        .prohibited-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #fff0f0;
            border-radius: 50%;
            color: #d32f2f;
            flex-shrink: 0;
        }
        .prohibited-icon .material-symbols-outlined {
            font-size: 18px;
        }
        .prohibited-text {
            font-size: 12px;
            font-weight: 700;
            line-height: 1.3;
            color: #333;
            text-align: left;
        }
        .prohibited-text small {
            display: block;
            font-size: 9px;
            font-weight: 500;
            color: #666;
            margin-top: 2px;
            line-height: 1.1;
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Download Button shown in browser, hidden in print/PDF -->
        <a href="javascript:window.print()" class="no-print-btn">Download Ticket</a>
        
        <div class="header">
            <div class="logo-container">
                <img src="https://static.wixstatic.com/media/dbf281_3a902d8ce7e942b59f0ccb832b98117e~mv2.png" alt="Fast Trip Logo" />
            </div>
            <div class="ticket-title">TICKET<br>CONFIRMATION</div>
        </div>

        <div class="booking-info">
            Booking Ref. : <strong>${booking.bookingRef}</strong> &nbsp;&nbsp;&nbsp; PNR : <strong>${pnr}</strong>
        </div>
        <div class="route-badge">${originCode}-${destCode}</div>

        <div class="flight-card">
            <div class="airline-info">
                <div class="airline-logo-box">
                    <img src="${airlineLogoUrl}" alt="${airlineName}" onerror="this.style.display='none'" />
                </div>
                <div class="airline-name">${airlineName}</div>
                <div class="flight-number">${carrierCode}-${flightNumber}</div>
            </div>

            <div class="flight-node" style="text-align: right;">
                <div class="node-city">${originCity} (${originCode})</div>
                <div class="node-airport">${originAirport}</div>
                <div class="node-time-box"><strong>${depDate.format('HH:mm')}</strong> ${depDate.format('ddd, DD MMM YYYY')}</div>
            </div>

            <div class="flight-arrow">
                <span class="material-symbols-outlined">arrow_forward</span>
            </div>

            <div class="flight-node" style="text-align: left;">
                <div class="node-city">${destCity} (${destCode})</div>
                <div class="node-airport">${destAirport}</div>
                <div class="node-time-box"><strong>${arrDate.format('HH:mm')}</strong> ${arrDate.format('ddd, DD MMM YYYY')}</div>
            </div>

            <div class="duration-info">
                <div class="duration-label">Duration</div>
                <div class="duration-icon-box"><span class="material-symbols-outlined">schedule</span></div>
                <div class="duration-value">${duration}</div>
            </div>
        </div>

        <div class="section-heading">Passenger Contact Details :</div>
        <div class="contact-details">
            <p><strong>Phone:</strong> ${contactPhone}</p>
            <p><strong>Email:</strong> ${contactEmail}</p>
        </div>

        <div class="passenger-section-title">Passenger Details</div>
        ${passengersHtml}

        <table class="payment-table">
            <thead>
                <tr>
                    <th colspan="2" style="font-size: 16px; font-weight: 800; border: none; padding: 0 0 10px 0;">Payment Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Base Fare</td>
                    <td>&#8377; ${baseFare.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td>Taxes and Fees</td>
                    <td>&#8377; ${taxes.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td>Convenience Fee</td>
                    <td>&#8377; ${convenienceFee.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr style="background-color: #ededed;">
                    <td style="font-weight: 700;">Gross Fare <span style="font-weight: normal; font-size: 11px; margin-left: 8px;">(This is a non-refundable fare)</span></td>
                    <td style="font-weight: 800;">&#8377; ${grossFare.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <div class="footer-left">
                <strong>Fast Trip</strong>
                <p>A unit of Trtiyaka Trip And Travel Private Limited</p>
            </div>
            <div class="footer-right">
                CIN : U63030AS2022PTC023862
            </div>
        </div>
    </div>

    <div class="page">
        <div class="header">
            <div class="logo-container">
                <img src="https://static.wixstatic.com/media/dbf281_3a902d8ce7e942b59f0ccb832b98117e~mv2.png" alt="Fast Trip Logo" />
            </div>
            <div class="ticket-title" style="font-size: 18px; color: #555;">TICKET INFO &<br>GUIDELINES</div>
        </div>

        <div class="fare-rule-box">
            <div class="fare-rule-title">Fare Rules & Policies</div>
            <div class="rule-list">
                ${fareRulesHtml}
            </div>
        </div>

        <div class="baggage-guidelines">
            <div class="status-header red">
                <span class="material-symbols-outlined">warning</span>
                <div class="status-title red-text">Prohibited Items</div>
            </div>
            <div class="info-list" style="margin-bottom: 20px; text-align: center; font-size: 13px;">
                Items that are strictly not allowed in cabin or checked baggage.
            </div>
            
            <div class="prohibited-grid">
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">radar</span></div>
                    <div class="prohibited-text">Radioactive<br>materials</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">mode_heat</span></div>
                    <div class="prohibited-text">Explosives</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">hardware</span></div>
                    <div class="prohibited-text">Ammunition</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">science</span></div>
                    <div class="prohibited-text">Corrosive</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">experiment</span></div>
                    <div class="prohibited-text">Peroxides &<br>oxidisers</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">warning</span></div>
                    <div class="prohibited-text">Misc dangerous<br>goods</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">oil_barrel</span></div>
                    <div class="prohibited-text">Flammable liquids</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">local_fire_department</span></div>
                    <div class="prohibited-text">Flammable solids,<br>etc</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">air</span></div>
                    <div class="prohibited-text">Gases</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">coronavirus</span></div>
                    <div class="prohibited-text">Toxic and infectious<br>substances</div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">battery_charging_full</span></div>
                    <div class="prohibited-text">Power bank*<small>(*Allowed in carry-on baggage only)</small></div>
                </div>
                <div class="prohibited-item">
                    <div class="prohibited-icon"><span class="material-symbols-outlined">eco</span></div>
                    <div class="prohibited-text">Dry coconut<br>(Copra)</div>
                </div>
            </div>
        </div>
        
        <div class="info-title" style="margin-top: 50px;">Important Guidelines</div>
        <ul class="info-list">
            <li><strong>Check-in:</strong> Passengers must arrive at the airport at least 2 hours prior to the scheduled departure. Counters close 45 minutes before departure.</li>
            <li><strong>Valid ID:</strong> Please carry a valid government-issued photo identification along with this e-ticket.</li>
            <li><strong>Web Check-in:</strong> Web check-in is mandatory for most airlines. Please complete it on the airline's website before arriving at the airport.</li>
            <li><strong>Boarding Gates:</strong> Boarding gates close 20 minutes prior to departure. Keep an eye on airport screens for gate changes.</li>
        </ul>

        <div class="footer" style="margin-top: auto;">
            <div class="footer-left">
                <strong>Fast Trip</strong>
                <p>Support: help@fasttrip.in | Phone: +91 6900507933</p>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    async generateTicketEmailHtml(bookingId: string): Promise<string> {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { passengers: true }
        });

        if (!booking) throw new Error('Booking not found');

        const flightData = booking.selectedFlightData as any;
        const meta = flightData?.meta || {};
        const segments = Array.isArray(meta.segments) ? meta.segments : [];
        const fareOptions = Array.isArray(flightData?.fareOptions) ? flightData.fareOptions : [];

        let airlineName = 'FastTrip Airlines';
        let carrierCode = '6E';
        let flightNumber = '101';
        let originCode = 'ORG';
        let destCode = 'DST';
        let originCity = 'Origin';
        let destCity = 'Destination';
        let originAirport = 'Origin Airport';
        let destAirport = 'Destination Airport';
        let departureTimeStr = new Date().toISOString();
        let arrivalTimeStr = new Date().toISOString();
        let duration = '0h 0m';
        
        let cabinBaggageText = '7 Kg (1 Piece)';
        let checkinBaggageText = '15 Kg (1 Piece)';

        const directBaggage = fareOptions[0]?.baggage;
        if (directBaggage) {
            const checkin = directBaggage.checkin?.weight;
            const cabin = directBaggage.cabin?.weight;
            if (checkin) checkinBaggageText = `${checkin} Kg`;
            if (cabin) cabinBaggageText = `${cabin} Kg`;
        } else {
             const fallbackTraveler = fareOptions[0]?.raw?.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
             const fbCheckin = fallbackTraveler?.includedCheckedBags?.weight;
             const fbCabin = fallbackTraveler?.includedCabinBags?.weight;
             if (fbCheckin) checkinBaggageText = `${fbCheckin} Kg`;
             if (fbCabin) cabinBaggageText = `${fbCabin} Kg`;
        }
        
        let baggageText = `${checkinBaggageText} Check-in / ${cabinBaggageText} Cabin`;

        if (flightData?.priceDetails?.[0]?.singlePaxDetails?.adult?.checkingBaggage) {
             const checkinBaggage = flightData.priceDetails[0].singlePaxDetails.adult.checkingBaggage;
             baggageText = `Check-In : ${checkinBaggage}`;
             if (flightData.priceDetails[0].singlePaxDetails.adult.handBaggage) {
                 baggageText += ` | Cabin : ${flightData.priceDetails[0].singlePaxDetails.adult.handBaggage}`;
             }
        }

        if (segments.length > 0) {
            const firstSeg = segments[0];
            const lastSeg = segments[segments.length - 1];
            carrierCode = firstSeg.airline || carrierCode;
            airlineName = firstSeg.airlineName || airlineName;
            flightNumber = firstSeg.flightNumber || flightNumber;
            originCode = firstSeg.from || originCode;
            destCode = lastSeg.to || destCode;
            originCity = firstSeg.originCity || originCode;
            destCity = lastSeg.destinationCity || destCode;
            originAirport = firstSeg.originAirport || `${originCode} Airport`;
            destAirport = lastSeg.destinationAirport || `${destCode} Airport`;
            departureTimeStr = firstSeg.dep || departureTimeStr;
            arrivalTimeStr = lastSeg.arr || arrivalTimeStr;
            duration = firstSeg.duration || meta.duration || duration;
        } else if (flightData?.itineraries && flightData.itineraries.length > 0 && flightData.itineraries[0].segments) {
            const seg = flightData.itineraries[0].segments[0];
            const lastSeg = flightData.itineraries[0].segments[flightData.itineraries[0].segments.length - 1];
            carrierCode = seg.carrierCode || carrierCode;
            airlineName = seg.carrierCode || airlineName;
            flightNumber = seg.number || flightNumber;
            originCode = seg.departure?.iataCode || originCode;
            destCode = lastSeg.arrival?.iataCode || destCode;
            originCity = originCode; destCity = destCode;
            originAirport = `${originCode} Airport`;
            destAirport = `${destCode} Airport`;
            departureTimeStr = seg.departure?.at || departureTimeStr;
            arrivalTimeStr = lastSeg.arrival?.at || arrivalTimeStr;
            duration = flightData.itineraries[0].duration || duration;
        }

        if (typeof duration === 'string' && duration.startsWith('PT')) {
            duration = duration.replace('PT', '').toLowerCase();
        } else if (!isNaN(Number(duration)) && String(duration).trim() !== '') {
            const totalMins = Number(duration);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            duration = `${hrs}h ${mins}m`;
        }

        try {
            const orgAirport = await this.prisma.airport.findFirst({ where: { iataCode: originCode } });
            if (orgAirport) {
                if (orgAirport.city) originCity = orgAirport.city;
                if (orgAirport.airportName) originAirport = orgAirport.airportName;
            }
            const dstAirport = await this.prisma.airport.findFirst({ where: { iataCode: destCode } });
            if (dstAirport) {
                if (dstAirport.city) destCity = dstAirport.city;
                if (dstAirport.airportName) destAirport = dstAirport.airportName;
            }
        } catch(e) { }

        const pnr = booking.pnr || 'PENDING';
        const contactPhone = booking.contactPhone || 'N/A';
        const contactEmail = booking.contactEmail || 'N/A';
        const grossFare = booking.totalAmount || 0;
        
        let baseFare = 0;
        let taxes = 0;
        let convenienceFee = 0;
        
        const pricing = booking.pricingSnapshot as any;
        if (pricing && pricing.fare) {
            baseFare = pricing.fare.base || 0;
            taxes = pricing.fare.tax || 0;
            convenienceFee = grossFare - baseFare - taxes;
            if (convenienceFee < 0) convenienceFee = 0;
        } else {
            baseFare = Math.floor(grossFare * 0.85);
            taxes = Math.floor(grossFare * 0.1);
            convenienceFee = grossFare - baseFare - taxes;
        }

        const depDate = dayjs(departureTimeStr);
        const arrDate = dayjs(arrivalTimeStr);

        let passengersHtml = '';
        if (booking.passengers && booking.passengers.length > 0) {
            booking.passengers.forEach(pax => {
                const title = pax.title ? `${pax.title}. ` : (pax.gender?.toLowerCase() === 'female' ? 'Ms. ' : 'Mr. ');
                const fullName = `${title}${pax.firstName} ${pax.lastName}`;
                const paxBaggage = pax.baggage || baggageText;
                
                passengersHtml += `
                <table border="0" cellpadding="12" cellspacing="0" width="100%" style="border: 1px solid #eaeaea; border-radius: 8px; margin-bottom: 8px;">
                    <tr>
                        <td width="40%" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">${fullName}</td>
                        <td width="60%" align="right" style="font-family: Arial, sans-serif; font-size: 12px; color: #444444;">Baggage : <strong style="color: #000;">${paxBaggage}</strong></td>
                    </tr>
                </table>`;
            });
        }
        
        const displayFlightNumber = flightNumber.startsWith(carrierCode) ? flightNumber : `${carrierCode}-${flightNumber}`;

        return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Ticket Confirmation</title>
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: Arial, sans-serif; }
    </style>
</head>
<body style="background-color: #f4f4f4; margin: 0; padding: 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="650" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="50%" align="left" valign="middle">
                                        <img src="https://static.wixstatic.com/media/dbf281_3a902d8ce7e942b59f0ccb832b98117e~mv2.png" alt="Fast Trip" width="160" style="display: block; max-width: 100%;" />
                                    </td>
                                    <td width="50%" align="right" valign="middle" style="font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #1a1a1a; line-height: 1.2;">
                                        TICKET<br>CONFIRMATION
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="30" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr></table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: Arial, sans-serif; font-size: 15px; color: #444444; padding-bottom: 12px;">
                                        Booking Ref. : <strong style="color: #000000;">${booking.bookingRef}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; PNR : <strong style="color: #000000;">${pnr}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <span style="background-color: #e0e0e0; color: #1a1a1a; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 12px; display: inline-block;">${originCode}-${destCode}</span>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="25" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr></table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffebe3; border-radius: 12px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td width="15%" align="center" valign="top">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                            <td align="center">
                                                                <img src="https://pics.avs.io/200/200/${carrierCode}.png" width="40" height="40" style="display:block; border-radius: 6px;" alt="${airlineName}" />
                                                            </td>
                                                        </tr>
                                                        <tr><td align="center" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a; padding-top: 6px;">${airlineName}</td></tr>
                                                        <tr><td align="center" style="font-family: Arial, sans-serif; font-size: 10px; color: #555555;">${displayFlightNumber}</td></tr>
                                                    </table>
                                                </td>
                                                <td width="30%" align="left" valign="top" style="padding-left: 15px;">
                                                    <div style="font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px;">${originCity} (${originCode})</div>
                                                    <div style="font-family: Arial, sans-serif; font-size: 11px; color: #555555; line-height: 1.3; margin-bottom: 8px;">${originAirport}</div>
                                                    <div style="background-color: #ffffff; border-radius: 15px; padding: 4px 10px; display: inline-block; font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a;">
                                                        <strong>${depDate.format('HH:mm')}</strong> ${depDate.format('ddd, DD MMM YYYY')}
                                                    </div>
                                                </td>
                                                <td width="10%" align="center" valign="middle" style="font-family: Arial, sans-serif; font-size: 24px; color: #1a1a1a; font-weight: bold;">
                                                    &#10140;
                                                </td>
                                                <td width="30%" align="left" valign="top">
                                                    <div style="font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px;">${destCity} (${destCode})</div>
                                                    <div style="font-family: Arial, sans-serif; font-size: 11px; color: #555555; line-height: 1.3; margin-bottom: 8px;">${destAirport}</div>
                                                    <div style="background-color: #ffffff; border-radius: 15px; padding: 4px 10px; display: inline-block; font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a;">
                                                        <strong>${arrDate.format('HH:mm')}</strong> ${arrDate.format('ddd, DD MMM YYYY')}
                                                    </div>
                                                </td>
                                                <td width="15%" align="center" valign="top">
                                                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px;">Duration</div>
                                                    <div style="font-family: Arial, sans-serif; font-size: 18px; color: #555555; margin-bottom: 4px;">&#8986;</div>
                                                    <div style="font-family: Arial, sans-serif; font-size: 11px; color: #555555; font-weight: bold;">${duration}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="25" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr></table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #1a1a1a; padding-bottom: 8px;">Passenger Contact Details :</td>
                                </tr>
                                <tr>
                                    <td style="font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a;">
                                        <strong>Phone :</strong> ${contactPhone} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Email :</strong> ${contactEmail}
                                    </td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="25" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr></table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1a1a1a; padding-bottom: 12px;">Passengers</td>
                                </tr>
                            </table>
                            ${passengersHtml}
                            <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="30" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr></table>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #1a1a1a; padding-bottom: 10px;">Payment Details :</td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #eeeeee; margin-bottom: 2px;">
                                <tr>
                                    <td width="50%" align="left" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">Base Fare</td>
                                    <td width="50%" align="right" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">&#8377;${baseFare.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #eeeeee; margin-bottom: 2px;">
                                <tr>
                                    <td width="50%" align="left" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">Taxes &amp; Surcharges</td>
                                    <td width="50%" align="right" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">&#8377;${taxes.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #eeeeee; margin-bottom: 2px;">
                                <tr>
                                    <td width="50%" align="left" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">Convenience Fee</td>
                                    <td width="50%" align="right" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">&#8377;${convenienceFee.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </table>
                            <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #d6d6d6;">
                                <tr>
                                    <td width="50%" align="left" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">Gross Fare <span style="font-weight: normal; font-size: 10px; margin-left: 8px;">(Non-refundable)</span></td>
                                    <td width="50%" align="right" style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #1a1a1a;">&#8377;${grossFare.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }
}
