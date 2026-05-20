# Phase 7: Admin Panel (Revenue Brain)

Centralized administrative and revenue control layer.

## Modules
- **RBAC**: Multi-role system (SUPER_ADMIN, TICKETING, ACCOUNTS, SUPPORT).
- **Markup Engine**: Dynamic pricing logic with priority-based rules.
- **Series Fares**: Fixed routing price overrides.
- **Supplier Config**: Secure management of GDS credentials.

## Logic Flow
Revenue recalculation: Supplier Price -> Series Fare Override (if any) -> Markup Rule (Priority 1..4).
