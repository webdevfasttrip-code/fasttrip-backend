# Architecture Overview - Flight Core V2

Flight Core V2 is an enterprise-grade travel booking backend built with NestJS, Prisma, and a multi-supplier architecture.

## System Design
The system follows a modular monolith approach, prepared for future microservice decomposition.

### Core Modules
1. **Search Module**: Handles flight discovery across multiple suppliers. standardized responses with enriched metadata (logos, airport names).
2. **Booking Module**: Manages the full lifecycle of a flight booking from draft to confirmation/cancellation.
3. **Payment Module**: Secured Webhook-based integration with Razorpay.
4. **Admin Module**: RBAC-protected control center for users, bookings, and revenue.
5. **Suppliers**: Isolated adapter layer for external APIs (Amadeus, etc).

## Key Patterns
- **Supplier Abstraction**: All supplier-specific logic is isolated. The core services interact with a unified internal flight structure.
- **Revenue Engine**: A multi-layered pricing system (Series Fares -> Supplier Base -> Markup) ensures business profitability.
- **Booking Drafts**: A two-step conversion process (Draft -> Payment -> Confirm) with mandatory server-side revalidation to prevent price manipulation.
- **RBAC**: Fine-grained access control using JWT and custom NestJS guards.

## Technology Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (via Prisma ORM)
- **Payments**: Razorpay
- **Supplier APIs**: Amadeus (GDS)
- **Caching**: Memory-based OAuth2 token caching
