# Software Requirements Specification
## PharmaAssist — AI-Augmented Point-of-Sale, Inventory and Analytics System for Retail Pharmacy

Reference standards: IEEE 830-1998, ISO/IEC/IEEE 29148:2018  
Document version: 2.2 (Single-Operator Scope; Mobile-First Web Platform; Advanced Analytics & Smart OCR)

---

### 1. Requirements Map (Baseline)
- **FR-PLT-01 to FR-PLT-06:** Mobile-first, web delivery, responsive (360px+), touch-optimized (>=44x44px), PWA offline shell, camera barcode/QR scanning with keyboard-wedge/manual fallback, cross-browser compatibility.
- **FR-POS-01 to FR-POS-09:** Structured drug search, contraindication check before dispatch, exact-match stock check, ranked substitute recommendation, price & discount display, atomic dispatch & stock decrement, unmet demand logging on stock-out, discount recording & leakage flagging, drug usage/side-effects reference panel.
- **FR-INV-01 to FR-INV-06:** Single authoritative stock ledger, batch/lot tracking with manufacturing & expiry dates, barcode/QR assisted stock-in, stock adjustments with reason codes, near-expiry alert (default 90 days), low-stock reorder thresholds.
- **FR-PROC-01 to FR-PROC-05:** Ranked procurement recommendation list, supplier records & lead-time history, purchase orders & receipt logging, supplier quality scoring (on-time %, quantity discrepancy, quality flags), low-stock notifications.
- **FR-TXN-01 to FR-TXN-03:** Transaction-history logging (items, qty, price, discount, timestamp, batch/lot), optional printed receipt (ESC/POS compatible), revenue-leakage flagging (discounts exceeding ceiling or quantity corrections).
- **FR-ANL-01 to FR-ANL-06:** Sales trend (revenue & units over 7/30/90 days), demand forecasting by drug and visit type (OTC walk-in vs prescription) with cold-start fallback to reorder threshold, cross-sell suggestions (up to 3 items based on co-occurrence), fast/moderate/slow moving stock classification, supplier performance view, single consolidated Insights screen (no tabs, scannable under 60 seconds).
- **FR-SEC-01:** Single device/app-level operator login, 5-attempt lockout for 15+ minutes.
- **FR-I18N-01:** English plus Hindi localization selectable without rebuild.

---

### 2. Controlled Operational Extensions (v2.2)

#### 2.1 Smart OCR Package Scanner (FR-SCAN-01..04)
- **FR-SCAN-01 (Packaging Text Parsing):** System parses unstructured packaging text and image OCR output using deterministic regex heuristics to extract brand, generic, strength, dosage form, batch number, lot number, manufacturing date, expiry date, and barcode (EAN/UPC/GTIN).
- **FR-SCAN-02 (Candidate Matching & Scoring):** Extracted packaging fields are matched against the authoritative `DrugMaster` catalog and active `StockBatch` ledger with a weighted confidence score (0–100%).
- **FR-SCAN-03 (Human Operator Gate):** OCR is strictly advisory (`CON-04`, `CON-05`). The operator must review and confirm the candidate mapping prior to dispatch.
- **FR-SCAN-04 (Expiry Pre-Alert):** If a scanned batch is within the 90-day expiry threshold or expired, an immediate warning alert is surfaced during the scan.

#### 2.2 True Time-Series Forecasting (FR-FCS-01..05)
- **FR-FCS-01 (Holt-Winters / ETS Engine):** Generates 7-day and 14-day demand forecasts incorporating trend and seasonality, maintaining zero-padded daily sales arrays.
- **FR-FCS-02 (Rolling Backtest Accuracy):** Calculates rolling Mean Absolute Percentage Error (MAPE) against historical test windows (`NFR-REL-01`).
- **FR-FCS-03 (Cold-Start Fallback):** When active transaction history is under 30 days (`BR-05`), falls back deterministically to configured reorder thresholds (`BR-01`).
- **FR-FCS-04 (Segmented Breakdown):** Forecasts segment by visit type (`OTC` vs `Prescription`) and indication category.
- **FR-FCS-05 (Explainability):** Provides natural-language forecast rationale and confidence intervals.

#### 2.3 Clinical Indication Categorization (FR-IND-01..03)
- **FR-IND-01 (Standard Taxonomy):** Classifies medications and unmet demand into standard categories: `Respiratory & Flu`, `Analgesic & Pain Management`, `Gastrointestinal & Antacid`, `Cardiovascular & Metabolic`, `Antibiotics & Anti-infectives`, and `General Health`.
- **FR-IND-02 (Demand Tracking):** Unmet customer demand logs include indication categories to guide disease-aware inventory replenishment.

#### 2.4 Predictive Cross-Selling (FR-CRS-01..03)
- **FR-CRS-01 (Conditional Probability):** Ranks cross-sell suggestions using conditional probability $P(B|A)$, co-occurrence support count, and recency weighting.
- **FR-CRS-02 (Availability Gate):** Suppresses recommendations for out-of-stock items.
- **FR-CRS-03 (Clinical Explanation):** Every recommendation displays an evidence-based explanation (e.g., oral rehydration paired with antibiotics).

#### 2.5 Actionable Deep-Linked Alerts (FR-ALT-01..03)
- **FR-ALT-01 (Drug-Specific Notifications):** Low-stock and near-expiry alerts are generated per drug and batch.
- **FR-ALT-02 (Deep Linking):** Low-stock alerts link directly to the procurement tab (`Create PO`), while near-expiry alerts link to the inventory tab (`Apply Reason-Coded Adjustment`).

#### 2.6 Supply Chain Integrity (FR-PRQ-01..04)
- **FR-PRQ-01 (On-Order Deduplication):** Deducts quantities in pending purchase orders (`sent`, `confirmed`, `drafted`) from recommended reorders to prevent over-ordering.
- **FR-PRQ-02 (Real Quality Tracking):** Tracks real supplier quality events (damaged, expired on arrival, quantity discrepancies) without synthetic random numbers.

#### 2.7 UI Theme & Currency (FR-UI-01..02)
- **FR-UI-01 (Dark Navy Theme):** Unified dark navy (`#0a0f1d`) and cyan/teal interface engineered for low-glare retail environments.
- **FR-UI-02 (Currency Standard):** Standardized Indian Rupee (`₹`) monetary representation across all views, receipts, and reports.

---

### 3. Non-Functional Targets & Invariants
- **NFR-PERF-01:** Search, stock check, and OCR parsing <= 3s (95th percentile).
- **NFR-PERF-02:** Atomic dispatch execution <= 2s (99th percentile).
- **NFR-DEG-01:** Offline continuity for at least 2 hours (target 4 hours).
- **NFR-ACC-01:** >= 98% stock ledger agreement with physical counts.
- **NFR-SAFE-01:** 100% of dispatches attempt contraindication check; >= 95% test conflicts flagged.
- **NFR-USE-03:** 360px portrait touch screen, no horizontal scroll, >= 44x44px targets.
- **CON-04:** Deterministic safety rules. Reference data authority only.
- **CON-05:** Single operator scope. Zero multi-role RBAC complexity.
- **CON-06:** STRICTLY NO PAYMENT PROCESSING. Only transaction values recorded.
