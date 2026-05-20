# Phase 2: Flight Search & Enrichment

Discovery layer integrated with external GDS (Amadeus).

## Integration
- **Amadeus API**: OAuth2-protected flight-offers engine.
- **Reference Data**: Enriched results with airline logos and airport names from the Neon dataset.

## Logic
- **Search Pipe**: Request mapping -> Supplier Call -> Response standardization -> Enrichment -> Final Payload.
- **Airport Autocomplete**: Fuzzy search across cities and IATA codes.
