# PharmaAssist — Coding Agent Context

## 0. Document Role
This file is the repository-level implementation context for coding agents working on PharmaAssist.
It aligns the approved intent of the PharmaAssist SRS (v2.3) and SDD (v0.3) into operational rules for coding, debugging, testing, code review, CI/CD, GitHub, and deployment.

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
- **Commercial-Style POS Cart:** Staging items in `CartItem` state (`Detect -> Product card -> Add to Cart -> Continue shopping`). Consolidated checkout with blocking safety verification before atomic dispatch. Adding items never mutates stock.
- **Controlled Stock Discrepancy Reconciliation:** Physical-count verification calculates delta and materiality percentage (minor <=5%, material <=10%, significant >10%). Mandatory reason codes, mandatory notes for significant discrepancies or reason `other`. Mutates stock strictly via reason-coded adjustment path (`apply_stock_adjustment`).
- **Smart OCR Package Scanner:** Uses `SmartScanService` for packaging text extraction and candidate matching against `DrugMaster`. Requires operator confirmation.
- **Time-Series Demand Forecasting:** Uses `TimeSeriesForecastService` with Holt-Winters / ETS, zero-padded continuous timelines, backtest MAPE scoring, and cold-start fallback (BR-05 -> BR-01).
- **Predictive Cross-Selling:** Uses `CrossSellService` with conditional probability $P(B|A)$, support count, and stock availability verification.
- **Visual Design & Motion:** Dark teal/navy theme (`#083f4b`, `#0b1728`, `#23455b`), smooth number interpolation (`AnimatedNumber`), and `prefers-reduced-motion` compliance.

---

## 3. Engineering & Deployment Guidelines
- **Language & Runtime:** TypeScript (strict mode), Node.js LTS, React / Vite.
- **Styling:** Tailwind CSS with semantic design tokens.
- **Database:** Supabase PostgreSQL with schema migrations and RPC procedures.
- **Testing:** Vitest with pure domain tests in `tests/unit/` and integration tests in `tests/integration/`. Run `npm test` before committing.
- **Git Push Policy:** GitHub enforces private email protection (`GH007`), so commits must use `aniketnandi2015-droid@users.noreply.github.com`.
