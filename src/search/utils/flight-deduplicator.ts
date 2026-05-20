export class FlightDeduplicator {
  /**
   * Deduplicates flights from multiple suppliers.
   * Matches by: Airline, Flight Number, Departure Time, Route.
   */
  static deduplicate(flights: any[]) {
    const flightMap = new Map();

    flights.forEach(flight => {
      // Normalize unique key: airline + flightNumber + depTime + depCode + arrCode
      const it = flight.itineraries?.[0];
      if (!it) return;

      const seg = it.segments?.[0];
      if (!seg) return;

      const key = `${seg.carrierCode}-${seg.number}-${seg.departure.at}-${seg.departure.iataCode}-${it.segments[it.segments.length - 1].arrival.iataCode}`.toUpperCase();

      if (flightMap.has(key)) {
        const existing = flightMap.get(key);
        // Compare prices, keep cheapest
        if (flight.price.total < existing.price.total) {
          // Store existing as fallback metadata
          flight.fallbacks = [...(existing.fallbacks || []), { 
            supplier: existing.supplier, 
            price: existing.price.total, 
            offerId: existing.id 
          }];
          flightMap.set(key, flight);
        } else {
          // Add this one to fallback of existing
          existing.fallbacks = [...(existing.fallbacks || []), { 
            supplier: flight.supplier, 
            price: flight.price.total, 
            offerId: flight.id 
          }];
        }
      } else {
        flight.fallbacks = [];
        flightMap.set(key, flight);
      }
    });

    return Array.from(flightMap.values());
  }
}
