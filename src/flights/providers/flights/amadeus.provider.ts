import { AmadeusClient } from '../../amadeus.client';

export class AmadeusProvider {
    private client: AmadeusClient;

    constructor() {
        // In a real NestJS setup, we'd inject this, but following the user's snippet structure
        this.client = new AmadeusClient();
    }

    getName() {
        return 'AMADEUS';
    }

    async search(dto: any) {
        const raw = await this.client.searchFlightOffers(dto);
        return (raw.data || []).map((offer: any) => this.transform(offer));
    }

    async priceOffer(data: any) {
        const result = await this.client.priceOfferWithAncillaries(data.offer?.rawData || data.offer || data.meta?.rawData, data.ancillaries || []);
        const pricedOffer = result.data.flightOffers[0];

        // Group traveler pricings by type to calculate breakdown
        const breakdown = pricedOffer.travelerPricings.reduce((acc, tp) => {
            const type = tp.travelerType;
            if (!acc[type]) acc[type] = { count: 0, totalBase: 0, totalTax: 0 };
            acc[type].count++;
            acc[type].totalBase += parseFloat(tp.price.base);
            acc[type].totalTax += parseFloat(tp.price.total) - parseFloat(tp.price.base);
            return acc;
        }, {});

        return {
            flightId: data.flightId || data.offer?.id,
            fare: {
                base: parseFloat(pricedOffer.price.base),
                tax: parseFloat(pricedOffer.price.total) - parseFloat(pricedOffer.price.base),
                total: parseFloat(pricedOffer.price.total),
                passengerBreakdown: breakdown, // Normalized key
                discount: 0,
                currency: "INR"
            },
            segments: data.offer?.meta?.segments || [],
            baggage: pricedOffer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags,
            fareRules: ["Standard Amadeus Rules"],
            supplier: 'AMADEUS',
            rawData: result
        };
    }

    async initiateBooking(data: any) {
        // Placeholder for Amadeus booking logic
        this.client.book(data); // Call client method
        return {
            bookingRef: "TBD_AMADEUS_" + Math.random().toString(36).substring(7),
            status: 'pending',
            supplier: 'AMADEUS'
        };
    }

    private transform(offer: any) {
        const onwardItinerary = offer.itineraries[0];
        const returnItinerary = offer.itineraries[1]; // Present if round-trip

        const onwardSegments = onwardItinerary.segments;
        const lastOnwardSegment = onwardSegments[onwardSegments.length - 1];

        const result: any = {
            id: offer.id,
            cheapestFare: parseFloat(offer.price.total),
            adultPrice: offer.travelerPricings?.find(tp => tp.travelerType === 'ADULT')?.price?.total ? parseFloat(offer.travelerPricings.find(tp => tp.travelerType === 'ADULT').price.total) : parseFloat(offer.price.total) / (offer.travelerPricings?.length || 1),
            meta: {
                airlineCode: onwardSegments[0].carrierCode,
                origin: onwardSegments[0].departure.iataCode,
                destination: lastOnwardSegment.arrival.iataCode,
                departure: onwardSegments[0].departure.at,
                arrival: lastOnwardSegment.arrival.at,
                duration: onwardItinerary.duration,
                stops: onwardSegments.length - 1,
                segments: this.mapSegments(onwardSegments),
            },
            passengerBreakdown: offer.travelerPricings?.reduce((acc: any, tp: any) => {
                const type = tp.travelerType;
                if (!acc[type]) acc[type] = { count: 0, totalBase: 0, totalTax: 0 };
                acc[type].count++;
                acc[type].totalBase += parseFloat(tp.price.base);
                acc[type].totalTax += parseFloat(tp.price.total) - parseFloat(tp.price.base);
                return acc;
            }, {}),
            fareOptions: offer.travelerPricings?.[0]?.fareDetailsBySegment?.map((f: any) => ({
                segmentId: f.segmentId,
                cabin: f.cabin,
                fareBasis: f.fareBasis,
                brandedFare: f.brandedFare,
                class: f.class,
                price: parseFloat(offer.price.total), // Default to offer total if individual fare price is missing
                raw: offer, // Needed for FareCard pricing logic
                baggage: {
                    checkin: f.includedCheckedBags,
                    cabin: { weight: 7 } // Default for now
                }
            })),
            rawData: offer,
        };

        if (returnItinerary) {
            const returnSegments = returnItinerary.segments;
            const lastReturnSegment = returnSegments[returnSegments.length - 1];
            result.returnMeta = {
                origin: returnSegments[0].departure.iataCode,
                destination: lastReturnSegment.arrival.iataCode,
                departure: returnSegments[0].departure.at,
                arrival: lastReturnSegment.arrival.at,
                duration: returnItinerary.duration,
                stops: returnSegments.length - 1,
                segments: this.mapSegments(returnSegments),
            };
        }

        return result;
    }

    private mapSegments(segments: any[]) {
        return segments.map((s: any) => ({
            airline: s.carrierCode,
            flightNumber: s.number,
            from: s.departure.iataCode,
            to: s.arrival.iataCode,
            dep: s.departure.at,
            arr: s.arrival.at,
            duration: s.duration,
            terminalFrom: s.departure.terminal || null,
            terminalTo: s.arrival.terminal || null,
        }));
    }
}
