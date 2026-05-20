# Phase 1: Core Booking Engine

Implementation of basic booking management and lifecycle.

## Features
- **Booking Creation**: Alphanumeric `bookingRef` generation.
- **Lifecycle Management**: PENDING, CONFIRMED, CANCELLED states.
- **PNR Management**: Lookup by `bookingRef`.
- **User Auto-Creation**: Seamless account generation on first booking.

## Data Model
- `Booking`: Central record with financial and status tracking.
- `Passenger`: Individual traveler records linked to booking.
- `User`: Identity provider for booking history.
