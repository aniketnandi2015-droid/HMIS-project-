# PharmaAssist — Coding Agent Context

## 0. Document Role
This file is the repository-level implementation context for coding agents working on PharmaAssist.
It aligns the approved intent of the PharmaAssist SRS (v2.2) and SDD (v0.2) into operational rules for coding, debugging, testing, code review, CI/CD, GitHub, and deployment.

---

## 1. Product Identity & Core Invariants
- **Product:** PharmaAssist
- **Purpose:** A mobile-first, web-based pharmacy counter application for a single counter salesperson/operator.
- **Invariants:**
  1. `CON-04`: Clinical safety rules are deterministic and driven solely by authoritative reference data.
  2. `CON-05`: Single-operator scope. Never introduce multi-user role hierarchies, user management panels, or multi-tenant complexity.
  3. `CON-06`: STRICTLY NO PAYMENT PROCESSING. Only record monetary transaction values in Indian Rupees (`₹`).
  4. `FR-INV-01`: Authoritative stock ledger. Stock is mutated only via atomic dispatch, PO receipt, or reason-coded adjustments.
  5. `FR-POS-06`: Atomic dispatch commits stock decrements and transaction logs together.
  6. `NFR-DEG-01`: 2-4 hours offline continuity using local cache and synchronization queue.

---

## 2. Controlled Operational Extensions
- **Smart OCR Package Scanner:** Uses `SmartScanService` for packaging text extraction and candidate matching against `DrugMaster`. Requires operator confirmation.
- **Time-Series Forecasting:** Uses `TimeSeriesForecastService` with Holt-Winters / ETS, zero-padded continuous timelines, backtest MAPE scoring, and cold-start fallback (BR-05 -> BR-01).
- **Predictive Cross-Selling:** Uses `CrossSellService` with conditional probability $P(B|A)$, support count, and stock availability verification.
- **Procurement & Inventory Alerts:** Deduplicates on-order stock and provides deep links from alerts to actionable tabs.
- **Visual Design:** Dark navy theme (`#0a0f1d`) and INR currency (`₹`).

---

## 3. Engineering & Deployment Guidelines
- **Language & Runtime:** TypeScript (strict mode), Node.js LTS, React / Vite.
- **Styling:** Tailwind CSS with dark theme tokens (`bg-[#0a0f1d]`, `bg-[#0f172a]`, `text-cyan-400`, `border-slate-800`).
- **Database:** Supabase PostgreSQL with schema migrations in `supabase/migrations/` and RPC procedures.
- **Testing:** Vitest with pure domain tests in `tests/unit/` and integration tests in `tests/integration/`. Run `npm test` before committing.
- **Git Push Policy:** GitHub enforces private email protection (`GH007`), so commits must use `aniketnandi2015-droid@users.noreply.github.com`.
