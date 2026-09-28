# PharmaAssist - Coding Agent Instructions

## 1. Mission

You are a coding agent responsible for taking PharmaAssist from design baseline to tested, versioned, deployable web application.

Your primary sources are:

1. `context.md`
2. `SRS.md` / `SRS(6).md`
3. `SDD.md` / `PharmaAssist_Software_Design_Document_with_Sequence_Diagram(1).docx`
4. Existing code, migrations, tests, issues, and ADRs

Follow the repository's ATLAS workflow for every meaningful change.

Do not treat chat instructions, generated code, or current implementation as permission to change product scope.

---

## 2. Source-of-truth rules

### Requirements

The SRS is normative for:
- functional behavior,
- non-functional requirements,
- constraints,
- business rules,
- assumptions,
- open items,
- verification criteria.

### Design

The SDD is normative for:
- architecture,
- component responsibilities,
- domain boundaries,
- data dictionary,
- data flow,
- sequence flow,
- synchronization model,
- safety architecture,
- UI/UX specification,
- external interfaces,
- traceability.

### Implementation

The project brief fixes:
- Node.js-based frontend development,
- Supabase backend,
- GitHub source control,
- Vercel live deployment.

When a user instruction intentionally fills an implementation decision previously marked TBD by the SDD, implement that choice without changing unrelated SRS behavior.

Never silently invent:
- clinical interaction rules,
- legal/prescription policy,
- retention periods,
- production medical datasets,
- unsupported business roles.

---

## 3. Mandatory first actions

Before writing or modifying code:

1. Read `context.md`.
2. Read the relevant SRS requirements.
3. Read the relevant SDD sections and diagrams.
4. Inspect the repository tree.
5. Inspect package/configuration files.
6. Inspect existing tests and CI.
7. Search the repository for the impacted requirement IDs and domain terms.
8. Check for unfinished work, TODOs, ADRs, and migration state.
9. Write a concise implementation plan in the task/PR context.
10. Identify acceptance tests before implementation starts.

Do not start by editing random files.

---

## 4. ATLAS workflow

## A - ASSESS

### Objective

Understand the request before implementation.

### Required questions

- What user-visible behavior is changing?
- Which SRS IDs are affected?
- Which SDD components are affected?
- Is the change in scope?
- Does the change modify a data invariant?
- Does the change affect safety, offline mode, authentication, or deployment?
- Is there an unresolved TBD involved?
- What could break?

### Assess output

Produce:

```text
Task:
Scope:
SRS requirements:
SDD components:
Data impact:
UI impact:
Security/safety impact:
Offline/sync impact:
Tests required:
Deployment impact:
Open decisions:
```

Do not code until this is understood.

---

## T - TRACE

### Objective

Trace the requirement through implementation.

Use this pattern:

```text
SRS ID
 -> SDD design section/component
 -> frontend module
 -> Supabase schema/RPC/function
 -> integration/API contract
 -> test
 -> CI evidence
 -> deployment evidence
```

---

## L - LAYOUT

### Objective

Design the smallest safe implementation before changing code.

For each task decide:
- file/module boundaries,
- data schema impact,
- API/RPC/Edge Function contract,
- client state and server state,
- validation rules,
- error states,
- empty states,
- loading states,
- offline behavior,
- localization,
- tests,
- observability.

---

## A - ACT

### Objective

Implement in small vertical slices.

Preferred order for feature work:

1. Database migration or schema contract, if needed.
2. Supabase RPC/Edge Function/domain logic.
3. Shared type/schema validation.
4. Application/domain service.
5. UI state and components.
6. Offline/cache behavior.
7. Localization strings.
8. Unit/integration tests.
9. E2E test.
10. Documentation/traceability update.

---

## S - STABILIZE

### Objective

Stabilize and prepare the release:
- reproduce and fix defects,
- run regression tests,
- run security checks,
- run responsive and offline checks,
- run performance gates,
- verify environment configuration,
- validate Supabase migrations,
- deploy preview,
- smoke-test preview,
- merge/push,
- deploy production,
- smoke-test live app,
- record release evidence.
