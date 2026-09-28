# ADR-0003: Mobile-First POS Cart, Stock Discrepancy Reconciliation, and Motion Design System

## Status
Accepted

## Context
Following the initial desktop and core operational releases of PharmaAssist, counter operators required a streamlined, thumb-reachable mobile experience:
1. **Commercial-Style Multi-Drug Cart**: Previously, detecting a drug started single-item dispatch immediately. Retail pharmacy customers frequently purchase multiple medications, requiring a commercial basket (`Detect -> Verify -> Product card -> Add to Cart -> Continue shopping`), consolidated checkout, and basket-wide atomic dispatch without altering authoritative stock prior to checkout (`CON-05`, `FR-POS-06`).
2. **Controlled Stock Discrepancy Reconciliation**: A dedicated workflow was needed for physical-count audits. Discrepancies between system quantity and physical count must be calculated (`Delta = Physical - System`), classified by materiality (minor <=5%, material <=10%, significant >10%), validated with mandatory reason codes and explanatory notes, and reconciled via the authoritative reason-coded stock adjustment path (`FR-INV-01`, `FR-INV-04`).
3. **Motion Design System**: The mobile app required a cohesive, fluid motion language (smooth number interpolation via `AnimatedNumber`, spring transitions, active touch feedback, restrained alert glows) aligned with the product-demo palette (`#083f4b`, `#0b1728`, `#102236`, `#23455b`, `#19a9ff`, `#21c77a`, `#f2b51d`, `#d9364f`), while strictly respecting `prefers-reduced-motion: reduce`.

## Decision
1. **Typed Cart State & Service (`CartService`)**:
   - Implemented `CartItem` session state covering line quantities, pricing, FEFO batch selection, prescription verification, and safety conflicts.
   - Built `CartDrawer` bottom sheet enabling line quantity management, subtotal/discount/grand total calculation, blocking safety issue aggregation, and consolidated atomic dispatch.
2. **Physical-Count Reconciliation (`DiscrepancyService` & `StockDiscrepancyModal`)**:
   - Implemented `DiscrepancyService` calculating discrepancy delta and materiality percentages.
   - Enforced mandatory reason codes and mandatory notes for significant discrepancies (>10%) or reason `other`.
   - Reconciles stock via existing authoritative `apply_stock_adjustment` mutations, with audit logging in `StockDiscrepancyRecord`.
3. **Motion System & Design Tokens**:
   - Centralized semantic CSS variables in `index.css`.
   - Created `AnimatedNumber` component interpolating numbers over 300–400ms with cubic-out easing and fallback for reduced-motion users.
   - Fixed safe-area bottom navigation with active indicators and real-time cart badge.

## Consequences
- Single-operator and zero-payment boundaries (`CON-05`, `CON-06`) remain strictly intact.
- Authoritative stock ledger is preserved: `Add to Cart` does not mutate stock; final dispatch executes atomically.
- All 16 unit and integration test suites pass (50 tests) with clean production builds.
