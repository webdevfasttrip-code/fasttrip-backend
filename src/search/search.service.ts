import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getDistance } from 'geolib';
import { Prisma } from '@prisma/client';
import { AmadeusService } from '../suppliers/amadeus.service';
import { SearchFlightDto } from '../flights/dto/search-flight.dto';
import { SearchAirportDto } from './dto/search-airport.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MarkupService } from '../admin/markup/markup.service';
import { SeriesFareService } from '../admin/series-fares/series-fares.service';
import { MVFDProvider } from '../flights/providers/flights/mvfd.provider';
import { InternalInventoryProvider } from '../flights/providers/flights/internal-inventory.provider';
import { FareResult } from './interfaces/fare-result.interface';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);
    constructor(
        private amadeusService: AmadeusService,
        private mvfdProvider: MVFDProvider,
        private internalInventoryProvider: InternalInventoryProvider,
        private prisma: PrismaService,
        private markupService: MarkupService,
        private seriesFareService: SeriesFareService,
    ) { }

    async search(dto: SearchFlightDto) {
        // 1. Fetch Active Suppliers ordered by Priority
        const activeSuppliers = await this.prisma.supplierConfig.findMany({
            where: { isActive: true },
            orderBy: { priority: 'asc' }
        });

        if (activeSuppliers.length === 0) {
            return { flights: [], message: 'No active flight sources available.' };
        }

        // 2. Collect Results from Active Suppliers
        const results: any[] = [];
        const airportMapAccumulator = new Map();
        
        for (const supplier of activeSuppliers) {
            try {
                if (supplier.name === 'Amadeus') {
                    const rawResults = await this.amadeusService.searchFlightOffers({
                        originLocationCode: dto.origin,
                        destinationLocationCode: dto.destination,
                        departureDate: dto.departureDate,
                        adults: dto.adults,
                        children: dto.children,
                        infants: dto.infants,
                        travelClass: dto.travelClass,
                    });
                    
                    const standardized = await this.standardizeAndEnrichResponse(rawResults, supplier.name);
                    results.push(...standardized.flights);
                    
                    // Merge airports
                    Object.entries(standardized.airports).forEach(([code, data]) => {
                        airportMapAccumulator.set(code, data);
                    });
                } else if (supplier.name.toUpperCase() === 'MVFD' || supplier.name.toUpperCase() === 'FTSPECIAL') {
                    const mvfdResults = await this.mvfdProvider.search(dto);
                    if (mvfdResults && mvfdResults.length > 0) {
                        results.push(...mvfdResults);
                        
                        // Collect missing airport codes for MVFD flights to populate the airport map
                        const airportCodesToFetch = new Set<string>();
                        mvfdResults.forEach((flight: any) => {
                            if (flight.meta?.origin) airportCodesToFetch.add(flight.meta.origin);
                            if (flight.meta?.destination) airportCodesToFetch.add(flight.meta.destination);
                            flight.meta?.segments?.forEach((seg: any) => {
                                if (seg.from) airportCodesToFetch.add(seg.from);
                                if (seg.to) airportCodesToFetch.add(seg.to);
                            });
                        });
                        
                        const missingCodes = Array.from(airportCodesToFetch).filter(code => !airportMapAccumulator.has(code));
                        if (missingCodes.length > 0) {
                            const dbAirports = await this.getAirportsByCodes(missingCodes);
                            dbAirports.forEach((airport: any) => {
                                airportMapAccumulator.set(airport.iataCode, airport);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Search failed for supplier ${supplier.name}:`, error.message);
            }
        }

        const response = { 
            flights: results,
            airports: Object.fromEntries(airportMapAccumulator)
        };

        if (results.length > 0) {
            this.updateFareCache(dto, results).catch(err => 
                this.logger.warn(`Cache update failed: ${err.message}`)
            );
        }

        return response;
    }

    async revalidate(supplierName: string, rawOffer: any, passengers?: any[], supplierOfferId?: string, passengerCountOverride?: any) {
        const normalizedName = supplierName.toUpperCase();
        
        // Calculate actual passenger counts
        let passengerCount = { adult: 1, child: 0, infant: 0 };
        if (passengerCountOverride) {
            passengerCount = passengerCountOverride;
        } else if (passengers && Array.isArray(passengers) && passengers.length > 0) {
            passengerCount = passengers.reduce((acc, p) => {
                const type = (p.type || 'ADULT').toUpperCase();
                if (type === 'CHILD' || type === 'CHD') acc.child++;
                else if (type === 'INFANT' || type === 'INF') acc.infant++;
                else acc.adult++;
                return acc;
            }, { adult: 0, child: 0, infant: 0 });

            // Ensure at least 1 adult if we have passengers but none were identified as adults
            if (passengerCount.adult === 0 && passengers.length > 0) {
                passengerCount.adult = 1;
            }
        } else if (rawOffer.passengers) {
            passengerCount = {
                adult: rawOffer.passengers.adult || 1,
                child: rawOffer.passengers.child || 0,
                infant: rawOffer.passengers.infant || 0
            };
        }

        if (normalizedName === 'AMADEUS') {
            const result = await this.amadeusService.revalidateOffer(rawOffer);
            return {
                totalPrice: result.totalPrice,
                rawPricingResponse: result
            };
        }
        
        if (normalizedName === 'MVFD' || normalizedName === 'FTSPECIAL' || normalizedName === 'MAKEVOYAGE') {
            // Find the correct price detail if multiple exist
            let selectedPriceDetail = rawOffer.priceDetails?.[0];
            if (supplierOfferId && rawOffer.priceDetails) {
                const found = rawOffer.priceDetails.find(p => 
                    p.flightId?.toString() === supplierOfferId || 
                    p.ticketId?.toString() === supplierOfferId
                );
                if (found) selectedPriceDetail = found;
            }

            const pricePayload = {
                flightId: rawOffer.flightId || rawOffer.id || selectedPriceDetail?.flightId,
                referenceId: rawOffer.referenceId,
                ticketId: rawOffer.ticketId || selectedPriceDetail?.ticketId,
                fareId: (rawOffer.fareId !== undefined && rawOffer.fareId !== null) ? rawOffer.fareId : selectedPriceDetail?.fareId,
                passengerCount,
                passengers
            };

            this.logger.log(`MVFD Price Review Input: ${JSON.stringify(pricePayload)}`);
            const result = await this.mvfdProvider.priceOffer(pricePayload);
            
            return {
                totalPrice: result.fare.total,
                rawPricingResponse: result
            };
        }
        
        if (normalizedName === 'INTERNAL_INVENTORY' || normalizedName === 'INTERNAL') {
            const result = await this.internalInventoryProvider.priceOffer(rawOffer);
            return {
                totalPrice: result.price.total,
                rawPricingResponse: result
            };
        }
        
        throw new Error(`Unsupported Supplier: ${supplierName}`);
    }

    private readonly ALIAS_MAP: Record<string, string[]> = {
        "goa": ["GOI", "GOX"],
        "delhi": ["DEL"],
        "new delhi": ["DEL"],
        "mumbai": ["BOM"],
        "bombay": ["BOM"],
        "bangalore": ["BLR"],
        "bengaluru": ["BLR"],
        "chennai": ["MAA"],
        "madras": ["MAA"],
        "hyderabad": ["HYD"],
        "kolkata": ["CCU"],
        "calcutta": ["CCU"],
        "dubai": ["DXB"],
        "bangkok": ["BKK"],
        "singapore": ["SIN"],
        "pune": ["PNQ"],
        "kochi": ["COK"],
        "cochin": ["COK"],
        "ahmedabad": ["AMD"]
    };

    async searchAirports(query: SearchAirportDto) {
        const { q, limit = 10 } = query;
        if (!q || q.trim().length < 2) return [];
        const searchTerm = q.trim();
        const qUpper = searchTerm.toUpperCase();
        const qLower = searchTerm.toLowerCase();

        try {
            // Check for aliases
            const searchIatas: string[] = [];
            Object.entries(this.ALIAS_MAP).forEach(([alias, iatas]) => {
                if (alias.startsWith(qLower) || qLower.startsWith(alias)) {
                    searchIatas.push(...iatas);
                }
            });
            if (qUpper.length === 3) searchIatas.push(qUpper);

            // STEP 1 - Query Candidate Airports
            const candidates = await this.prisma.airport.findMany({
                where: {
                    isSearchable: true,
                    airportType: { notIn: ['MILITARY', 'PRIVATE'] },
                    OR: [
                        { iataCode: { startsWith: searchTerm, mode: 'insensitive' } },
                        { city: { startsWith: searchTerm, mode: 'insensitive' } },
                        { airportName: { contains: searchTerm, mode: 'insensitive' } },
                        ...(searchIatas.length > 0 ? [{ iataCode: { in: searchIatas } }] : [])
                    ],
                },
                take: 150,
            });

            if (candidates.length === 0) return [];

            // STEP 2 - Calculate Weighted Priority Score
            const scoredAirports = candidates.map(airport => {
                let score = 0;
                const iata = (airport.iataCode || '').toUpperCase();
                const city = (airport.city || '').toUpperCase();
                const name = (airport.airportName || '').toUpperCase();

                let isAliasMatch = false;
                for (const [alias, iatas] of Object.entries(this.ALIAS_MAP)) {
                    if (alias === qLower && iatas.includes(iata)) {
                        isAliasMatch = true;
                        break;
                    } else if (alias.startsWith(qLower) && iatas.includes(iata)) {
                        isAliasMatch = true;
                    }
                }

                // Tier 1: User Intent (Exact City or Alias Match)
                if (city === qUpper) score += 5000;
                if (isAliasMatch) score += 5000;

                // 3. Exact IATA Match
                if (iata === qUpper) score += 10000;

                // 4. Starts With City
                if (city.startsWith(qUpper) && city !== qUpper) score += 1200;
                
                // 5. Airport Name Contains
                if (name.includes(qUpper)) score += 800;

                // 6. Starts With IATA
                if (iata.startsWith(qUpper) && iata !== qUpper) score += 700;

                // Tier 2: Country / Regional Boost
                const priorityCountries = ['IN', 'BT', 'BD', 'NP'];
                if (airport.isoCountry === 'IN') {
                    score += 5000;
                } else if (airport.isoCountry && priorityCountries.includes(airport.isoCountry)) {
                    score += 2000;
                }

                // Tier 3: Popular Destination Boost
                const topTier = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'GOI', 'GOX'];
                const secondTier = ['DXB', 'SIN', 'BKK'];
                
                if (topTier.includes(iata)) score += 2000;
                else if (secondTier.includes(iata)) score += 1500;

                // 8. Major Airport Boost
                if (airport.isMajor) score += 200;

                // 9. DB Priority Score Boost
                score += (airport.priorityScore || 0);

                return { ...airport, score };
            });

            // STEP 3 - Sort by Score (Descending)
            scoredAirports.sort((a, b) => b.score - a.score);

            // STEP 4 - Slice to requested limit
            const topAirports = scoredAirports.slice(0, limit);

            const mappedAirports = topAirports.map(a => ({
                ...a,
                airport_name: a.airportName,
                iata_code: a.iataCode,
                iso_country: a.isoCountry,
                iso_region: a.isoRegion
            }));

            if (mappedAirports.length > 0) {
                const mainAirport = mappedAirports[0];
                let nearbyAirports: any[] = [];
                let otherAirports = mappedAirports.slice(1);

                try {
                    const nearbyRes = await this.getNearbyAirports(mainAirport.iata_code as string);
                    if (nearbyRes && nearbyRes.nearbyAirports) {
                        nearbyAirports = nearbyRes.nearbyAirports;
                        const nearbyIatas = nearbyAirports.map((n: any) => n.iata_code);
                        otherAirports = otherAirports.filter(a => !nearbyIatas.includes(a.iata_code));
                    }
                } catch (e) {
                    // Ignore errors fetching nearby airports
                }

                return {
                    mainAirport,
                    otherAirports,
                    nearbyAirports,
                    cityGroupAirports: []
                };
            }

            return [];
        } catch (error) {
            return [];
        }
    }

    async getNearbyAirports(iataCode: string) {
        if (!iataCode) return null;
        
        const selectedAirport = await this.prisma.airport.findUnique({
            where: { iataCode: iataCode.toUpperCase() }
        });

        if (!selectedAirport || !selectedAirport.latitude || !selectedAirport.longitude) {
            throw new NotFoundException('Airport not found or missing coordinates');
        }

        // Only fetch airports with valid coordinates
        const airports = await this.prisma.airport.findMany({
            where: {
                latitude: { not: null },
                longitude: { not: null },
                iataCode: { not: null },
                isSearchable: true,
                airportType: { notIn: ['MILITARY', 'PRIVATE'] }
            }
        });

        const METRO_AIRPORTS = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'GOI', 'GOX', 'DXB', 'BKK', 'SIN', 'LHR', 'JFK', 'CDG', 'NRT'];
        let radius = 100000;
        if (selectedAirport.isMajor || METRO_AIRPORTS.includes(selectedAirport.iataCode as string)) {
            radius = 200000;
        } else if ((selectedAirport as any).airportType === 'REMOTE') {
            radius = 150000;
        }

        const CITY_GROUPS: Record<string, string[]> = {
            "BKK": ["BKK", "DMK"],
            "DMK": ["BKK", "DMK"],
            "GOI": ["GOI", "GOX"],
            "GOX": ["GOI", "GOX"],
            "DEL": ["DEL", "HDO", "DXN"],
            "HDO": ["DEL", "HDO", "DXN"],
            "DXN": ["DEL", "HDO", "DXN"],
            "LHR": ["LHR", "LGW", "STN", "LTN", "LCY"],
            "LGW": ["LHR", "LGW", "STN", "LTN", "LCY"],
            "STN": ["LHR", "LGW", "STN", "LTN", "LCY"],
            "LTN": ["LHR", "LGW", "STN", "LTN", "LCY"],
            "LCY": ["LHR", "LGW", "STN", "LTN", "LCY"],
            "JFK": ["JFK", "EWR", "LGA"],
            "EWR": ["JFK", "EWR", "LGA"],
            "LGA": ["JFK", "EWR", "LGA"],
            "CDG": ["CDG", "ORY"],
            "ORY": ["CDG", "ORY"],
            "NRT": ["NRT", "HND"],
            "HND": ["NRT", "HND"],
            "BOM": ["BOM", "PNQ"],
            "PNQ": ["BOM", "PNQ"]
        };
        const group = CITY_GROUPS[selectedAirport.iataCode as string] || [];

        const nearby = airports
            .filter((airport) => {
                if (airport.iataCode === selectedAirport.iataCode) {
                    return false;
                }
                
                // If it's explicitly in the city group, definitely include it
                if (group.includes(airport.iataCode as string)) return true;

                const distance = getDistance(
                    { latitude: selectedAirport.latitude!, longitude: selectedAirport.longitude! },
                    { latitude: airport.latitude!, longitude: airport.longitude! }
                );
                return distance <= radius;
            })
            .map((airport) => {
                const distance = getDistance(
                    { latitude: selectedAirport.latitude!, longitude: selectedAirport.longitude! },
                    { latitude: airport.latitude!, longitude: airport.longitude! }
                );
                return {
                    ...airport,
                    airport_name: airport.airportName,
                    iata_code: airport.iataCode,
                    iso_country: airport.isoCountry,
                    iso_region: airport.isoRegion,
                    distanceKm: Math.round(distance / 1000)
                };
            })
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5); // Maximum 5 nearby airports

        return {
            mainAirport: {
                ...selectedAirport,
                airport_name: selectedAirport.airportName,
                iata_code: selectedAirport.iataCode,
                iso_country: selectedAirport.isoCountry,
                iso_region: selectedAirport.isoRegion,
            },
            nearbyAirports: nearby
        };
    }

    async getAirportsByCodes(codes: string[]) {
        const prismaClient = this.prisma as any;
        const airportDelegate = prismaClient.airport || prismaClient.Airport;

        if (!airportDelegate) return [];

        return airportDelegate.findMany({
            where: {
                iataCode: { in: codes }
            }
        });
    }

    private async standardizeAndEnrichResponse(raw: any, supplierName: string) {
        const data = raw.data || [];
        const amadeusDicts = raw.dictionaries || {};

        const airlineCodes = new Set<string>();
        const airportCodes = new Set<string>();

        data.forEach((offer: any) => {
            offer.itineraries.forEach((itinerary: any) => {
                itinerary.segments.forEach((segment: any) => {
                    airlineCodes.add(segment.carrierCode);
                    airportCodes.add(segment.departure.iataCode);
                    airportCodes.add(segment.arrival.iataCode);
                });
            });
        });

        const prismaClient = this.prisma as any;
        const airlinesDelegate = prismaClient.airlines || prismaClient.Airlines;
        const airportDelegate = prismaClient.airport || prismaClient.Airport;

        let dbAirlines = [];
        let dbAirports = [];

        try {
            [dbAirlines, dbAirports] = await Promise.all([
                airlinesDelegate?.findMany({
                    where: { iata: { in: Array.from(airlineCodes) } },
                }) || Promise.resolve([]),
                airportDelegate?.findMany({
                    where: { iataCode: { in: Array.from(airportCodes) } },
                }) || Promise.resolve([]),
            ]);
        } catch (error) {}

        const airlineMap = new Map<string, any>(dbAirlines.map((a: any) => [a.iata, a]));
        const airportMap = new Map<string, any>(dbAirports.map((a: any) => [a.iataCode, a]));

        const enrichedResults = await Promise.all(
            data.map(async (offer: any) => {
                const itinerary = offer.itineraries[0];
                const firstSegment = itinerary.segments[0];
                const lastSegment = itinerary.segments[itinerary.segments.length - 1];

                const airlineData = airlineMap.get(firstSegment.carrierCode);
                const originData = airportMap.get(firstSegment.departure.iataCode);
                const destinationData = airportMap.get(lastSegment.arrival.iataCode);

                const seriesPrice = await this.seriesFareService.applySeriesFare(offer);
                const supplierPrice = seriesPrice || parseFloat(offer.price.total);
                const finalFare = await this.markupService.applyMarkup({
                    ...offer,
                    price: { ...offer.price, total: supplierPrice }
                });

                return {
                    supplier: supplierName.toUpperCase(),
                    offerId: offer.id,
                    airline: {
                        iata: firstSegment.carrierCode,
                        name: airlineData?.name || amadeusDicts.carriers?.[firstSegment.carrierCode] || firstSegment.carrierCode,
                        logo: airlineData?.logo_svg_url || airlineData?.logo_png_url || null,
                    },
                    origin: {
                        iata: firstSegment.departure.iataCode,
                        name: originData?.airportName || firstSegment.departure.iataCode,
                        city: originData?.city || firstSegment.departure.iataCode,
                        country: originData?.isoCountry || null,
                    },
                    destination: {
                        iata: lastSegment.arrival.iataCode,
                        name: destinationData?.airportName || lastSegment.arrival.iataCode,
                        city: destinationData?.city || lastSegment.arrival.iataCode,
                        country: destinationData?.isoCountry || null,
                    },
                    departureTime: firstSegment.departure.at,
                    arrivalTime: lastSegment.arrival.at,
                    duration: itinerary.duration,
                    stops: itinerary.segments.length - 1,
                    cabinClass: offer.travelerPricings[0].fareDetailsBySegment[0].cabin,
                    fare: {
                        baseFare: parseFloat(offer.price.base),
                        totalFare: finalFare,
                        supplierPrice: supplierPrice,
                        currency: offer.price.currency,
                        refundable: !offer.pricingOptions.noRestrictionFare,
                    },
                    rawData: offer,
                };
            })
        );

        return {
            flights: enrichedResults,
            airports: Object.fromEntries(airportMap)
        };
    }

    private async updateFareCache(dto: any, flights: any[]) {
        if (!flights || flights.length === 0) return;

        const cheapest = flights.reduce((min, f) => 
            (f.fare?.totalFare < min.fare?.totalFare) ? f : min, 
            flights[0]
        );

        if (!cheapest?.fare?.totalFare) return;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        await this.prisma.flightFareCache.upsert({
            where: {
                origin_destination_departureDate_cabin: {
                    origin: dto.origin,
                    destination: dto.destination,
                    departureDate: new Date(dto.departureDate),
                    cabin: (dto.travelClass || 'ECONOMY').toUpperCase()
                }
            },
            update: {
                lowestFare: cheapest.fare.totalFare,
                airline: cheapest.airline?.code || cheapest.meta?.airlineCode,
                supplier: cheapest.supplier,
                expiresAt: expiresAt
            },
            create: {
                origin: dto.origin,
                destination: dto.destination,
                departureDate: new Date(dto.departureDate),
                cabin: (dto.travelClass || 'ECONOMY').toUpperCase(),
                lowestFare: cheapest.fare.totalFare,
                airline: cheapest.airline?.code || cheapest.meta?.airlineCode,
                supplier: cheapest.supplier,
                expiresAt: expiresAt
            }
        });
    }

    async getCalendar(origin: string, destination: string, date: string): Promise<FareResult[]> {
        try {
            const centerDate = new Date(date);
            const startDate = new Date(centerDate);
            startDate.setDate(startDate.getDate() - 15);
            const endDate = new Date(centerDate);
            endDate.setDate(endDate.getDate() + 14);

            // 1. Fetch All Relevant Cache Entries in One Query
            const cachedFares = await this.prisma.flightFareCache.findMany({
                where: {
                    origin,
                    destination,
                    departureDate: {
                        gte: startDate,
                        lte: endDate
                    },
                    expiresAt: { gte: new Date() }
                }
            });

            // 2. Fetch All Active Series Fares for this Route
            const seriesFares = await this.prisma.seriesFare.findMany({
                where: {
                    origin,
                    destination,
                    isActive: true,
                    validFrom: { lte: endDate },
                    validTo: { gte: startDate },
                },
                orderBy: { fixedPrice: 'asc' }
            });

            const finalResults: FareResult[] = [];
            const isProd = process.env.NODE_ENV === 'production';

            // 3. Construct the 30-day window
            for (let i = -15; i <= 14; i++) {
                const currentDate = new Date(centerDate);
                currentDate.setDate(currentDate.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];
                const currentDayStart = new Date(dateStr + 'T00:00:00.000Z');
                const currentDayEnd = new Date(dateStr + 'T23:59:59.999Z');

                // A. Check Cache first
                const cacheMatch = cachedFares.find(c => 
                    c.departureDate >= currentDayStart && c.departureDate <= currentDayEnd
                );

                if (cacheMatch) {
                    finalResults.push({
                        date: dateStr,
                        price: cacheMatch.lowestFare,
                        isCached: true
                    });
                    continue;
                }

                // B. Check Series Fares second
                const seriesMatch = seriesFares.find(f => 
                    f.validFrom <= currentDate && f.validTo >= currentDate
                );

                if (seriesMatch) {
                    finalResults.push({
                        date: dateStr,
                        price: seriesMatch.fixedPrice
                    });
                } else if (!isProd) {
                    // C. Dummy Fallback for UI visibility in non-prod
                    // Use a deterministic "random" based on date to avoid flickering
                    const seed = currentDate.getTime();
                    const pseudoRandom = (Math.sin(seed) + 1) / 2; // 0 to 1
                    finalResults.push({
                        date: dateStr,
                        price: 3000 + Math.floor(pseudoRandom * 2000)
                    });
                }
            }

            return finalResults;
        } catch (error) {
            this.logger.error(`Fare calendar failed: ${error.message}`);
            return [];
        }
    }
}
