# Software Design Document (SDD)
## PharmaAssist - AI-Augmented Point-of-Sale, Inventory and Analytics System for Retail Pharmacy

Document version: 0.1
SRS baseline: PharmaAssist SRS v2.1

### Architecture
- Presentation Layer: PWA Web Client (Mobile-first >=360px portrait, Tablet, Desktop), Counter Screen, Insights Screen, Stock & Procurement, Walkthrough.
- Application Service Layer: Search & Matching, Stock & Batch, Safety Check, Pricing, Dispatch & Transaction, Procurement, Analytics & Forecasting, Offline Synchronization, Notifications.
- Data Layer: PostgreSQL (Supabase) relational database with RLS & Stored Procedures (RPC) for atomic operations; IndexedDB local cache for offline operation.
- Domain Invariants:
  1. Single Authoritative Stock Ledger: Only dispatch, purchase receipt, and explicit adjustment may mutate stock.
  2. Atomic Dispatch: Stock decrement, transaction record, transaction items, and leakage flags committed as one atomic database transaction.
  3. Safety Separation: Deterministic reference contraindication checks separate from advisory recommendations.
  4. No Payment Processing: Transaction values recorded only.
  5. Single-operator scope: No multi-user / manager roles.
