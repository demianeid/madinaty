# Madinaty — Phase 0 Repository Audit & Architectural Reconciliation

- **Audit Date:** 2026-10-18
- **Auditor:** Senior Lead Systems Engineer
- **Target Repository:** `https://github.com/demianeid/madinaty`
- **Reference Document:** `MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`
- **Audit Phase:** Phase 0 (Discovery, Repository Audit, Rule Reconciliation)

---

## 1. Executive Summary & Audit Methodology

This Phase 0 audit was conducted through direct inspection of the workspace, Git object store, directory trees, process runtime environment, and the authoritative blueprint (`MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`).

### Key Audit Finding
The repository is **100% greenfield (empty)** from an implementation perspective.
- There is **no existing application code, no package manifest (`package.json`), no ORM schema, no database migrations, no CI/CD pipelines, and no test harness**.
- The repository was initialized with a single root commit (`b974554`) containing exclusively the blueprint specification document `MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`.
- No hidden branches, tags, stashes, or uncommitted files exist.

### Objective of this Phase 0 Deliverable
Because the codebase is greenfield, Phase 0 establishes the engineering baseline:
1. **Verification of the actual environment** to prevent false assumptions.
2. **Exhaustive gap analysis** comparing current assets against the blueprint.
3. **Reconciliation of lifecycle discrepancies** across the blueprint (specifically integrating `WAITING_FOR_RESIDENT`, `CLOSED_NO_RESPONSE`, `REOPENED`, and `REJECTED` into a single authoritative state machine).
4. **Identification of blueprint ambiguities, security constraints, and external dependencies**.
5. **Formulation of Phase 1 implementation gates**.

---

## 2. Actual Repository State & Verification Evidence

All findings below were verified using shell inspection within the workspace (`d:\madinaty\madinaty`):

| Inspection Area | Actual State Found | Verification Command & Evidence |
|---|---|---|
| **Git Branches** | Single local branch `main` tracking `origin/main` | `git branch -a` returned `* main`, `remotes/origin/main` |
| **Commit History** | Exactly 1 root commit (`b974554`) | `git log -n 5 --oneline` -> `b974554 Madinaty_BluePrint.md` |
| **Working Tree** | Clean; 0 untracked files | `git status` -> `nothing to commit, working tree clean` |
| **Git Stashes / Tags** | 0 stashes, 0 tags | `git stash list` and `git tag -l` returned empty |
| **Filesystem Objects** | Only `.git` directory and `MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md` (39,933 bytes) | `Get-ChildItem -Force` |
| **Package Manager** | None initialized in repository; System has `npm` v11.19.0, `pnpm` v12.9.1 | `node -v` (v24.20.0), `pnpm -v`, `npm -v` verified |
| **Dependencies** | None installed; no `node_modules` or lockfiles | Directory scan confirmed absence |
| **Prisma / Database** | No `prisma/schema.prisma`, no migrations, no seed script | Directory scan confirmed absence |
| **Application Code** | No Next.js App Router, React components, or API routes | Directory scan confirmed absence |
| **Environment Config** | No `.env`, `.env.example`, or `.env.local` | Directory scan confirmed absence |
| **CI/CD** | No `.github/workflows/` | Directory scan confirmed absence |
| **Automated Tests** | No Vitest/Jest/Playwright test specs or configuration | Directory scan confirmed absence |

---

## 3. Technology Stack & Infrastructure Baseline

The blueprint prescribes a modern TypeScript/Next.js stack. Below is the verified target stack against the local development environment:

| Layer | Approved Technology (Blueprint §2) | Local Host Capability | Implementation Status |
|---|---|---|---|
| **Runtime** | Node.js (LTS/Current) | Node.js v24.20.0 | Verified available |
| **Package Manager** | `pnpm` (recommended for Next.js monorepos/modern projects) or `npm` | `pnpm` 12.9.1 / `npm` 11.19.0 | Verified available |
| **Framework** | Next.js App Router (TypeScript) | Not yet initialized | Pending Phase 1 |
| **Styling** | React + Tailwind CSS + RTL support | Not yet initialized | Pending Phase 1 |
| **Database & ORM** | PostgreSQL + Prisma + Prisma Migrate | PostgreSQL engine needed (Neon/Docker/local) | Pending Phase 1 |
| **Authentication** | Better Auth (email + password, sessions) | Not yet installed | Pending Phase 1 |
| **Validation** | Zod (strict schema validation) | Not yet installed | Pending Phase 1 |
| **Maps** | Leaflet + OpenStreetMap (RTL/Arabic tiles) | Not yet installed | Pending Phase 3 |
| **AI Validation** | Google Gemini (Server-side SDK) | Not yet installed | Pending Phase 3 |
| **Media Storage** | Cloudinary (Private delivery, signed URLs) | Not yet installed | Pending Phase 3 |
| **Email** | Resend (Arabic templates, transactional) | Not yet installed | Pending Phase 4 |
| **Monitoring** | Sentry | Not yet installed | Pending Phase 6 |
| **Testing** | Vitest/Node Test Runner + Playwright E2E | Not yet installed | Pending Phase 1 |

