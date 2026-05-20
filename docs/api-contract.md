# API Contract Documentation (Internal)

## Base URL
- **Development**: `http://localhost:3000/v1`
- **Swagger UI**: `http://localhost:3000/internal-docs`

## Authentication
All protected routes (Admin) require a Bearer JWT token.
- **Header**: `Authorization: Bearer <your_jwt_token>`

## Error Codes
- `400 Bad Request`: Validation failure or business logic error (e.g. price mismatch).
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Insufficient role permissions.
- `404 Not Found`: Entity (Booking, User, etc) does not exist.

## Domain Groupings
- `Search`: Discovery and revalidation.
- `Booking`: Lifecycle and draft management.
- `Payment`: Webhook-driven confirmation.
- `Admin`: User stats, revenue rules, and booking dashboard.
