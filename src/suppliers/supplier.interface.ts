export interface AddOnItem {
    code: string;
    name: string;
    price: number;
    currency: string;
    description?: string;
}

export interface FareOption {
    type: string; // e.g., STANDARD, FLEX, LIGHT
    refundable: boolean;
    includedBaggage: string;
    price: number;
    currency: string;
}

export interface NormalizedFareResponse {
    fareOptions: FareOption[];
    addOns: {
        baggage: AddOnItem[];
        meals: AddOnItem[];
        seats: AddOnItem[];
    };
    totalPrice: number;
    currency: string;
    rawPricingResponse: any;
}

export interface SupplierAdapter {
    revalidateOffer(rawOffer: any): Promise<NormalizedFareResponse>;
}