---

## 4. Prioritized Gap Analysis

### 4.1 Implemented and Verified Features
- **Project Blueprint & Specifications:** Completed and tracked in Git (`MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`).
- **No legacy technical debt or deprecated packages:** Because there is no existing code, there are no legacy bugs, broken refactors, or outdated dependencies to remediate.

### 4.2 Partially Implemented Features
- None. (Zero application code exists).

### 4.3 Missing Features (Grouped by Priority)

#### Priority 0: Critical Architecture & Security Foundation (Phase 1)
1. **Next.js Project Initialization:** Next.js with TypeScript, App Router, ESLint, PostCSS, Tailwind CSS.
2. **Environment Configuration & Validation:** `.env.example` and a typesafe environment validator (Zod-based `env.ts`).
3. **Prisma Schema & Initial Migration:** Data models for `User`, `Session`, `Account`, `Authority`, `AuthorityMembership`, `ServiceArea`, `Category`, `Report`, `ReportMedia`, `ReportStatusHistory`, `ReportAssignmentHistory`, `ReportUpdate`, `InternalNote`, `Appeal`, `Rating`, `DuplicateLink`, `Notification`, `NotificationDelivery`, `AuditLog`, `OutboxEvent`.
4. **Better Auth Integration:** Server-side authentication, session cookies (HTTP-only, Secure, SameSite=Lax), password hashing, email verification, password reset flows.
5. **Centralized Authorization Engine:** Server-side guards (`requireUser`, `requireRole`, `requireAuthorityScope`, `requireReportAccess`). Strict prohibition of client-supplied roles or authority IDs.
6. **Audit Logging Framework:** Server-side immutable event emission into `AuditLog` table within the same transaction or outbox.
7. **CI/CD Pipeline:** GitHub Actions workflow running linting, type-checking, Prisma schema validation, and unit tests on PR.

#### Priority 1: Core Domain & Report Lifecycle (Phase 2)
1. **Public Reference Generator:** Cryptographically random, collision-resistant, non-sequential alphanumeric codes (e.g., `MD-7K9M-2P4R`).
2. **Report Creation Flow:** Multi-step form, coordinate validation, category mapping, initial `NEW` status, idempotency keys.
3. **Authoritative Status State Machine:** Strict database-level transaction validation enforcing allowable transitions, recording `ReportStatusHistory`.
4. **Information Request Mechanism (`WAITING_FOR_RESIDENT`):** Enabling staff to ask for clarifications, transitioning back to `IN_PROGRESS` or `UNDER_REVIEW` upon citizen submission.
5. **Resolution & Evidence Workflow:** Enforcing repair description and photo proof before transitioning to `RESOLVED`.
6. **Appeals & Reopening Engine:** 7-day citizen appeal window; appeal intake moving report to `UNDER_REVIEW`; reopening requests for `CLOSED` reports.
7. **Automated Expiration Closure (`CLOSED_NO_RESPONSE`):** Background worker/cron evaluating resolved reports whose appeal window elapsed without action.
8. **Concurrency Control:** Optimistic concurrency locks using a `version` integer column on the `Report` entity.

#### Priority 2: Media, Maps & AI Validation (Phase 3)
1. **Media Upload Pipeline:** Cloudinary signed upload presets, strict server MIME-type verification (JPG, PNG, WebP), 5 MB max, max 5 images per action, EXIF/GPS scrubbing.
2. **Private Media Gatekeeper:** Cloudinary private delivery mode; image serving through short-lived signed URLs generated only after authorization checks.
3. **Leaflet & OpenStreetMap Integration:** RTL Arabic map viewer/picker, tile attribution compliance, coordinate jitter/bounding box privacy for public views.
4. **Gemini Server-Side Inspection:** Isolated server invocation to detect report relevance; strict fallback handling (`UNCERTAIN` or failure routes to human review, never rejection).

