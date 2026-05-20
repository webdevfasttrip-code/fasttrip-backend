# Phase 5: Production Payment (Razorpay Webhooks)

Enterprise-grade payment security and automation.

## Security
- **Signature Verification**: Crytographic validation of every webhook event.
- **Raw Body Preservation**: Custom NestJS buffer handling for HMAC accuracy.
- **Idempotency**: Safeguards against duplicate payment events.

## Confirmation Flow
Confirmed only via `payment.captured` event -> Zero-trust frontend model.
