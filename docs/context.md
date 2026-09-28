# PharmaAssist - Coding Agent Context

## 0. Document role

This file is the repository-level implementation context for coding agents working on PharmaAssist.
It converts the approved intent of the PharmaAssist SRS and SDD into an operational context for coding, debugging, testing, code review, CI/CD, GitHub, and Vercel deployment.

This file is not a replacement for the SRS or SDD.
- The **SRS** defines what the system shall do and the measurable quality requirements.
- The **SDD** defines how the system is logically designed, including BPMN, DFD, sequence flow, domains, data design, synchronization, UI/UX, and interface behavior.
- This file defines how a coding agent shall implement that design using the selected technology stack.

---

## 1. Product identity

**Product:** PharmaAssist
**Purpose:** A mobile-first, web-based pharmacy counter application for one salesperson/operator. It replaces a manual, paper- and memory-based workflow with a connected workflow for drug search, stock and batch verification, substitute identification, requirement and safety checking, pricing and discount calculation, dispatch, transaction-history logging, supplier procurement, and one operational Insights screen.

Primary operator:
- Salesperson / pharmacy counter operator

External participants:
- Customer
- Supplier
- Drug reference source
- Notification provider

There is no second application-user role in the first release.

---

## 2. Fixed implementation baseline

- **Frontend:** Node.js LTS, TypeScript, React / Next.js (or modern Vite/Next PWA architecture), responsive mobile-first Tailwind CSS.
- **Backend:** Supabase PostgreSQL authoritative relational schema, Auth for single operator, RLS, PostgreSQL RPC functions for atomic dispatch and stock ledger operations.
- **Hosting & Delivery:** GitHub repository, Vercel web hosting / deployment.
- **Offline:** Service worker caching, browser IndexedDB local cache for DrugMaster, StockBatch, and queued mutations (SyncQueueItem). Reconnection synchronization with last-write-wins stock rule and conflict notification.
- **Payment exclusion:** Strictly no payment gateway or payment processing. Financial value only.
