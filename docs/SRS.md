# Software Requirements Specification
## PharmaAssist — AI-Augmented Point-of-Sale, Inventory and Analytics System for Retail Pharmacy

Reference standards: IEEE 830-1998, ISO/IEC/IEEE 29148:2018
Document version: 2.1 (simplified single-user scope; mobile-first web platform)

### 1. Requirements Map
- FR-PLT-01 to FR-PLT-06: Mobile-first, web delivery, responsive (360px+), touch-optimized (>=44x44px), PWA offline shell, camera barcode/QR scanning with keyboard-wedge/manual fallback, cross-browser compatibility.
- FR-POS-01 to FR-POS-09: Structured drug search, contraindication check before dispatch, exact-match stock check, ranked substitute recommendation, price & discount display, atomic dispatch & stock decrement, unmet demand logging on stock-out, discount recording & leakage flagging, drug usage/side-effects reference panel.
- FR-INV-01 to FR-INV-06: Single authoritative stock ledger, batch/lot tracking with manufacturing & expiry dates, barcode/QR assisted stock-in, stock adjustments with reason codes, near-expiry alert (default 90 days), low-stock reorder thresholds.
- FR-PROC-01 to FR-PROC-05: Ranked procurement recommendation list, supplier records & lead-time history, purchase orders & receipt logging, supplier quality scoring (on-time %, quantity discrepancy, quality flags), low-stock notifications.
- FR-TXN-01 to FR-TXN-03: Transaction-history logging (items, qty, price, discount, timestamp, batch/lot), optional printed receipt (ESC/POS compatible), revenue-leakage flagging (discounts exceeding ceiling or quantity corrections).
- FR-ANL-01 to FR-ANL-06: Sales trend (revenue & units over 7/30/90 days), demand forecasting by drug and visit type (OTC walk-in vs prescription) with cold-start fallback to reorder threshold, cross-sell suggestions (up to 3 items based on co-occurrence), fast/moderate/slow moving stock classification, supplier performance view, single consolidated Insights screen (no tabs, scannable under 60 seconds).
- FR-SEC-01: Single device/app-level operator login, 5-attempt lockout for 15+ minutes.
- FR-I18N-01: English plus at least one regional language selectable without rebuild.

### Non-Functional Targets:
- NFR-PERF-01: Search & stock check <= 3s (95th percentile).
- NFR-PERF-02: Dispatch transaction <= 2s (99th percentile).
- NFR-DEG-01: Offline continuity for at least 2 hours (target 4 hours).
- NFR-ACC-01: >= 98% stock ledger agreement with physical counts.
- NFR-SAFE-01: 100% of dispatches attempt contraindication check; >= 95% test conflicts flagged.
- NFR-USE-03: 360px touch screen, no horizontal scroll, >= 44x44px targets.
- CON-06: NO PAYMENT PROCESSING. Only transaction value recorded.
