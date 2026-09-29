# Software Requirements Specification
## PharmaAssist — AI-Augmented Point-of-Sale, Inventory and Analytics System for Retail Pharmacy

Reference standards: IEEE 830-1998, ISO/IEC/IEEE 29148:2018  
Document version: 2.3 (Single-Operator Scope; Mobile-First Web Platform; POS Cart, Discrepancy Reconciliation & Motion System)

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

### 2. Controlled Operational Extensions (v2.2 & v2.3)

#### 2.1 Commercial-Style Mobile POS Cart (FR-CRT-01..05)
- **FR-CRT-01 (Detect & Stage):** When a medicine is identified via search, barcode, or smart OCR scan, it presents a product card for operator confirmation and quantity selection rather than immediately triggering single-item dispatch.
- **FR-CRT-02 (Multi-Item Session State):** Allows multiple medications for the same customer to be staged in a typed `CartItem` basket without mutating authoritative stock quantities.
- **FR-CRT-03 (Mobile Cart Drawer):** Mobile counter provides a persistent bottom summary bar (`Cart X items • ₹Total`) and bottom sheet drawer with line quantity adjustment (`-` / `+`), discount view, and line deletion.
- **FR-CRT-04 (Consolidated Checkout Gate):** All basket items pass through consolidated clinical safety and prescription verification before dispatch. Hard contraindications or unverified Rx medications block basket dispatch.
- **FR-CRT-05 (Consolidated Atomic Dispatch):** Basket dispatch executes atomically across all line items, decrementing authoritative batch stock and recording transactions together (`FR-POS-06`).

#### 2.2 Stock Discrepancy Physical-Count Reconciliation (FR-DISC-01..05)
- **FR-DISC-01 (Count Comparison):** Captures physical counted stock against authoritative system quantity:
  $$\text{Discrepancy Delta} = \text{Physical Count} - \text{System Quantity}$$
- **FR-DISC-02 (Materiality Classification):** Computes discrepancy percentage:
  $$\text{Discrepancy \%} = \frac{|\text{Physical} - \text{System}|}{\max(\text{System}, 1)} \times 100$$
  Categorizes materiality into `none` (0%), `minor` (<=5%), `material` (<=10%), and `significant` (>10%).
- **FR-DISC-03 (Mandatory Reason & Notes):** All discrepancies require a standard reason code (`physical_count_correction`, `damage_breakage`, `expired_stock`, `missing_unaccounted`, `receiving_discrepancy`, `data_entry_correction`, `other`). Significant discrepancies (>10%) and reason `other` require a mandatory explanatory audit note.
- **FR-DISC-04 (Authoritative Ledger Mutation):** Discrepancies are reconciled strictly through the authoritative reason-coded stock adjustment path (`apply_stock_adjustment` / delta), updating downstream stock, threshold alerts, and procurement recommendations without rewriting sales history.
- **FR-DISC-05 (Audit Logging & Insights Visibility):** Discrepancy audit records are saved to the local store and flagged under Insights ("What needs attention today").

#### 2.3 Smart OCR Package Scanner (FR-SCAN-01..04)
- **FR-SCAN-01 (Packaging Text Parsing):** System parses unstructured packaging text using deterministic regex heuristics to extract brand, generic, strength, dosage form, batch number, lot number, manufacturing date, expiry date, and barcode.
- **FR-SCAN-02 (Candidate Matching & Scoring):** Extracted packaging fields are matched against `DrugMaster` and `StockBatch` with a multi-factor confidence score.
- **FR-SCAN-03 (Operator Gate):** OCR is strictly advisory (`CON-04`, `CON-05`). The operator must confirm candidate mapping.
- **FR-SCAN-04 (Expiry Pre-Alert):** Scanned batches within the 90-day expiry threshold or expired trigger an immediate warning alert.

#### 2.4 True Time-Series Forecasting (FR-FCS-01..05)
- **FR-FCS-01 (Holt-Winters / ETS Engine):** Generates 7-day and 14-day forecasts modeling trend and seasonality with zero-padded daily timelines.
- **FR-FCS-02 (Rolling Backtest Accuracy):** Calculates rolling Mean Absolute Percentage Error (MAPE) against historical test windows (`NFR-REL-01`).
- **FR-FCS-03 (Cold-Start Fallback):** When active transaction history is under 30 days (`BR-05`), falls back deterministically to configured reorder thresholds (`BR-01`).
- **FR-FCS-04 (Segmented Breakdown):** Forecasts segment by visit type (`OTC` vs `Prescription`) and indication category.

#### 2.5 Clinical Indication Categorization (FR-IND-01..03)
- Classifies medications and unmet demand into standard categories: `Respiratory & Flu`, `Analgesic & Pain Management`, `Gastrointestinal & Antacid`, `Cardiovascular & Metabolic`, `Antibiotics & Anti-infectives`, and `General Health`.

#### 2.6 Predictive Cross-Selling (FR-CRS-01..03)
- Ranks suggestions using conditional probability $P(B|A)$, support count, and stock availability verification with natural-language clinical rationales.

#### 2.7 UI Theme, Motion & Currency (FR-UI-01..03, NFR-MOT-01..03)
- **FR-UI-01 (Demo Palette):** Semantic CSS tokens (`--pa-bg: #083f4b`, `--pa-surface: #0b1728`, `--pa-border: #23455b`, `--pa-primary: #19a9ff`, `--pa-success: #21c77a`, `--pa-warning: #f2b51d`, `--pa-danger: #d9364f`).
- **FR-UI-02 (Currency Standard):** Standardized Indian Rupee (`₹`) monetary representation across all views and receipts.
- **NFR-MOT-01 (Fluid Motion System):** Smooth cubic-out number interpolation via `AnimatedNumber` (300–400ms), active touch feedback, and restrained state pulses.
- **NFR-MOT-02 (Reduced-Motion Compliance):** Strictly respects `@media (prefers-reduced-motion: reduce)`, immediately snapping values to final targets without visual distortion.

#### 2.8 Pharmaceutical Tax Invoice Generator & Live Counter Stock Availability (FR-INV-07, FR-POS-10)
- **FR-POS-10 (Automated Post-Dispatch Invoice Generator):** Upon successful completion of either single-item quick dispatch or consolidated basket checkout, system automatically generates and displays a compliant pharmaceutical Tax Invoice modal (`InvoiceGeneratorModal`).
  - Itemized table with Product Name, Generic composition, HSN code (`3004`), Batch No, Expiry Date, Quantity, MRP, and Extended Value.
  - Indian GST breakdown (Taxable Base, CGST @ 6%, SGST @ 6%, Total GST @ 12% included in MRP).
  - Indian Rupee monetary representation and verbal amount transcription (`numberToWordsINR`).
  - Drug License No (`DL-20B/21B-WB/2026/88921`), GSTIN, FSSAI, and Dispensary contact identity.
  - Dual layout toggle: Standard detailed Retail Tax Invoice (A4/half-page printable) and ESC/POS thermal slip (80mm).
- **FR-INV-07 (Live Counter Stock Availability):**
  - Displays real-time stock availability, total units across batches, selected batch balance, and post-dispense stock forecast immediately when browsing, searching, or configuring a drug in Counter/POS tab.
  - Highlights status badges (`● In Stock`, `● Low Stock`, `● Out of Stock`) and warns if requested quantity exceeds available batch stock.
  - Provides quick dispensary catalog grid for instant selection and stock visibility when search input is empty.

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
