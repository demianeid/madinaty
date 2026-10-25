# Madinaty — Decisions Required & Operational Governance Register

- **Document Version:** 1.0 (Phase 0 Audit Deliverable)
- **Status:** Open for Stakeholder / Product Owner Approval
- **Reference Blueprint:** `MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md` (§22)

---

## 1. Governance Principles & Strict Constraints

As mandated by Section 22 of the project blueprint:
1. **No Guessing or Fabricating:** Development teams and AI coding agents must not invent real-world boundaries, legal terms, government authority hierarchies, or operational SLA numbers.
2. **Provisional Development Defaults:** To unblock local development and test automation in Phases 1–4, provisional seed fixtures are provided below. These fixtures are **strictly provisional** and marked as non-production.
3. **Production Gate (Decision #100):** Every decision labeled as a **Launch Blocker** must be formally reviewed, approved, and configured before public production deployment.

---

## 2. Itemized Decision Register

| ID | Decision Topic | Blueprint Ref | Classification | Development Default (Unblocking Phase 1–4) | Production Requirement (Stakeholder Approval Needed) |
|---|---|---|---|---|---|
| **DEC-01** | **Target City & Service Boundaries** | §5, §7, §22 | Launch Blocker | Single bounding box representing a test metropolitan area (e.g., Cairo/New Cairo or Amman district coordinates). | Exact GeoJSON polygon boundary defining the operational jurisdiction of the participating municipality. |
| **DEC-02** | **Category Taxonomy & Authority Mapping** | §5, §A5, §22 | Unblocked with Seeds | 6 baseline categories: Road Hazards, Street Lighting, Waste Management, Water & Sewage, Public Parks, Building Code. | Authoritative list of municipal categories, Arabic/English labels, and default recipient department IDs. |
| **DEC-03** | **Authority Hierarchy & Scopes** | §3, §5, §22 | Unblocked with Seeds | 2 test authorities: "Municipal Works Authority" and "Sanitation Department". | Real municipal departments, contact emails, triage teams, and administrative escalation contacts. |
| **DEC-04** | **SLA Timelines & Priority Matrix** | §5, §22 | Operational Policy | Standard calendar hours: Low (168h / 7d), Medium (72h / 3d), High (24h / 1d), Critical (6h). SLA measured 24/7 calendar time. | Approved municipal SLAs, escalation rules, and holiday/weekend calendar policy (if any). |
| **DEC-05** | **Emergency Guidance & High Priority** | §19, §22 | Launch Blocker (Legal) | Clear Arabic notice: "Madinaty is for non-emergency public reports. For life-threatening emergencies, call Civil Defense (e.g., 911/123/180)." | Exact emergency helpline numbers and legal disclaimer approved by city authorities. |
| **DEC-06** | **Report Deletion Policy** | §11, §22 | Legal / Privacy | Citizen deletion permitted ONLY in `NEW` status. Once review/work begins (`UNDER_REVIEW`+), reports cannot be deleted; citizen can only request PII anonymization. | Legal policy governing data subject rights (GDPR/local data protection laws) vs municipal archiving mandates. |
| **DEC-07** | **Data & Media Retention Periods** | §8, §11, §22 | Legal Review | Indefinite retention in development. Soft-delete flag on reports and audit entries. | Exact retention schedules (e.g., keep resolved report photos for 3 years, keep audit logs for 7 years, purge unreferenced temp images after 30 days). |
| **DEC-08** | **Duplicate Merging: Manual vs Automated** | §6, §22 | Operational Policy | **Strictly Manual** in Version 1. Similarity suggestions surfaced in staff UI, but automatic merging disabled via feature flag. | Criteria for enabling automatic merging (distance radius, time delta, semantic match threshold) and merge reversal workflow. |
| **DEC-09** | **Rate Limiting & Abuse Prevention** | §9, §22 | Technical / Security | Local in-memory / Upstash rate limits: Auth (5 attempts/min), Report creation (5 reports/hour), Gemini calls (10 calls/min). | Production rate limit thresholds and IP whitelist policies for municipal staff networks. |
| **DEC-10** | **Disaster Recovery: RTO / RPO** | §16, §22 | Operational SLA | RTO <= 24 hours, RPO <= 24 hours (daily automated Neon/PostgreSQL snapshots). | Formal recovery targets approved by infrastructure/operations leads, with budget allocation for point-in-time recovery (PITR). |
| **DEC-11** | **Tile Provider & Usage Terms** | §7, §22 | Operational Budget | Standard OpenStreetMap public tile server (`tile.openstreetmap.org`) for development and testing. | Commercial tile provider agreement (Mapbox, Stadia, Protomaps, or self-hosted tile server) to support production load without violating OSM tile usage policy. |
| **DEC-12** | **Email Sending Domain & Verification** | §10, §22 | Launch Blocker (Ops) | Resend sandbox or test domain (`notifications@test.madinaty.local` / console logging in development). | Verified production domain (e.g., `notifications.madinaty.gov` or `.org`) with SPF, DKIM, and DMARC DNS records configured. |

---

## 3. Detailed Analysis of Critical Decisions

### 3.1 DEC-05: Emergency Guidance Disclaimer
- **Risk:** Citizens attempting to report active electrical fires, open high-voltage cables, collapsing structures, or gas leaks via an asynchronous reporting app could face imminent danger.
- **Architectural Implementation:**
  - An un-dismissible emergency banner will appear at the top of the report creation form.
  - Form categories tagged as `isEmergencySensitive` (e.g., Gas Leaks, Exposed Power Lines) will trigger a modal advising the user to immediately call the designated municipal emergency service rather than waiting for an online ticket.

### 3.2 DEC-06: Report Deletion vs Municipal Audit Records
- **Tension:** Resident privacy rights vs government accountability and audit requirements.
- **Architectural Implementation:**
  - Citizen initiated "Delete":
    - If status == `NEW`: Soft delete allowed (`deletedAt = now()`).
    - If status in (`UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`): Citizen button is labeled "Request Anonymization" (طلب إخفاء الهوية). This clears the reporter's phone, email, and personal name from the public view and marks `reporterAnonymized = true`, but retains the municipal maintenance history, photos, and timestamps.
  - Hard physical deletion (`DELETE FROM "Report"`) is disabled at the ORM/schema level for non-admin accounts.

### 3.3 DEC-08: Duplicate Merging Policy
- **Tension:** Merging reports saves field staff time, but false-positive automatic merges could suppress unique, distinct citizen complaints or route them to the wrong teams.
- **Architectural Implementation:**
  - Version 1 will calculate and display a "Potential Duplicates" card in the Authority Dashboard if:
    1. Distance between coordinates <= 100 meters.
    2. Category is identical.
    3. Creation date is within 14 calendar days.
  - Merging remains an **explicit staff action** requiring staff confirmation and recording a merge reason in `ReportStatusHistory` and `DuplicateLink`.
  - Automatic background merge will remain default-disabled in production.

---

## 4. Decision Sign-Off Matrix

| Role | Name | Responsibilities | Status |
|---|---|---|---|
| **Product Sponsor / City Authority** | Pending Assignment | Approve city boundaries, categories, emergency disclaimer | Pending Review |
| **Legal Counsel / DPO** | Pending Assignment | Approve Privacy Policy, retention periods, deletion rules | Pending Review |
| **Engineering Lead** | Antigravity (Acting Lead) | Approve technical defaults, rate limits, RTO/RPO | **Approved for Phase 1** |
| **Operations / Infra Lead** | Pending Assignment | Provision database, Resend domain, Cloudinary credentials | Pending Review |