#### Priority 3: Notifications, Background Processing & Outbox (Phase 4)
1. **Notification Hub:** Database-backed in-app notifications with read/unread tracking and real-time counter.
2. **Transactional Outbox Worker:** Outbox table + idempotent background processor to send Resend emails without blocking HTTP requests or causing duplicate dispatches.
3. **Arabic Email Templates:** RTL HTML email templates with pre-configured headers, unsubscription/security guidance, and clear actions.
4. **Scheduled Cron Jobs:** Automated checks for expiring appeal windows, SLA breach warning calculations, and orphan upload cleanups.

#### Priority 4: Dashboards, Public Views & Arabic UX (Phase 5)
1. **Citizen Portal:** "My Reports" tracker, detail timeline, appeal submission modal, rating component (1-5 stars + feedback).
2. **Authority Staff Dashboard:** Filtered work queue (by scope, category, priority, status), status transition action bar, internal notes editor, resolution form.
3. **Admin Dashboard:** Authority management, staff assignment/revocation, category CRUD, routing rule engine, system audit log inspector.
4. **Public Portal:** Sanitized report search, privacy-compliant map view (coarse locations only), Arabic privacy policy, terms of service.
5. **Accessibility & RTL Polish:** WCAG 2.2 AA compliance, keyboard navigation, high-contrast states, full RTL layouts via Tailwind.

