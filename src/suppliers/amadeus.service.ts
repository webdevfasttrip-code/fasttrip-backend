import { Injectable, Logger, HttpException } from '@nestjs/common';
import { SupplierAdapter, NormalizedFareResponse, FareOption, AddOnItem } from './supplier.interface';

@Injectable()
export class AmadeusService implements SupplierAdapter {
    private readonly logger = new Logger(AmadeusService.name);
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    private readonly clientId = process.env.AMADEUS_CLIENT_ID;
    private readonly clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    private readonly baseUrl = process.env.AMADEUS_BASE_URL;

    private async safeFetch(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
        const timeout = 15000; // 15 seconds
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (retries > 0 && (error.name === 'AbortError' || error.name === 'ConnectTimeoutError' || error.code === 'UND_ERR_CONNECT_TIMEOUT')) {
                this.logger.warn(`Fetch failed for ${url}. Retrying... (${retries} left). Error: ${error.message}`);
                // Wait 1 second before retrying
                await new Promise((resolve) => setTimeout(resolve, 1000));
                return this.safeFetch(url, options, retries - 1);
            }
            throw error;
        }
    }

    private async getAccessToken(): Promise<string> {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiry) {
            return this.accessToken;
        }

        this.logger.log('Fetching new Amadeus access token...');
        const response = await this.safeFetch(`${this.baseUrl}/v1/security/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.clientId || '',
                client_secret: this.clientSecret || '',
            }).toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error('Failed to fetch Amadeus token', data);
            throw new HttpException('Amadeus Authentication Failed', 500);
        }

        this.accessToken = data.access_token as string;
        // Buffer of 10 seconds before actual expiry
        this.tokenExpiry = now + (data.expires_in - 10) * 1000;

        return this.accessToken as string;
    }

    async searchFlightOffers(params: {
        originLocationCode: string;
        destinationLocationCode: string;
        departureDate: string;
        returnDate?: string;
        adults: number;
        children?: number;
        infants?: number;
        travelClass?: string;
    }) {
        const token = await this.getAccessToken();

        const queryParams = new URLSearchParams({
            originLocationCode: params.originLocationCode,
            destinationLocationCode: params.destinationLocationCode,
            departureDate: params.departureDate,
            adults: params.adults.toString(),
            currencyCode: 'INR',
            max: '20',
        });

        if (params.children && params.children > 0) {
            queryParams.append('children', params.children.toString());
        }
        if (params.infants && params.infants > 0) {
            queryParams.append('infants', params.infants.toString());
        }
        if (params.returnDate) {
            queryParams.append('returnDate', params.returnDate);
        }
        if (params.travelClass) {
            queryParams.append('travelClass', params.travelClass);
        }

        const url = `${this.baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}`;
        this.logger.debug(`Calling Amadeus: ${url}`);

        const response = await this.safeFetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error('Amadeus flight search failed', data);
            throw new HttpException(data.errors?.[0]?.detail || 'Flight Search Failed', response.status);
        }

        return data;
    }

    async revalidateOffer(rawOffer: any): Promise<NormalizedFareResponse> {
        const token = await this.getAccessToken();

        const response = await this.safeFetch(`${this.baseUrl}/v1/shopping/flight-offers/pricing`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    type: 'flight-offers-pricing',
                    flightOffers: [rawOffer],
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error('Amadeus pricing failed', data);
            throw new HttpException(data.errors?.[0]?.detail || 'Pricing Revalidation Failed', response.status);
        }

        return this.normalizePricingResponse(data);
    }

    async createFlightOrder(rawOffer: any, passengers: any[]) {
        const token = await this.getAccessToken();

        // 1. Map passengers to Amadeus format
        const travelers = passengers.map((p, index) => {
            const isChild = this.calculateAge(p.dateOfBirth) < 12;
            return {
                id: (index + 1).toString(),
                dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
                name: {
                    firstName: p.firstName.toUpperCase(),
                    lastName: p.lastName.toUpperCase(),
                },
                gender: p.gender?.toUpperCase().startsWith('M') ? 'MALE' : 'FEMALE',
                contact: {
                    emailAddress: "booking@fasttrip.com",
                    phones: [{ deviceType: "MOBILE", countryCallingCode: "91", number: "9876543210" }]
                }
                // Ignoring document/passport for domestic simplification
            };
        });

        // 2. Call Amadeus Create Order API
        const response = await this.safeFetch(`${this.baseUrl}/v1/booking/flight-orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    type: 'flight-order',
                    flightOffers: [rawOffer],
                    travelers: travelers
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error('Amadeus flight order failed', data);
            throw new HttpException(data.errors?.[0]?.detail || 'Flight Booking Failed', response.status);
        }

        return data; // Amadeus returns the Order Object containing the associated PNR
    }

    private calculateAge(dob: Date): number {
        const diffMs = Date.now() - dob.getTime();
        const ageDt = new Date(diffMs);
        return Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    private normalizePricingResponse(raw: any): NormalizedFareResponse {
        const offer = raw.data.flightOffers[0];
        const travelerPricing = offer.travelerPricings[0];

        // 1. Extract Fare Options
        const fareOptions: FareOption[] = [
            {
                type: travelerPricing.fareOption || 'STANDARD',
                refundable: !offer.pricingOptions?.noRestrictionFare,
                includedBaggage: this.extractIncludedBaggage(travelerPricing),
                price: parseFloat(offer.price.total),
                currency: offer.price.currency,
            },
        ];

        // 2. Extract Add-ons (Baggage, Meals, Seats)
        const addOns = {
            baggage: this.extractAdditionalBaggage(raw),
            meals: this.extractAvailableMeals(raw),
            seats: [] as AddOnItem[],
        };

        return {
            fareOptions,
            addOns,
            totalPrice: parseFloat(offer.price.total),
            currency: offer.price.currency,
            rawPricingResponse: raw,
        };
    }

    private extractIncludedBaggage(travelerPricing: any): string {
        const baggage = travelerPricing.fareDetailsBySegment?.[0]?.includedCheckedBags;
        if (baggage?.weight) return `${baggage.weight}${baggage.weightUnit}`;
        if (baggage?.quantity) return `${baggage.quantity} Pieces`;
        return '0kg';
    }

    private extractAdditionalBaggage(raw: any): AddOnItem[] {
        return [];
    }

    private extractAvailableMeals(raw: any): AddOnItem[] {
        return [];
    }
}
