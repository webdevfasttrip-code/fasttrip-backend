export class FlightProviderManager {
    private providers: any[] = [];
    private getAirlinesMap: () => any;
    private formatDuration: (iso?: string | null) => string | null;

    constructor(
        getAirlinesMap: () => any,
        formatDuration: (iso?: string | null) => string | null
    ) {
        this.getAirlinesMap = getAirlinesMap;
        this.formatDuration = formatDuration;
    }

    setProviders(providers: any[]) {
        this.providers = providers;
    }

    async searchOffers(dto: any, activeSuppliers: string[] = []) {
        let allOffers: any[] = [];
        let providersResults: any[] = [];

        for (const provider of this.providers) {
            const providerName = provider.getName();
            
            // Check if this supplier is active in database
            const isActive = activeSuppliers.includes(providerName) || 
                            (providerName === 'FTSpecial' && activeSuppliers.includes('MVFD'));

            if (activeSuppliers.length > 0 && !isActive) {
                continue;
            }

            try {
                const results = await provider.search(dto);
                providersResults.push({
                    name: providerName,
                    count: results.length,
                    status: 'success'
                });
                allOffers = [...allOffers, ...results];
            } catch (err) {
                providersResults.push({
                    name: providerName,
                    status: 'failed',
                    error: err.message
                });
            }
        }

        // Processing results into Parallel Arrays (Universal Schema)
        const { onwardFlights, returnFlights } = this.decoupleAndEnrich(allOffers);

        return {
            providers: providersResults,
            onwardFlights,
            returnFlights,
            raw: allOffers
        };
    }

    async priceOffer(data: any) {
        const providerName = data.supplier || 'AMADEUS';
        const provider = this.providers.find(p => p.getName() === providerName);

        if (!provider || typeof provider.priceOffer !== 'function') {
            throw new Error(`Provider ${providerName} does not support price validation`);
        }

        return await provider.priceOffer(data);
    }

    async initiateBooking(bookingData: any) {
        const providerName = bookingData.supplier || 'AMADEUS';
        const provider = this.providers.find(p => p.getName() === providerName);

        if (!provider || typeof provider.initiateBooking !== 'function') {
            throw new Error(`Provider ${providerName} does not support automated booking initiation`);
        }

        return provider.initiateBooking(bookingData);
    }

    async getBookingDetails(data: any) {
        const providerName = data.supplier || 'AMADEUS';
        const provider = this.providers.find(p => p.getName() === providerName);

        if (!provider || typeof provider.getBookingDetails !== 'function') {
            throw new Error(`Provider ${providerName} does not support fetching booking details`);
        }

        return provider.getBookingDetails(data);
    }

    async getWalletBalance(supplierName: string = 'makevoyage') {
        const name = (supplierName === 'makevoyage' || supplierName === 'MVFD') ? 'FTSpecial' : supplierName;
        const provider = this.providers.find(p => p.getName() === name);

        if (!provider || typeof provider.getWalletBalance !== 'function') {
            throw new Error(`Provider ${name} does not support wallet balance`);
        }

        return provider.getWalletBalance();
    }

    private decoupleAndEnrich(offers: any[]) {
        const airlinesMap = this.getAirlinesMap();
        const onwardFlights: any[] = [];
        const returnFlights: any[] = [];

        const onwardSeen = new Set();
        const returnSeen = new Set();

        offers.forEach(offer => {
            // Transform to Universal Schema
            const mapToSchema = (meta: any, type: 'onward' | 'return') => {
                const airlineMeta = airlinesMap[meta.airlineCode];
                const id = `${offer.id}_${type}`;
                
                return {
                    id,
                    groupId: offer.id,
                    supplier: offer.supplier || 'AMADEUS',
                    airline: {
                        code: meta.airlineCode,
                        name: airlineMeta?.name || meta.airlineName,
                        logo: airlineMeta?.logo_png_url || meta.airlineLogoPng
                    },
                    departure: {
                        time: meta.departure,
                        iata: meta.origin,
                        city: meta.origin 
                    },
                    arrival: {
                        time: meta.arrival,
                        iata: meta.destination,
                        city: meta.destination
                    },
                    duration: this.formatDuration(meta.duration) || meta.duration,
                    stops: meta.stops,
                    price: parseFloat(offer.cheapestFare ?? offer.price?.total ?? 0),
                    type,
                    // Restore legacy meta for backward compatibility (Filters, Baggage, etc.)
                    meta: {
                        ...meta,
                        duration: this.formatDuration(meta.duration) || meta.duration,
                        airlineName: airlineMeta?.name || meta.airlineName,
                        airlineLogoPng: airlineMeta?.logo_png_url || meta.airlineLogoPng
                    },
                    fareOptions: offer.fareOptions,
                    passengerBreakdown: offer.passengerBreakdown,
                    adultPrice: offer.adultPrice,
                    rawData: offer
                };
            };

            // Onward Leg
            const onward = mapToSchema(offer.meta, 'onward');
            const onwardKey = `${onward.airline.code}-${onward.departure.time}-${onward.duration}`;
            if (!onwardSeen.has(onwardKey)) {
                onwardFlights.push(onward);
                onwardSeen.add(onwardKey);
            }

            // Return Leg (if exists)
            if (offer.returnMeta) {
                const ret = mapToSchema(offer.returnMeta, 'return');
                const returnKey = `${ret.airline.code}-${ret.departure.time}-${ret.duration}`;
                if (!returnSeen.has(returnKey)) {
                    returnFlights.push(ret);
                    returnSeen.add(returnKey);
                }
            }
        });

        const sortByPrice = (a: any, b: any) => a.price - b.price;

        return {
            onwardFlights: onwardFlights.sort(sortByPrice),
            returnFlights: returnFlights.sort(sortByPrice)
        };
    }
}