#### Priority 5: Operational Hardening & Launch Readiness (Phase 6)
1. **End-to-End Test Suite:** Playwright test suites testing all role boundaries, IDOR attack vectors, transition violations, and upload limits.
2. **Sentry & Telemetry Integration:** Sensitive-data-scrubbed error capturing, performance monitoring.
3. **Backup & Recovery Verification:** Documented and verified database snapshot recovery process.
4. **Launch Checklist (Decision #100) Verification:** Sign-off on all functional, security, operational, and UX criteria.

---

## 5. Security Vulnerabilities, Authorization Gaps & Privacy Baseline

Because code has not yet been written, the following critical architecture mandates must be baked into the repository from Day 1:

1. **Insecure Direct Object Reference (IDOR) Prevention:**
   - No route handler (`/api/reports/:id`, `/api/media/:id`, etc.) may query records solely by `id`.
   - All queries must combine record ID with session tenancy: `where: { id, createdById: session.user.id }` for citizens, or verify that `session.user` has active `AuthorityMembership` covering the report's `authorityId`.
2. **Immediate Access Revocation:**
   - Modifying a staff account's status to `SUSPENDED` or setting `AuthorityMembership.isActive = false` must immediately invalidate staff privileges. Better Auth session validation must check the user's active status on every authenticated server request or use short token lifespans with database verification.
3. **Zero Secret Leakage:**
   - Keys (`BETTER_AUTH_SECRET`, `GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`) must never be prefixed with `NEXT_PUBLIC_`.
   - CI must run secret detection scans.
4. **Metadata & EXIF Privacy Leakage:**
   - Smartphone camera images carry precise GPS coordinates and device identifiers in EXIF headers. Uploaded images must be re-encoded/stripped before storage so that citizen residences/locations are not exposed through media files.
5. **Public Data Sanitization:**
   - Public report endpoints must use a strict DTO schema omitting `createdById`, reporter name, contact info, precise latitude/longitude (jittered or district-level only), and internal notes.

---

## 6. Blueprint Contradictions, Ambiguities & Reconciliations

During the audit of `MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`, the following ambiguities and contradictions were uncovered:

### 6.1 Status Lifecycle Discrepancy
- **Blueprint §4 text:** Lists sequential flow: `NEW → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`, with auxiliary statuses `REJECTED` and `CLOSED_NO_RESPONSE`.
- **Blueprint Appendix A3 diagram:** Includes `WAITING_FOR_RESIDENT` and `REOPENED`, but omits `CLOSED_NO_RESPONSE`.
- **Reconciliation:** Both `WAITING_FOR_RESIDENT`, `CLOSED_NO_RESPONSE`, `REOPENED`, and `REJECTED` are necessary for real municipal workflows. See Section 7 for the unified, authoritative status machine.

### 6.2 Category Structure Reference
- **Blueprint §A5 (`Category`):** States *"Use the stable category keys defined in the category section. Do not change keys used by reports without a migration."*
- **Discrepancy:** The main body of the blueprint does not contain a hardcoded list of categories, but rather states in §5: *"Store categories, authorities, areas, and routing rules in PostgreSQL; manage them from the admin dashboard without code changes."*
- **Reconciliation:** In Phase 1, create a flexible database-backed `Category` table with initial seed categories representing common municipal concerns (e.g., Road Hazards, Street Lighting, Waste Management, Water & Sewage, Public Parks) with stable slug keys, while requiring administrative approval before production launch.

### 6.3 Automatic Merging vs Production Safety
- **Blueprint §6:** Mentions *"Automatic merging is the intended policy, but it must remain disabled in production until strict matching criteria and clear tests are approved."*
- **Reconciliation:** The data model will support `canonicalReportId` and `DuplicateLink`, but the API and UI will only implement **similarity suggestions** and **manual admin/staff merging** in Version 1. Automatic merge jobs will be locked behind a feature flag default-set to `false`.

### 6.4 Report Deletion vs Audit Integrity
- **Blueprint §11:** States *"Citizens may delete their reports under the approved policy, but permitted states must be specified... do not delete necessary audit records without legal assessment."*
- **Reconciliation:** Hard database `DELETE` of report rows is prohibited. When a citizen requests report deletion, if the report is in `NEW` status, it will be marked `deletedAt = now()` (soft delete) or `CANCELLED_BY_CITIZEN`. Once work or review has started (`UNDER_REVIEW` and beyond), the report cannot be deleted by the citizen; only an anonymization of personal metadata can be requested, preserving the municipal incident record and status history.

---

## 7. Reconciled & Authoritative Report Status-Transition Matrix

To resolve all discrepancies between Section 4, Section 5, and Appendix A3, the following **authoritative state machine** governs Madinaty. Every transition not explicitly declared here is prohibited by the server and will return HTTP 422 (Unprocessable Entity).

### 7.1 Status Definitions

| Status Code | Description | SLA Active | Publicly Visible (if approved) |
|---|---|---|---|
| `NEW` | Report submitted by citizen, initial state awaiting triage/routing | Yes | No (Pending review) |
| `UNDER_REVIEW` | Under validation by triage staff or awaiting AI/manual check | Yes | No (Pending review) |
| `ASSIGNED` | Assigned to a specific authority or field operator | Yes | Optional |
| `IN_PROGRESS` | Remediation work actively in progress by field staff | Yes | Yes |
| `WAITING_FOR_RESIDENT` | Authority requested additional photos or details from reporter | Paused / Yes (configurable) | Yes |
| `RESOLVED` | Authority marked work complete with evidence; 7-day appeal clock starts | No (Target met) | Yes |
| `REJECTED` | Authority/triage rejected report with mandatory reason | No | No |
| `CLOSED` | Formally closed after citizen satisfaction rating or appeal window | No | Yes |
| `CLOSED_NO_RESPONSE` | Closed automatically by cron because 7-day appeal window expired | No | Yes |
| `REOPENED` | Reopened via citizen request or accepted appeal after resolution | Yes (Resumed) | Yes |

---

### 7.2 The Authoritative Transition Matrix

| Current Status (`fromStatus`) | Target Status (`toStatus`) | Permitted Actors | Mandatory Conditions & Required Fields | Side Effects / Side-Channel Actions |
|---|---|---|---|---|
| `*` (Creation) | `NEW` | Citizen | Valid title, description, category, valid coords, max 5 images | Generate `publicReference`, queue initial routing & Gemini check |
| `NEW` | `UNDER_REVIEW` | System / Triage Staff / Admin | Routine intake; or Gemini check returned `UNCERTAIN` | Notify staff queue |
| `NEW` | `ASSIGNED` | System / Admin / Triage | Routing rule matched category and service area | Send notification to assigned authority staff |
| `NEW` | `REJECTED` | Triage Staff / Admin | Mandatory `rejectionReason` selected + explanation note | Send rejection email & in-app notification to citizen |
| `UNDER_REVIEW` | `ASSIGNED` | Triage Staff / Admin | Authority explicitly selected with jurisdiction confirmation | Notify assigned authority staff |
| `UNDER_REVIEW` | `REJECTED` | Triage Staff / Admin | Mandatory `rejectionReason` selected + explanation note | Send rejection email & in-app notification; start 7-day review window |
| `ASSIGNED` | `IN_PROGRESS` | Assigned Authority Staff / Admin | Staff claims ticket or starts field deployment | Record `startedAt`; notify citizen that work has begun |
| `ASSIGNED` | `UNDER_REVIEW` | Assigned Authority Staff / Admin | Authority rejects assignment (wrong jurisdiction/scope) | Mandatory transfer reason; alert admin queue |
| `IN_PROGRESS` | `WAITING_FOR_RESIDENT` | Assigned Authority Staff / Admin | Staff submits specific question/request for citizen | Send urgent notification/email to citizen; open response form |
| `WAITING_FOR_RESIDENT`| `IN_PROGRESS` | Citizen | Citizen provides additional text update or additional photos | Notify assigned staff that resident responded |
| `WAITING_FOR_RESIDENT`| `UNDER_REVIEW` | Citizen / Staff | Scope changed significantly based on new resident input | Route back to triage queue |
| `IN_PROGRESS` | `RESOLVED` | Assigned Authority Staff / Admin | **Mandatory:** Repair description AND repair photo(s) (or documented waiver reason) | Set `resolvedAt = now()`; trigger resolution notification; start 7-day appeal timer |
| `RESOLVED` | `CLOSED` | Citizen | Citizen confirms satisfaction and/or submits rating (1-5 stars) | Set `closedAt = now()`; record satisfaction score |
| `RESOLVED` | `REOPENED` | Citizen | Citizen submits valid appeal/reopen request within 7 calendar days | Pause auto-closure; notify authority; record appeal grounds |
| `RESOLVED` | `CLOSED_NO_RESPONSE`| System (Cron Job) | 7 calendar days passed since resolution notification succeeded; NO pending appeal | Set `closedAt = now()`; emit audit log; notify citizen of closure |
| `REJECTED` | `UNDER_REVIEW` | Citizen (via Appeal) / Admin | Citizen appealed rejection within 7 days; or Admin override | Re-open triage queue; notify admin |
| `CLOSED` | `REOPENED` | Admin / Citizen (Request) | New evidence or recurrence reported; Admin approval required | Move back to `UNDER_REVIEW` or `ASSIGNED`; preserve all prior history |
| `CLOSED_NO_RESPONSE` | `REOPENED` | Admin / Citizen (Request) | Valid justification provided; Admin approval required | Move to `UNDER_REVIEW`; record reopening audit trail |

---

### 7.3 Prohibited Status Transitions (Enforced by Server Guard)

The following transitions are strictly prohibited and will be rejected at the database transaction layer:
1. `NEW` → `RESOLVED` or `CLOSED` (Cannot resolve without triage/assignment).
2. `UNDER_REVIEW` → `RESOLVED` or `CLOSED` (Cannot resolve without field assignment).
3. `RESOLVED` → `IN_PROGRESS` (Must transition through `REOPENED` with documented reason).
4. `RESOLVED` → `CLOSED_NO_RESPONSE` **prior to 7 full calendar days** (168 hours) post-successful notification delivery.
5. `RESOLVED` → `CLOSED_NO_RESPONSE` while any active `Appeal` record exists in `PENDING` status.
6. Any status transition without an active authenticated session and authorized role.

---

## 8. External Services, Credentials & Operational Dependencies

The following external accounts and credentials must be provisioned before the corresponding phases can be deployed or tested against live services:

| External Service | Used In | Required Configuration & Credentials | Current Status |
|---|---|---|---|
| **PostgreSQL Database** | Phase 1 | `DATABASE_URL` (Neon, Supabase, or self-hosted PostgreSQL 15+) | Needed for Phase 1 local/dev |
| **Authentication Secret** | Phase 1 | `BETTER_AUTH_SECRET` (32+ char random hex string), `BETTER_AUTH_URL` | Can be generated locally for dev |
| **Google Gemini API** | Phase 3 | `GEMINI_API_KEY` (Google AI Studio or Google Cloud Vertex AI) | Needed for Phase 3 |
| **Cloudinary** | Phase 3 | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed for Phase 3 |
| **Resend Email API** | Phase 4 | `RESEND_API_KEY`, `EMAIL_FROM` (Requires verified sending domain) | Needed for Phase 4 (Mocked in dev) |
| **OpenStreetMap Tiles** | Phase 3 | `NEXT_PUBLIC_MAP_TILE_URL` (Default OSM or custom tile server) | Public OSM available for dev |
| **Sentry Telemetry** | Phase 6 | `SENTRY_DSN` | Needed for Phase 6 production |

---

## 9. Phase 0 Audit Sign-Off & Implementation Gate

- **Repository Audit Completed:** Confirmed greenfield state.
- **State Machine Reconciled:** Status matrix authored with pre-conditions and security constraints.
- **Gap Analysis Completed:** Backlog prioritized from Foundation (Phase 1) to Launch (Phase 6).
- **Decisions Cataloged:** Technical and business decisions documented in `docs/DECISIONS_REQUIRED.md`.

**Recommendation:** Proceed with **Phase 1: Foundation and Authentication** upon stakeholder review.
