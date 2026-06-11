import { Injectable, InternalServerErrorException, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import { Pool } from 'pg';
import { SearchFlightDto } from './dto/search-flight.dto';
import { FaresDto } from './dto/fares.dto';
import { LockFareDto } from './dto/lock-fare.dto';
import { BookFlightDto } from './dto/book-flight.dto';
import { TicketDto } from './dto/ticket.dto';
import { AmadeusClient } from './amadeus.client';

// NEW — Provider Architecture
import { FlightProviderManager } from './providers/flights/flight-provider.manager';
import { getRegisteredProviders } from './providers/flights/registry';
import { PrismaService } from '../prisma/prisma.service';

type AirlineMeta = {
    airline_id?: number | null;
    code?: string | null;
    icao?: string | null;
    name?: string | null;
    callsign?: string | null;
    country?: string | null;
    logo_png_url?: string | null;
    logo_svg_url?: string | null;
};

@Injectable()
export class FlightsService implements OnModuleInit {
    private readonly logger = new Logger(FlightsService.name);
    private pool: Pool | undefined;
    private airlinesMap: Record<string, AirlineMeta> = {};

    // NEW: provider manager
    private providerManager: FlightProviderManager;
    private activeSuppliers: string[] = [];

    constructor(
        private readonly amadeus: AmadeusClient,
        private readonly prisma: PrismaService,
    ) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            this.logger.warn('DATABASE_URL not set — airlines enrichment disabled');
        } else {
            this.pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
            });
        }

        // create provider manager with getters so it can access the latest airlinesMap and use our duration formatter
        this.providerManager = new FlightProviderManager(
            () => this.airlinesMap,
            (iso?: string | null) => this.formatDuration(iso),
        );

        // Register providers
        const providers = getRegisteredProviders(this.prisma);
        this.providerManager.setProviders(providers);
    }

    async onModuleInit() {
        if (this.pool || this.prisma) {
            await this.loadAirlines().catch((e) =>
                this.logger.error('Failed to load airlines metadata', e),
            );
        }
    }

    // ------------------------------------------------------------
    // Load airline metadata
    // ------------------------------------------------------------
    private async loadAirlines() {
        try {
            const airlines = await this.prisma.airline.findMany({
                where: {
                    iata: {
                        not: null
                    }
                }
            });

            this.airlinesMap = {};

            for (const row of airlines) {
                const iata = (row.iata ?? '').toUpperCase();
                if (!iata) continue;

                this.airlinesMap[iata] = {
                    airline_id: row.airlineId ?? null,
                    code: iata,
                    icao: row.icao ?? null,
                    name: row.name ?? null,
                    callsign: row.callsign ?? null,
                    country: row.country ?? null,
                    logo_png_url: row.logoPngUrl ?? null,
                    logo_svg_url: row.logoSvgUrl ?? null,
                };
            }

            this.logger.log(`Loaded ${Object.keys(this.airlinesMap).length} airlines`);
        } catch (e) {
            this.logger.error('Failed to load airlines metadata', e);
        }
    }

    // ------------------------------------------------------------
    // Utility helpers
    // ------------------------------------------------------------
    private formatDuration(iso: string | null | undefined) {
        if (!iso) return null;
        // ISO-8601 like PT2H5M -> "2h 5m"
        const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(String(iso));
        if (!match) {
            // if the provider already returned a readable duration (like minutes number), try to handle small cases
            const minutes = Number(iso);
            if (!isNaN(minutes)) {
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;
                if (h && m) return `${h}h ${m}m`;
                if (h) return `${h}h`;
                return `${m}m`;
            }
            return iso;
        }

        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const mins = match[2] ? parseInt(match[2], 10) : 0;

        if (hours && mins) return `${hours}h ${mins}m`;
        if (hours) return `${hours}h`;
        return `${mins}m`;
    }

    async getMVFDSectors() {
        const apiKey = process.env.MVFD_API_KEY;
        const baseUrl = process.env.MVFD_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('MVFD credentials not found');
        }

        try {
            const { data } = await axios.get(`${baseUrl}/service/availableSectors`, {
                headers: { 
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            return data;
        } catch (err) {
            this.logger.error('Failed to fetch MVFD sectors', err.message);
            throw err;
        }
    }

    // ------------------------------------------------------------
    // MULTI-PROVIDER SEARCH ENGINE (NEW)
    // ------------------------------------------------------------
    async search(dto: SearchFlightDto) {
        try {
            if (!dto.origin || !dto.destination || !dto.departureDate) {
                throw new Error('origin, destination & departureDate are required');
            }

            this.logger.log('🔍 Multi-provider flight search triggered...');

            // Basic caching logic (placeholder for Redis)
            const cacheKey = `search:${dto.origin}:${dto.destination}:${dto.departureDate}:${dto.returnDate || ''}:${dto.adults}`;
            
            // NEW: Fetch active suppliers from DB
            const supplierConfigs = await this.prisma.supplierConfig.findMany({
                where: { isActive: true },
                select: { name: true }
            });
            const activeSuppliers = supplierConfigs.map(s => s.name);

            // In-memory cache for now as Redis isn't in package.json yet
            // In production, this would use Redis via CacheManager
            const results = await this.providerManager.searchOffers(dto, activeSuppliers);

            return {
                success: true,
                timestamp: new Date().toISOString(),
                providers: results.providers,
                onwardFlights: results.onwardFlights,
                returnFlights: results.returnFlights,
                raw: process.env.NODE_ENV === 'development' ? results.raw : undefined,
            };
        } catch (err: any) {
            this.logger.error('Provider search failed', err?.response?.data || err);
            throw new InternalServerErrorException('Flight search failed');
        }
    }

    async validateBundle(onward: any, ret: any) {
        try {
            this.logger.log(`Validating bundle: ${onward.id} + ${ret.id}`);
            
            // Logic: If both belong to the same Amadeus offer, use single pricing
            if (onward.groupId === ret.groupId && onward.supplier === 'AMADEUS') {
                return await this.amadeus.priceOfferWithAncillaries(onward.rawData, []);
            }
            
            // Logic for split-supplier or independent validation
            // For now, we assume amadeus-only or throw as "unsupported combination" if they don't match
            // In a real multi-supplier setup, this is where we'd orchestrate multiple pricing calls
            throw new Error('Multi-supplier combinations are not yet supported for direct booking');
        } catch (err) {
            this.logger.error('Bundle validation error', err);
            throw new InternalServerErrorException(err.message || 'Bundle validation failed');
        }
    }

    async validateRoundtripPrice(offer: any) {
        try {
            this.logger.log('Validating round-trip price...');
            return await this.amadeus.priceOfferWithAncillaries(offer, []);
        } catch (err) {
            this.logger.error('validation error', err);
            throw new InternalServerErrorException('Price validation failed');
        }
    }

    // TEST ROUTE
    async testProviders(dto: SearchFlightDto) {
        return this.providerManager.searchOffers(dto);
    }

    async status(params: { airline: string; flightNumber: string; date?: string }) {
        try {
            return this.amadeus.getFlightStatus(params);
        } catch (err) {
            this.logger.error('status error', err);
            throw new InternalServerErrorException('Flight status failed');
        }
    }

    async getUpsellOffers(offer: any) {
        try {
            return await this.amadeus.getUpsellOffers(offer);
        } catch (err) {
            this.logger.error('upsell error', err);
            throw new InternalServerErrorException('Get Upsell Offers failed');
        }
    }

    async getFares(dto: FaresDto) {
        try {
            return this.amadeus.getFares(dto);
        } catch (err) {
            this.logger.error('fares error', err);
            throw new InternalServerErrorException('Get fares failed');
        }
    }

    async getSeatMap(offer: any) {
        try {
            return await this.amadeus.getSeatMap(offer);
        } catch (err) {
            this.logger.error('seatMap error', err);
            throw new InternalServerErrorException('Seatmap fetch failed');
        }
    }

    async priceOfferWithAncillaries(data: any) {
        try {
            const result = await this.providerManager.priceOffer(data);

            // LOG FOR ADMIN: Record this successful price review
            try {
                await this.prisma.userActivity.create({
                    data: {
                        userId: data.userId || 'GUEST',
                        action: 'FLIGHT_REVIEW',
                        description: `Price confirmed for ${data.supplier}: ${result.fare?.total} INR`,
                        metadata: {
                            supplier: data.supplier,
                            flightId: data.flightId,
                            totalAmount: result.fare?.total,
                            bookingId: result.bookingId,
                            pax: data.passengerCount
                        }
                    }
                });
            } catch (logErr) {
                this.logger.warn(`Failed to log review activity: ${logErr.message}`);
            }

            return result;
        } catch (err) {
            this.logger.error('pricing ancillaries error', err);
            throw new InternalServerErrorException(err.message || 'Pricing with ancillaries failed');
        }
    }

    async lockFare(dto: LockFareDto) {
        try {
            return this.amadeus.lockFare(dto);
        } catch (err) {
            this.logger.error('lockFare error', err);
            throw new InternalServerErrorException('Lock fare failed');
        }
    }

    async initiate(bookingData: any) {
        try {
            // STEP 1: RISK CONTROL - Check Wallet Balance
            if (bookingData.supplier === 'makevoyage' || bookingData.supplier === 'FTSpecial') {
                try {
                    const wallet = await this.providerManager.getWalletBalance(bookingData.supplier);
                    
                    const internalBooking = await this.prisma.booking.findFirst({
                        where: { 
                            OR: [
                                { id: bookingData.internalBookingId },
                                { supplierOfferId: String(bookingData.bookingId) }
                            ]
                        }
                    });

                    const amountToBook = internalBooking?.totalAmount || 0;

                    if (amountToBook > 0 && wallet.balance < amountToBook) {
                        this.logger.error(`Risk Control: Insufficient wallet balance for ${bookingData.supplier}. Required: ${amountToBook}, Available: ${wallet.balance}`);
                        throw new BadRequestException(`Insufficient wallet balance on supplier account. Please contact support.`);
                    }
                } catch (walletErr) {
                    this.logger.warn(`Wallet check skipped or failed: ${walletErr.message}`);
                    if (walletErr instanceof BadRequestException) throw walletErr;
                }
            }

            if (bookingData.userId) {
                try {
                    await this.prisma.userActivity.create({
                        data: {
                            userId: bookingData.userId,
                            action: 'BOOKING_INITIATE_START',
                            description: `Initiating booking for supplier: ${bookingData.supplier}`,
                            metadata: {
                                supplierBookingId: bookingData.bookingId,
                                supplier: bookingData.supplier,
                                paxCount: bookingData.passengers?.length
                            }
                        }
                    });
                } catch (logErr) {
                    this.logger.warn(`Failed to log initiate start: ${logErr.message}`);
                }
            }

            // STEP 3: CALL PROVIDER MANAGER
            const result = await this.providerManager.initiateBooking(bookingData);

            return result;
        } catch (err) {
            this.logger.error(`Initiate booking failed: ${err.response?.data?.message || err.message}`);
            if (err.response?.data) {
                this.logger.error(`Supplier Error Details: ${JSON.stringify(err.response.data)}`);
            }
            if (err instanceof BadRequestException) throw err;
            throw new InternalServerErrorException(err.response?.data?.message || err.message || 'Initiate booking failed');
        }
    }

    async getWalletBalance(supplier: string) {
        try {
            return await this.providerManager.getWalletBalance(supplier);
        } catch (err) {
            this.logger.error(`Failed to fetch wallet balance for ${supplier}: ${err.message}`);
            throw new InternalServerErrorException(`Could not fetch wallet balance for ${supplier}`);
        }
    }


    async book(dto: BookFlightDto) {
        try {
            return this.amadeus.book(dto);
        } catch (err) {
            this.logger.error('book error', err);
            throw new InternalServerErrorException('Booking failed');
        }
    }

    async ticket(dto: TicketDto) {
        try {
            return this.amadeus.ticket(dto);
        } catch (err) {
            this.logger.error('ticket error', err);
            throw new InternalServerErrorException('Ticketing failed');
        }
    }

    async getBooking(id: string) {
        try {
            const internalBooking = await this.prisma.booking.findUnique({
                where: { id },
                include: { user: true }
            });

            if (!internalBooking) {
                throw new Error('Booking not found in internal records');
            }

            if (!internalBooking.supplier || !internalBooking.bookingRef) {
                // If it's a legacy or manual booking without a supplier ref, return internal data
                return {
                    bookingRef: internalBooking.bookingRef,
                    status: internalBooking.bookingStatus,
                    pnr: internalBooking.pnr,
                    internalData: internalBooking
                };
            }

            // STEP 1: FETCH FROM PROVIDER (TICKET CONFIRMATION)
            const ticket = await this.providerManager.getBookingDetails({
                supplier: internalBooking.supplier,
                bookingRef: internalBooking.bookingRef,
                userId: internalBooking.userId
            });

            // STEP 2: UPDATE DB WITH CONFIRMED STATUS
            await this.prisma.booking.update({
                where: { id: internalBooking.id },
                data: {
                    bookingStatus: 'CONFIRMED', // Normalize to our enum
                    pnr: ticket.pnr || internalBooking.pnr,
                    pricingSnapshot: ticket as any, // Store full normalized response as ticket data
                    updatedAt: new Date()
                }
            });

            // LOG ACTIVITY
            try {
                await this.prisma.userActivity.create({
                    data: {
                        userId: internalBooking.userId,
                        action: 'TICKET_CONFIRMED',
                        description: `Ticket confirmed for PNR: ${ticket.pnr}`,
                        metadata: {
                            bookingId: internalBooking.id,
                            supplier: internalBooking.supplier,
                            pnr: ticket.pnr
                        }
                    }
                });
            } catch (logErr) {
                this.logger.warn(`Failed to log ticket confirmation: ${logErr.message}`);
            }

            return ticket;
        } catch (err) {
            this.logger.error(`Get Booking Details failed: ${err.message}`);
            throw new InternalServerErrorException(err.message || 'Failed to fetch booking details');
        }
    }
}
