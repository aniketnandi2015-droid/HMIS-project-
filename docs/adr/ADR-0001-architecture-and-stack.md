# ADR-0001: Architecture, Technology Stack, and Invariant Baseline

## Status
Accepted

## Context
PharmaAssist replaces a manual pharmacy counter workflow for a single operator.
The development brief fixes:
- Frontend: Node.js LTS, TypeScript, React / Next.js architecture with Tailwind CSS, PWA service worker and IndexedDB offline cache.
- Backend: Supabase PostgreSQL database with Row Level Security (RLS) and stored procedures (RPC) for atomic stock and dispatch transactions.
- Deployment: GitHub source control, Vercel production hosting.
- Invariants: Single-operator scope (no multi-role RBAC), mobile-first (360px+ portrait), authoritative single stock ledger, deterministic clinical reference safety checks, advisory recommendations (human in loop), strictly no payment processing.

## Decision
1. Implement modular domain services under `src/lib/domain/` with pure testable TypeScript business logic.
2. Implement Supabase client adapter with fallback to offline IndexedDB / local mock storage when credentials are not configured or network is disconnected.
3. Keep atomic mutations (`dispatch_transaction`, `receive_purchase_order`, `apply_stock_adjustment`) encapsulated in SQL RPC functions.
4. Support English and Hindi (`en`, `hi`) localization.
5. Create comprehensive unit, integration, and UI test suites using Vitest.

## Consequences
- Clean separation between pure domain rules, database persistence, and presentation.
- Complete offline capability meeting NFR-DEG-01 (2-4 hours offline continuity).
- Single source of truth for stock quantities with zero client-side direct quantity mutations.
