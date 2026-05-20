import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { mapToMakeVoyageReviewRequest, mapMakeVoyageReviewResponse } from './adapters/review.adapter';
import { mapToMakeVoyageBookingRequest, mapMakeVoyageBookingResponse } from './adapters/booking.adapter';
import { mapToMakeVoyageGetDetailsRequest, mapMakeVoyageGetDetailsResponse } from './adapters/ticket.adapter';
import { mapMakeVoyageWalletResponse } from './adapters/wallet.adapter';

@Injectable()
export class MVFDProvider {
    private readonly logger = new Logger(MVFDProvider.name);

    getName() {
        return 'FTSpecial'; // Renamed for consistent branding and routing
    }

    async search(dto: any) {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            this.logger.warn('MVFD credentials not found in .env');
            return [];
        }

        try {
            // Prepare Request Payload
            const cabinMap = {
                'ECONOMY': 'EC',
                'PREMIUM_ECONOMY': 'PE',
                'BUSINESS': 'BS',
                'FIRST': 'FC'
            };
            const cabin = cabinMap[dto.travelClass] || 'EC';

            // TravelType detection
            const indianAirports = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'PNQ', 'COK', 'GAU', 'LKO', 'JAI', 'SXR', 'BBI', 'PAT', 'TRV', 'IXC', 'GOI', 'IXB', 'VGA'];
            const isDomestic = indianAirports.includes(dto.origin) && indianAirports.includes(dto.destination);
            const travelType = isDomestic ? 'DO' : 'IN';

            const searchPayload = {
                origin: dto.origin,
                destination: dto.destination,
                date: dto.departureDate,
                travelType: travelType,
                passengers: {
                    adult: dto.adults || 1,
                    child: dto.children || 0,
                    infant: dto.infants || 0,
                    cabin: cabin
                }
            };

            this.logger.debug(`MVFD Search Payload: ${JSON.stringify(searchPayload)}`);
            this.logger.log(`Calling MVFD Search API (FTSpecial) for ${dto.origin}-${dto.destination}`);
            
