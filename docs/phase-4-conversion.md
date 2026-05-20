# Phase 4: Conversion Engine (Draft Layer)

Upgrade from simple creation to a secured 2-step booking flow.

## Implementation
- **Draft Status**: Temporary lock of flight price and inventory.
- **Mandatory Revalidation**: Every draft triggers a backend-only price check.
- **Price Protection**: Front-end total is verified against server-calculated final amount.
- **Expiry**: 15-minute TTL on drafts before automatic expiration.
