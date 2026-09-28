# ADR-0002: Smart OCR Package Scanner, Time-Series Forecasting, Dark Theme, and INR Currency

## Status
Accepted

## Context
Following the initial baseline implementation of PharmaAssist, operational enhancements were required to elevate the counter experience, inventory resilience, and clinical reliability:
1. **Packaging Identification**: Operators often receive medication packaging where manual searching is slow. A smart OCR package scanner is needed that extracts batch, expiry, manufacturing date, strength, dosage form, and barcode, while preserving the invariant that OCR is advisory and requires DrugMaster candidate matching and operator confirmation (`CON-04`, `CON-05`).
2. **Demand Forecasting**: The basic moving-average needed upgrading to true time-series forecasting (Holt-Winters / ETS) that models trend and seasonality over 7-day and 14-day horizons, reports backtest MAPE accuracy, supports cold-start fallbacks (BR-05 -> BR-01), and segments by visit type (`OTC` vs `Prescription`) and indication category.
3. **Structured Clinical Categorization**: Demand and transactions must be categorized into standard indications (`Respiratory & Flu`, `Analgesic & Pain Management`, `Gastrointestinal & Antacid`, `Cardiovascular & Metabolic`, `Antibiotics & Anti-infectives`, `General Health`).
4. **Predictive Cross-Selling**: Association rules must compute conditional probabilities $P(B|A)$, support count, recency weights, indication affinity, and stock availability filtering, while providing transparent natural language explanations.
5. **Actionable Alerts & Deep Linking**: Low-stock and near-expiry warnings must link directly to the target tab (`procurement` or `inventory`) to allow one-click action.
6. **Supply Chain Integrity**: Procurement must deduplicate stock already on order (`sent`, `confirmed`, `drafted`) to prevent over-ordering, and supplier performance must track real delivery and quality events rather than synthetic random values.
7. **Visual Design & Currency**: Dark navy theme (`#0a0f1d`) with cyan/teal accents, high contrast readability, and standard Indian Rupee (`₹`) formatting across all screens.

## Decision
1. **Smart OCR Package Service**: Implemented `SmartScanService` with deterministic regex parsers and weighted scoring against `DrugMaster` and `StockBatch`. Requires operator confirmation before counter selection and flags near-expiry batches.
2. **Time-Series Forecast Engine**: Implemented `TimeSeriesForecastService` with Holt-Winters / ETS algorithms, zero-padded continuous daily timelines, backtest MAPE scoring, and cold-start fallback to reorder thresholds when active history is under 30 days.
3. **Indication Hierarchy**: Added `IndicationCategory` across `DrugMaster`, `TransactionItem`, `UnmetDemand`, and Supabase schema migration `20260928010000_pharmaassist_smart_scan_forecasting.sql`.
4. **Predictive Cross-Sell Engine**: Upgraded `CrossSellService` with conditional probability metrics, explanation strings, and stock validation.
5. **Actionable Deep-Linked Alerts**: Implemented `InventoryAlertService` linking alerts to `procurement` and `inventory` tabs.
6. **On-Order Deduplication & Real Quality Tracking**: Integrated active PO tracking in `ProcurementService` and real event logging in `SupplierQualityService`.
7. **Dark UI & INR**: Restyled all UI components (`Navbar`, `CounterPOS`, `InsightsScreen`, `InventoryScreen`, `ProcurementScreen`, modals) to the dark navy `#0a0f1d` / cyan palette with `₹` currency.
8. **Authoritative Supabase Path**: Added `dispatch_transaction_v2` RPC with online Supabase execution and offline `SyncQueue` reconciliation.

## Consequences
- Single operator workflow remains strictly respected (`CON-05`).
- No payment processing introduced (`CON-06`).
- Deterministic clinical safety and human-in-the-loop invariants are completely upheld (`CON-04`, `NFR-SAFE-01`).
- All 14 unit and integration test suites pass (38 tests) with clean production builds.
