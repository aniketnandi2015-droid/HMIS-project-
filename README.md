# PharmaAssist 💊
> AI-Augmented Point-of-Sale, Authoritative Inventory, Clinical Safety, and Operational Analytics System for Retail Pharmacy

[![CI/CD Status](https://github.com/aniketnandi2015-droid/HMIS-project-/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/aniketnandi2015-droid/HMIS-project-/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Standards: SRS v2.1](https://img.shields.io/badge/Standards-SRS%20v2.1-emerald.svg)](docs/SRS.md)
[![Architecture: SDD v0.1](https://img.shields.io/badge/Architecture-SDD%20v0.1-purple.svg)](docs/SDD.md)

---

## 1. Product Identity & Core Invariants

PharmaAssist digitizes the manual, paper- and memory-based pharmacy counter workflow into a streamlined, mobile-first web application engineered specifically for a **single counter operator**.

### Non-Negotiable Invariants (SRS v2.1 & SDD v0.1)
1. **Single-Operator Scope:** Strictly no role-hierarchy or multi-user complexity (CON-05). Terminal secured by device-level authentication with automatic 5-attempt lockout (FR-SEC-01, NFR-SEC-02).
2. **Authoritative Stock Ledger:** Stock quantities are written **exclusively** through atomic dispatch, purchase order receipt, or reason-coded adjustments (FR-INV-01). UI components never mutate stock quantities directly.
3. **Atomic Dispatch (`dispatch_transaction`):** Stock decrement, transaction record creation, item logging, and revenue-leakage flags execute as a single atomic transaction (FR-POS-06).
4. **Clinical Safety Separation:** Contraindications and adverse interactions are verified deterministically against an authoritative reference dataset (CON-04, NFR-SAFE-01). Generative models **never** author clinical rules.
5. **Human in the Loop:** Reorder suggestions, substitute rankings, and cross-sell items are strictly **advisory recommendations**; the operator retains full decision authority.
6. **No Payment Processing:** The system records monetary transaction value only (CON-06). It contains **no payment gateway, UPI/card processing, or settlement integration**.
7. **Mobile-First & PWA:** Designed for 360px portrait smartphone displays with >= 44x44px touch targets and full offline continuity (FR-PLT-01..06, CON-02, NFR-DEG-01).

---

## 2. ATLAS Traceability Matrix

| SRS Requirement | SDD Component / Domain | Implementation Module | Supabase / Data Layer | Verification Test |
|---|---|---|---|---|
| **FR-PLT-01..06** (Mobile-first, PWA, Offline, Touch) | Presentation Domain (§7.1) | `Navbar.tsx`, `public/manifest.json`, `public/sw.js` | `sync_queue_item` | Responsive inspection, PWA cache |
| **FR-POS-01..03** (Search, Safety, Stock) | POS Domain (§5.2) | `CounterPOS.tsx`, `searchMatchingService.ts` | `drug_master`, `stock_batch` | `reorderThresholdService.test.ts` |
| **FR-POS-02** (Contraindication Gate) | Safety Domain (§3.5, §9.1) | `safetyCheckService.ts`, `ContraindicationAlertModal.tsx` | `contraindication_reference` | `safetyCheckService.test.ts` |
| **FR-POS-04** (Ranked Substitutes) | POS Domain (§5.2) | `substituteRankingService.ts` | `drug_master`, `stock_batch` | `substituteRankingService.test.ts` |
| **FR-POS-05, FR-POS-08, BR-02** (Pricing & Leakage) | Pricing Domain (§5.2) | `pricingDiscountService.ts` | `transaction` (`discount_flag`) | `pricingDiscountService.test.ts` |
| **FR-POS-06, FR-INV-01** (Atomic Dispatch) | Transaction Domain (§5.5) | `storageAdapter.ts`, `dispatchService.ts` | `dispatch_transaction()` RPC | `atomicDispatch.test.ts` |
| **FR-INV-04** (Stock Adjustments) | Inventory Domain (§5.3) | `InventoryScreen.tsx` | `apply_stock_adjustment()` RPC | UI & Storage integration test |
| **FR-INV-05, BR-03** (Near-Expiry Alert) | Inventory Domain (§5.3) | `nearExpiryService.ts` | `stock_batch` (`expiry_date`) | `nearExpiryService.test.ts` |
| **FR-PROC-01..05** (Procurement & Quality) | Procurement Domain (§5.4) | `procurementService.ts`, `supplierQualityService.ts` | `purchase_order`, `receive_purchase_order()` RPC | `supplierQualityService.test.ts` |
| **FR-ANL-01..06** (Single-Screen Insights) | Analytics Domain (§5.6) | `InsightsScreen.tsx`, `movementClassificationService.ts` | Operational DB read models | Visual review (0 tabs, <60s scan) |
| **FR-ANL-02, BR-05** (Demand Forecast) | Analytics Domain (§5.6) | `demandForecastService.ts` | `demand_forecast` | `demandForecastService.test.ts` |
| **FR-ANL-03** (Cross-Sell) | Analytics Domain (§5.6) | `crossSellService.ts` | `cross_sell_suggestion` | `crossSellService.test.ts` |
| **FR-SEC-01, NFR-SEC-02** (Auth & Lockout) | Access Domain (§5.7) | `authService.ts`, `LoginModal.tsx` | Client session & Auth | `authService.test.ts` |
| **FR-I18N-01** (English + Hindi) | Localization Domain (§7.1) | `translations.ts` | Configuration | I18n switch verification |

---

## 3. Technology Stack

- **Frontend:** Node.js 22 LTS, TypeScript (strict mode), React 19, Tailwind CSS v4, Lucide Icons, Vite.
- **Backend:** Supabase PostgreSQL, Row Level Security (RLS), PL/pgSQL Atomic Stored Procedures (`dispatch_transaction`, `receive_purchase_order`, `apply_stock_adjustment`).
- **Offline Continuity:** Service Worker offline shell (`public/sw.js`), Web App Manifest (`public/manifest.json`), IndexedDB / LocalStorage Adapter (`storageAdapter.ts`).
- **Testing:** Vitest 3.x (10 test suites, 25 tests covering unit calculations, clinical safety, and atomic invariants).
- **Deployment & Hosting:** GitHub Actions CI/CD pipeline, Vercel web hosting with automated preview and production deployment.

---

## 4. Local Development & Testing

### 1. Installation
```bash
git clone https://github.com/aniketnandi2015-droid/HMIS-project-.git
cd HMIS-project-
npm install
```

### 2. Run Test Suite
```bash
npm run test
```
*Executes all 25 unit and integration tests across domain services and database invariants.*

### 3. Run Production Build
```bash
npm run build
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Use default PIN `1234` to unlock the terminal.

---

## 5. Supabase Database Setup

To provision the authoritative PostgreSQL database:
1. Create a project in [Supabase](https://supabase.com).
2. Execute the schema migration in the Supabase SQL Editor:
   ```bash
   supabase/migrations/20260928000000_pharmaassist_schema.sql
   ```
3. (Optional) Seed realistic pharmaceutical and clinical reference data:
   ```bash
   supabase/seed/seed.sql
   ```
4. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your environment variables or `.env`.

---

## 6. Vercel Production Deployment

PharmaAssist is configured for zero-configuration deployment to Vercel via `vercel.json`:
1. Push this repository to GitHub `main` branch.
2. Import the repository in [Vercel](https://vercel.com).
3. Set Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase Anon key
4. Deploy! Production builds and preview URLs are provisioned automatically.
