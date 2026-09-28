# PharmaAssist 💊
> AI-Augmented Point-of-Sale, Authoritative Inventory, Clinical Safety, Smart OCR Package Scanner, and Time-Series Analytics System for Retail Pharmacy

[![CI/CD Status](https://github.com/aniketnandi2015-droid/HMIS-project-/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/aniketnandi2015-droid/HMIS-project-/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Standards: SRS v2.2](https://img.shields.io/badge/Standards-SRS%20v2.2-emerald.svg)](docs/SRS.md)
[![Architecture: SDD v0.2](https://img.shields.io/badge/Architecture-SDD%20v0.2-purple.svg)](docs/SDD.md)
[![Tests: 38 Passing](https://img.shields.io/badge/Tests-38%20Passing-brightgreen.svg)](tests/)

---

## 1. Product Identity & Core Invariants

PharmaAssist digitizes the manual, paper- and memory-based pharmacy counter workflow into a streamlined, mobile-first web application engineered specifically for a **single counter operator**.

### Non-Negotiable Invariants (SRS v2.2 & SDD v0.2)
1. **Single-Operator Scope:** Strictly no role-hierarchy or multi-user complexity (`CON-05`). Terminal secured by device-level authentication with automatic 5-attempt lockout (`FR-SEC-01`, `NFR-SEC-02`).
2. **Authoritative Stock Ledger:** Stock quantities are written **exclusively** through atomic dispatch, purchase order receipt, or reason-coded adjustments (`FR-INV-01`). UI components never mutate stock quantities directly.
3. **Atomic Dispatch (`dispatch_transaction_v2`):** Stock decrement, transaction record creation, item logging, and revenue-leakage flags execute as a single atomic database transaction (`FR-POS-06`).
4. **Clinical Safety Separation:** Contraindications and adverse interactions are verified deterministically against an authoritative reference dataset (`CON-04`, `NFR-SAFE-01`).
5. **Human in the Loop:** Smart OCR scan matching, reorder suggestions, substitute rankings, and cross-sell items are strictly **advisory recommendations**; the operator retains full decision authority.
6. **No Payment Processing:** The system records monetary transaction value only in Indian Rupees (`₹`) (`CON-06`). It contains **no payment gateway, UPI/card processing, or settlement integration**.
7. **Mobile-First & PWA:** Designed for 360px portrait smartphone displays with >= 44x44px touch targets and full offline continuity (`FR-PLT-01..06`, `CON-02`, `NFR-DEG-01`).

---

## 2. ATLAS Traceability Matrix (Full Verification Baseline)

| SRS Requirement | SDD Component / Domain | Implementation Module | Supabase / Data Layer | Verification Test |
|---|---|---|---|---|
| **FR-PLT-01..06** (Mobile-first, PWA, Offline, Touch) | Presentation Domain (§1) | `Navbar.tsx`, `public/manifest.json`, `public/sw.js` | `sync_queue_item` | Responsive inspection, PWA cache |
| **FR-POS-01..03** (Search, Safety, Stock) | POS Domain (§2) | `CounterPOS.tsx`, `searchMatchingService.ts` | `drug_master`, `stock_batch` | `reorderThresholdService.test.ts` |
| **FR-POS-02** (Contraindication Gate) | Safety Domain (§2) | `safetyCheckService.ts`, `ContraindicationAlertModal.tsx` | `contraindication_reference` | `safetyCheckService.test.ts` |
| **FR-POS-04** (Ranked Substitutes) | POS Domain (§2) | `substituteRankingService.ts` | `drug_master`, `stock_batch` | `substituteRankingService.test.ts` |
| **FR-POS-05, FR-POS-08, BR-02** (Pricing & Leakage) | Pricing Domain (§2) | `pricingDiscountService.ts` | `transaction` (`discount_flag`) | `pricingDiscountService.test.ts` |
| **FR-POS-06, FR-INV-01** (Atomic Dispatch) | Transaction Domain (§2, §3) | `storageAdapter.ts`, `dispatch_transaction_v2` | `dispatch_transaction_v2()` RPC | `atomicDispatch.test.ts` |
| **FR-INV-04** (Stock Adjustments) | Inventory Domain (§2) | `InventoryScreen.tsx` | `apply_stock_adjustment()` RPC | UI & Storage integration test |
| **FR-INV-05, BR-03** (Near-Expiry Alert) | Inventory Domain (§2) | `nearExpiryService.ts` | `stock_batch` (`expiry_date`) | `nearExpiryService.test.ts` |
| **FR-SCAN-01..04** (Smart OCR Package Scanner) | OCR Domain (§2.1) | `smartScanService.ts`, `BarcodeScannerModal.tsx` | `drug_master` identifiers | `smartScanService.test.ts` |
| **FR-FCS-01..05** (Holt-Winters Forecasting & MAPE) | Analytics Domain (§2.2) | `timeSeriesForecastService.ts` | `demand_forecast` table | `timeSeriesForecastService.test.ts` |
| **FR-CRS-01..03** (Predictive Cross-Selling $P(B\|A)$) | Analytics Domain (§2.3) | `crossSellService.ts` | `cross_sell_event` table | `crossSellService.test.ts` |
| **FR-ALT-01..03** (Actionable Deep-Linked Alerts) | Inventory Domain (§2.4) | `inventoryAlertService.ts`, `InsightsScreen.tsx` | Batch & Stock aggregates | `inventoryAlertService.test.ts` |
| **FR-PROC-01..05, FR-PRQ-01** (Procurement & PO Deduplication) | Procurement Domain (§2.4) | `procurementService.ts`, `ProcurementScreen.tsx` | `purchase_order` | `procurementService.test.ts` |
| **FR-PRQ-02** (Real Supplier Quality Events) | Procurement Domain (§2.4) | `supplierQualityService.ts` | `supplier_quality_event` table | `supplierQualityService.test.ts` |
| **FR-UI-01..02** (Dark Navy Theme & INR `₹`) | Presentation Domain (§1) | `index.css`, All Screens | Currency `₹` formatting | Visual inspection |
| **FR-SEC-01, NFR-SEC-02** (Auth & Lockout) | Access Domain (§1) | `authService.ts`, `LoginModal.tsx` | Client session & Auth | `authService.test.ts` |
| **FR-I18N-01** (English + Hindi) | Localization Domain (§1) | `translations.ts` | Configuration | I18n switch verification |

---

## 3. Technology Stack

- **Frontend:** Node.js 22 LTS, TypeScript (strict mode), React 19, Tailwind CSS v4, Lucide Icons, Vite.
- **Backend:** Supabase PostgreSQL, Row Level Security (RLS), PL/pgSQL Atomic Stored Procedures (`dispatch_transaction_v2`, `receive_purchase_order`, `apply_stock_adjustment`).
- **Offline Continuity:** Service Worker offline shell (`public/sw.js`), Web App Manifest (`public/manifest.json`), IndexedDB / LocalStorage Adapter (`storageAdapter.ts`).
- **Testing:** Vitest 3.x (14 test suites, 38 tests covering unit calculations, clinical safety, and atomic invariants).
- **Deployment & Hosting:** GitHub Actions CI/CD pipeline, Vercel web hosting with automated preview and production deployment.

---

## 4. Local Development & Testing

### 1. Installation
```bash
git clone https://github.com/aniketnandi2015-droid/HMIS-project-.git
cd HMIS-project-
npm install
```

### 2. Run Tests
```bash
npm test
```
*Executes all 14 test suites (38 tests) including Holt-Winters forecasting, smart OCR packaging extraction, atomic dispatch, and contraindication gates.*

### 3. Production Build
```bash
npm run build
```

### 4. Start Local Development Server
```bash
npm run dev
```

---

## 5. Deployment Guide

### Database (Supabase)
1. Log into your Supabase Dashboard and create a new project.
2. In the **SQL Editor**, execute the migration scripts in chronological order:
   - `supabase/migrations/20260928000000_pharmaassist_schema.sql` (baseline tables, RLS, functions)
   - `supabase/migrations/20260928010000_pharmaassist_smart_scan_forecasting.sql` (v2.2 extensions, indication categories, `dispatch_transaction_v2` RPC)
3. Retrieve your Project URL and Anon Public Key from **Project Settings > API**.

### Web App (Vercel)
1. Import the repository `aniketnandi2015-droid/HMIS-project-` into Vercel.
2. Under **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
3. Deploy! Vercel automatically runs `npm run build` and hosts the PWA at the generated production URL.
