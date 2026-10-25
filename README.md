# مدينتي — Madinaty

> **المنصة الوطنية الموحدة للإبلاغ عن مشاكل البنية التحتية والبيئة ومتابعتها**  
> An Arabic-first, RTL, mobile-first municipal reporting and resolution platform.

---

## 1. Project Overview & Governance

Madinaty connects citizens directly with municipal authorities to report public infrastructure issues (road hazards, street lighting outages, waste accumulation, sewage leaks, public park maintenance). The project follows strict phased development, automated verification, and mandatory architectural rules defined in:

- [`MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md`](./MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md) — Authoritative project blueprint.
- [`docs/PHASE_0_AUDIT.md`](./docs/PHASE_0_AUDIT.md) — Discovery audit & authoritative 9-status transition matrix.
- [`docs/IMPLEMENTATION_BACKLOG.md`](./docs/IMPLEMENTATION_BACKLOG.md) — Work sequencing & acceptance criteria across all 6 phases.
- [`docs/DECISIONS_REQUIRED.md`](./docs/DECISIONS_REQUIRED.md) — Governance register for operational & business decisions.

---

## 2. Technology Stack (Phase 1 Approved)

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) + TypeScript |
| **Styling** | Tailwind CSS + RTL native text direction |
| **Typography** | Cairo (`next/font/google`) with Arabic & Latin subsets |
| **Database & ORM** | PostgreSQL 18+ & Prisma 7 (`@prisma/adapter-pg` driver adapter) |
| **Authentication** | Better Auth (Email & Password, secure sessions, password recovery) |
| **Validation** | Zod (strict environment & input validation) |
| **Unit Testing** | Vitest 5 + `@vitejs/plugin-react` |
| **E2E Testing** | Playwright (Chromium test suites) |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 3. Getting Started

### Prerequisites
- **Node.js:** v24.0+ (Tested on v24.20.0)
- **Package Manager:** `npm` (v11+) or `pnpm`
- **PostgreSQL:** Accessible PostgreSQL 15+ database instance (Local or Neon)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/demianeid/madinaty.git
cd madinaty
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure `DATABASE_URL` and `BETTER_AUTH_SECRET` are configured:
```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/madinaty?schema=public"
BETTER_AUTH_SECRET="madinaty-development-super-secret-key-at-least-32-chars-long"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Initialization & Seeding
```bash
# Validate Prisma schema
npx prisma validate

# Generate Prisma Client
npm run db:generate

# Apply migrations (or push schema in development)
npx prisma db push

# Seed initial authorities, categories, and test users
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Default Seed Accounts (Development Only)

All default development accounts use the password: **`Password1234!`**

| Role | Email | Password | Status | Initial Scope |
|---|---|---|---|---|
| **System Administrator** | `admin@madinaty.local` | `Password1234!` | `ACTIVE` | Global system administration & audit logs |
| **Authority Staff** | `staff.works@madinaty.local` | `Password1234!` | `ACTIVE` | Municipal Works Authority (`municipal-works`) |
| **Citizen** | `citizen@madinaty.local` | `Password1234!` | `ACTIVE` | Citizen reporting & tracking |

---

## 5. Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint analysis (0 warnings enforced) |
| `npm run typecheck` | Runs strict TypeScript compiler check (`tsc --noEmit`) |
| `npm test` | Runs Vitest unit & integration test suites |
| `npm run test:e2e` | Runs Playwright end-to-end browser tests |
| `npm run db:generate` | Generates Prisma Client types |
| `npm run db:seed` | Seeds database reference data |

---

## 6. Verification Status & Acceptance Criteria (Phase 1)

- [x] **Project Scaffolding:** Next.js App Router + TypeScript in strict mode.
- [x] **Arabic RTL Design:** `dir="rtl"`, Cairo Google Font, and responsive mobile-first Tailwind design system.
- [x] **Strict Environment Guard:** `lib/env.ts` with Zod validation and detection of exposed secret keys with `NEXT_PUBLIC_` prefixes.
- [x] **Complete Database Schema:** `prisma/schema.prisma` modeling all 17 domain entities and 9 authoritative statuses with Prisma 7 PostgreSQL driver adapter (`@prisma/adapter-pg`).
- [x] **Authentication Core:** Better Auth route handler (`app/api/auth/[...all]`), React client (`lib/auth/auth-client.ts`), and localized Arabic auth flows (Login, Register, Forgot Password, Reset Password, Verify Email).
- [x] **Server-Side Authorization & Guards:** `lib/auth/guards.ts` with `requireUser`, `requireRole`, `requireAuthorityScope`, `requireReportAccess` (IDOR prevention), and immediate revocation check for suspended accounts.
- [x] **Immutable Audit Logging:** `lib/audit/logger.ts` for recording sensitive actions.
- [x] **Lifecycle & Reference Generator:** `lib/reports/lifecycle.ts` enforcing the authoritative 9-status state machine and collision-resistant `MD-XXXX-XXXX` references.
- [x] **Automated Tests:**
  - **Vitest:** 30 unit tests covering lifecycle transitions, role guards, IDOR rules, and environment validation.
  - **Playwright:** 4 E2E tests verifying Arabic RTL rendering, emergency guidance banner, unauthenticated dashboard protection, registration mismatch validation, and generic password recovery feedback.
  - **ESLint & TypeScript:** 0 errors, 0 warnings.
  - **Next.js Production Build:** `npm run build` succeeds cleanly.
- [x] **CI/CD:** `.github/workflows/ci.yml` configured for lint, typecheck, schema validation, unit tests, and production build verification.

---

## 7. Phase 1 Boundaries & Outstanding Dependencies

- **Current Boundary:** Phase 1 complete. Core report creation, map pins, Cloudinary media uploads, Resend emails, and Gemini AI validation are scheduled for Phase 2, Phase 3, and Phase 4.
- **External Credentials for Next Phases:**
  - `DATABASE_URL` (Managed Neon or local PostgreSQL instance)
  - `GEMINI_API_KEY` (Required for Phase 3 image validation)
  - `CLOUDINARY_API_KEY` & `CLOUDINARY_API_SECRET` (Required for Phase 3 private media)
  - `RESEND_API_KEY` (Required for Phase 4 transactional emails)