            const searchRes = await axios.post(`${baseUrl}/service/flightSearch`, searchPayload, {
                headers: { 
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (searchRes.data?.code !== 200) {
                this.logger.warn(`MVFD Search failed with code: ${searchRes.data?.code}. Message: ${searchRes.data?.message}`);
                return [];
            }

            const rawData = searchRes.data.data;
            if (!Array.isArray(rawData)) {
                this.logger.warn('MVFD Search: data is not an array');
                return [];
            }

            return rawData.map((item, idx) => this.mapToInternalFormat(item, idx, dto));

        } catch (error) {
            this.logger.error('MVFD Search error', error.response?.data || error.message);
            return [];
        }
    }

    private mapToInternalFormat(item: any, index: number, dto: any) {
        const flightInfo = item.flightInfo || [];
        const priceDetail = item.priceDetails?.[0] || {};
        const fareDetails = priceDetail.fareDetails || {};
        const paxDetails = priceDetail.singlePaxDetails?.adult || {};

        const firstSeg = flightInfo[0] || {};
        const lastSeg = flightInfo[flightInfo.length - 1] || {};
        const departure = `${firstSeg.departureDate}T${firstSeg.departureTime}:00`;
        const arrival = `${lastSeg.arrivalDate}T${lastSeg.arrivalTime}:00`;

        const parseDuration = (dur: string) => {
            if (!dur) return 120;
            const [h, m] = dur.split(':').map(Number);
            return (h * 60) + (m || 0);
        };

        const adultsCount = Number(dto.adults || 1);
        const childrenCount = Number(dto.children || 0);
        const infantsCount = Number(dto.infants || 0);

        const breakdown: any = {};
        
        // helper to search for pax info in any location
        const findInObject = (obj: any, keys: string[]) => {
            if (!obj) return null;
            for (const key of keys) {
                if (obj[key]) return obj[key];
            }
            return null;
        };

        const paxKeys = {
            ADULT: ['adult', 'adults', 'paxAdult', 'adt', 'ADT'],
            CHILD: ['child', 'children', 'paxChild', 'chd', 'CHD'],
            INFANT: ['infant', 'infants', 'paxInfant', 'inf', 'INF']
        };

        const searchLocations = [
            priceDetail.singlePaxDetails,
            priceDetail.fareDetails,
            priceDetail,
            item.singlePaxDetails,
            item.fareData?.singlePaxDetails,
            item.fareData,
            item.priceDetail,
            item
        ];

        // Process each passenger type
        ['ADULT', 'CHILD', 'INFANT'].forEach(type => {
            const count = type === 'ADULT' ? adultsCount : (type === 'CHILD' ? childrenCount : infantsCount);
            if (count <= 0) return;

            let paxData: any = null;
            for (const loc of searchLocations) {
                paxData = findInObject(loc, paxKeys[type as keyof typeof paxKeys]);
                if (paxData) break;
            }

            if (paxData) {
                const base = parseFloat(paxData.baseFare || paxData.baseAmount || paxData.base || 0);
                const total = parseFloat(paxData.total || paxData.totalAmount || paxData.netFare || 0);
                const tax = parseFloat(paxData.otherTax || paxData.tax || paxData.totalTax || 0);

                breakdown[type] = {
                    count: count,
                    totalBase: base * count,
                    totalTax: (tax || (total - base)) * count
                };
            }
        });

        // Standardized Fare Option Mapping
        const fareOptions = (item.priceDetails || []).map((pd: any, pIdx: number) => {
            const fd = pd.fareDetails || {};
            const spd = pd.singlePaxDetails || {};
            
            // Re-calculate breakdown for this specific fare option
            const optionBreakdown: any = {};
            const pTypes = [
                { key: 'ADULT', paxKeys: ['adult', 'adults', 'paxAdult', 'adt', 'ADT'], count: adultsCount },
                { key: 'CHILD', paxKeys: ['child', 'children', 'paxChild', 'chd', 'CHD'], count: childrenCount },
                { key: 'INFANT', paxKeys: ['infant', 'infants', 'paxInfant', 'inf', 'INF'], count: infantsCount }
            ];

            pTypes.forEach(pt => {
                if (pt.count <= 0) return;
                let pData: any = null;
                for (const k of pt.paxKeys) {
                    pData = spd[k] || pd[k] || item[k];
                    if (pData) break;
                }

                if (pData) {
                    const b = parseFloat(pData.baseFare || pData.baseAmount || pData.base || 0);
                    const t = parseFloat(pData.total || pData.totalAmount || pData.netFare || 0);
                    const tx = parseFloat(pData.otherTax || pData.tax || pData.totalTax || 0);

                    optionBreakdown[pt.key] = {
                        count: pt.count,
                        base: b,
                        tax: tx || (t - b),
                        totalBase: b * pt.count,
                        totalTax: (tx || (t - b)) * pt.count
                    };
                }
            });

            const totalBase: number = (Object.values(optionBreakdown) as any[]).reduce((sum: number, b: any) => sum + (b.totalBase || 0), 0);
            const totalAmount = parseFloat(fd.totalAmount || 0);

            return {
                id: `${pd.flightId}_${pd.fareId}_${pIdx}`,
                supplier: 'FTSpecial',
                supplierFareId: pd.fareId,
                supplierFlightId: pd.flightId,
                supplierTicketId: pd.ticketId,
                brand: pd.fareType || 'Fasttrip Exclusive',
                cabin: firstSeg.cabin?.toUpperCase() || 'ECONOMY',
                fareBasis: pd.bookingClass || 'SERIES',
                class: pd.bookingClass || 'Y',
                price: {
                    base: totalBase,
                    tax: totalAmount - totalBase,
                    total: totalAmount,
                    currency: 'INR'
                },
                passengerBreakdown: optionBreakdown,
                seats: pd.remainingSeats,
                refundable: false,
                changeable: false,
                isFixedDeparture: true,
                baggage: {
                    checkin: { weight: this.cleanBaggage(spd.adult?.checkingBaggage || spd.adult?.checkinBaggage || fd.checkinBaggage || item.checkinBaggage) },
                    cabin: { weight: this.cleanBaggage(spd.adult?.handBaggage || spd.adult?.handbaggage || fd.handBaggage || item.handBaggage) }
                },
                raw: { ...item, ...pd, isSeries: true }
            };
        });

        // Use the cheapest fare for the top-level flight object
        const cheapestFare = fareOptions.reduce((min: any, f: any) => f.price.total < min.price.total ? f : min, fareOptions[0]);

        return {
            id: priceDetail.flightId?.toString() || `MVFD_${item.referenceId}_${index}`,
            supplier: 'FTSpecial',
            cheapestFare: cheapestFare.price.total,
            adultPrice: (cheapestFare.passengerBreakdown.ADULT?.totalBase + cheapestFare.passengerBreakdown.ADULT?.totalTax) / cheapestFare.passengerBreakdown.ADULT?.count || cheapestFare.price.total,
            passengerBreakdown: cheapestFare.passengerBreakdown,
            meta: {
                airlineCode: firstSeg.airlineCode || '6E',
                airlineName: (firstSeg.airlineName || '').replace(/\(Promo\)/gi, '').trim(),
                origin: dto.origin,
                destination: dto.destination,
                departure,
                arrival,
                duration: parseDuration(firstSeg.duration),
                stops: firstSeg.stopCount || (flightInfo.length - 1),
                segments: flightInfo.map((s: any) => ({
                    airline: s.airlineCode,
                    airlineName: s.airlineName,
                    flightNumber: s.flightNumber,
                    from: s.origin,
                    to: s.destination,
                    dep: `${s.departureDate}T${s.departureTime}:00`,
                    arr: `${s.arrivalDate}T${s.arrivalTime}:00`,
                    duration: parseDuration(s.duration),
                    terminalFrom: s.departureTerminal?.replace('Terminal ', '') || '1',
                    terminalTo: s.arrivalTerminal?.replace('Terminal ', '') || '1',
                })),
                raw: { ...item, isSeries: true },
                baggage: cheapestFare.baggage
            },
            fareOptions: fareOptions,
            rawData: { ...item, supplier: 'FTSpecial', isFixedDeparture: true }
        };
    }

    private cleanBaggage(val: any): string | null {
        if (!val) return null;
        const str = String(val).split(' ')[0];
        const numeric = str.replace(/[^0-9]/g, '');
        return numeric || null;
    }

    async priceOffer(data: any) {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        // VALIDATION RULES (MANDATORY)
        if (!data.passengerCount || data.passengerCount.adult < 1) throw new Error("At least 1 adult required");
        if (data.passengerCount.infant > data.passengerCount.adult) throw new Error("Infant cannot exceed adult");
        if ((data.passengerCount.adult + data.passengerCount.child) > 9) throw new Error("Max 9 passengers allowed");

        // ADAPTER: Request
        const requestPayload = mapToMakeVoyageReviewRequest(data);

        this.logger.log(`Calling MVFD Review API (bookFlight) for flightId: ${requestPayload.flightId}`);
        this.logger.debug(`MVFD Review Payload: ${JSON.stringify(requestPayload)}`);
        
        let response;
        try {
            response = await axios.post(`${baseUrl}/service/bookFlight`, requestPayload, {
                headers: { 
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err: any) {
            this.logger.error(`MVFD Price Review HTTP failed: ${err.message}`, err.response?.data);
            throw new Error(`MVFD Price Review API failed: ${JSON.stringify(err.response?.data || err.message)}`);
        }

        if (response.data?.code !== 200) {
            throw new Error(`MVFD Price Review failed: ${response.data?.message || 'Unknown error'}`);
        }

        // ADAPTER: Response
        return mapMakeVoyageReviewResponse(response.data);
    }

    async initiateBooking(data: any) {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        // VALIDATION (MANDATORY BEFORE API CALL)
        if (!data.bookingId) throw new Error("Missing bookingId");
        if (!data.passengers || data.passengers.length === 0) throw new Error("Passengers required");
        
        data.passengers.forEach((p: any) => {
            if (!p.firstName || !p.lastName) throw new Error("Invalid passenger name");
            if (!p.type) throw new Error("Passenger type missing");
        });

        // ADAPTER: Request
        const requestPayload = mapToMakeVoyageBookingRequest(data);

        this.logger.log(`Initiating MVFD Booking for ID: ${requestPayload.bookingId}`);
        this.logger.debug(`MVFD Initiation Payload: ${JSON.stringify(requestPayload)}`);

        const response = await axios.post(`${baseUrl}/service/initiate`, requestPayload, {
            headers: { 
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.code !== 200) {
            throw new Error(`MVFD Booking Initiation failed: ${response.data?.message || 'Unknown error'}`);
        }

        // ADAPTER: Response
        return mapMakeVoyageBookingResponse(response.data);
    }

    async getBookingDetails(data: any) {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        // ADAPTER: Request
        const requestPayload = mapToMakeVoyageGetDetailsRequest(data);

        this.logger.log(`Fetching MVFD Booking Details for Ref: ${requestPayload.bookingReferenceId}`);

        const response = await axios.post(`${baseUrl}/service/getBookingDetails`, requestPayload, {
            headers: { 
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.code !== 200) {
            throw new Error(`MVFD Get Booking Details failed: ${response.data?.message || 'Unknown error'}`);
        }

        // ADAPTER: Response
        return mapMakeVoyageGetDetailsResponse(response.data);
    }

    async getWalletBalance() {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        const response = await axios.get(`${baseUrl}/wallet/getBalance`, {
            headers: { 
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.data?.code !== 200) {
            throw new Error(`MVFD Wallet Balance fetch failed: ${response.data?.message || 'Unknown error'}`);
        }

        // ADAPTER: Response
        return mapMakeVoyageWalletResponse(response.data);
    }

    async getAvailableSectors() {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        const response = await axios.get(`${baseUrl}/service/availableSectors`, {
            headers: { 'x-api-key': apiKey }
        });

        return response.data;
    }
}
