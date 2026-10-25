import { describe, it, expect } from "vitest";
import {
  REPORT_STATUSES,
  REPORT_STATUS_METADATA,
  validateTransition,
  generatePublicReference,
} from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";

describe("Report Lifecycle State Machine", () => {
  it("should contain exactly the 9 reconciled statuses from Phase 0 Audit", () => {
    expect(REPORT_STATUSES).toEqual([
      "NEW",
      "UNDER_REVIEW",
      "ASSIGNED",
      "IN_PROGRESS",
      "WAITING_FOR_RESIDENT",
      "RESOLVED",
      "REJECTED",
      "CLOSED",
      "CLOSED_NO_RESPONSE",
      "REOPENED",
    ]);

    for (const status of REPORT_STATUSES) {
      const meta = REPORT_STATUS_METADATA[status as ReportStatus];
      expect(meta).toBeDefined();
      expect(meta.labelAr).toBeTruthy();
      expect(meta.labelEn).toBeTruthy();
    }
  });

  describe("Allowed Transitions", () => {
    it("allows Citizen or Admin to create NEW report", () => {
      const citizenCreate = validateTransition(null, ReportStatus.NEW, UserRole.CITIZEN);
      expect(citizenCreate.allowed).toBe(true);

      const adminCreate = validateTransition(null, ReportStatus.NEW, UserRole.ADMIN);
      expect(adminCreate.allowed).toBe(true);
    });

    it("allows Staff or Admin to assign a NEW or UNDER_REVIEW report", () => {
      const fromNew = validateTransition(ReportStatus.NEW, ReportStatus.ASSIGNED, UserRole.STAFF);
      expect(fromNew.allowed).toBe(true);

      const fromReview = validateTransition(ReportStatus.UNDER_REVIEW, ReportStatus.ASSIGNED, UserRole.STAFF);
      expect(fromReview.allowed).toBe(true);
    });

    it("allows Staff to start work: ASSIGNED -> IN_PROGRESS", () => {
      const res = validateTransition(ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS, UserRole.STAFF);
      expect(res.allowed).toBe(true);
    });

    it("allows Staff to ask resident for clarification with reason: IN_PROGRESS -> WAITING_FOR_RESIDENT", () => {
      const withReason = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.WAITING_FOR_RESIDENT,
        UserRole.STAFF,
        { reason: "يرجى تزويدنا بصورة أوضح للشارع المقابل للمبنى" }
      );
      expect(withReason.allowed).toBe(true);
    });

    it("allows Resident to answer clarification: WAITING_FOR_RESIDENT -> IN_PROGRESS", () => {
      const res = validateTransition(
        ReportStatus.WAITING_FOR_RESIDENT,
        ReportStatus.IN_PROGRESS,
        UserRole.CITIZEN
      );
      expect(res.allowed).toBe(true);
    });

    it("allows Staff to mark RESOLVED only when evidence is provided", () => {
      const withoutEvidence = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.RESOLVED,
        UserRole.STAFF
      );
      expect(withoutEvidence.allowed).toBe(false);
      expect(withoutEvidence.error).toContain("توثيق أعمال الإصلاح");

      const withEvidence = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.RESOLVED,
        UserRole.STAFF,
        { hasEvidence: true }
      );
      expect(withEvidence.allowed).toBe(true);
    });

    it("allows Citizen to submit rating and close: RESOLVED -> CLOSED", () => {
      const res = validateTransition(ReportStatus.RESOLVED, ReportStatus.CLOSED, UserRole.CITIZEN);
      expect(res.allowed).toBe(true);
    });

    it("allows Citizen to appeal resolution: RESOLVED -> REOPENED with reason", () => {
      const res = validateTransition(
        ReportStatus.RESOLVED,
        ReportStatus.REOPENED,
        UserRole.CITIZEN,
        { reason: "الحفرة لم يتم ردمها بالكامل وما زالت تعيق الطريق" }
      );
      expect(res.allowed).toBe(true);
    });

    it("allows System Cron to auto-close: RESOLVED -> CLOSED_NO_RESPONSE", () => {
      const res = validateTransition(
        ReportStatus.RESOLVED,
        ReportStatus.CLOSED_NO_RESPONSE,
        "SYSTEM"
      );
      expect(res.allowed).toBe(true);
    });

    it("allows Citizen to appeal REJECTED report with reason", () => {
      const res = validateTransition(
        ReportStatus.REJECTED,
        ReportStatus.UNDER_REVIEW,
        UserRole.CITIZEN,
        { reason: "البلاغ يقع ضمن اختصاص البلدية حسب الخريطة الجغرافية المعتمدة" }
      );
      expect(res.allowed).toBe(true);
    });
  });

  describe("Prohibited Transitions", () => {
    it("prohibits jumping directly from NEW to RESOLVED", () => {
      const res = validateTransition(ReportStatus.NEW, ReportStatus.RESOLVED, UserRole.STAFF);
      expect(res.allowed).toBe(false);
    });

    it("prohibits jumping directly from NEW to CLOSED", () => {
      const res = validateTransition(ReportStatus.NEW, ReportStatus.CLOSED, UserRole.CITIZEN);
      expect(res.allowed).toBe(false);
    });

    it("prohibits Citizen from changing status from ASSIGNED to IN_PROGRESS", () => {
      const res = validateTransition(ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS, UserRole.CITIZEN);
      expect(res.allowed).toBe(false);
    });

    it("prohibits Citizen from auto-closing: RESOLVED -> CLOSED_NO_RESPONSE", () => {
      const res = validateTransition(ReportStatus.RESOLVED, ReportStatus.CLOSED_NO_RESPONSE, UserRole.CITIZEN);
      expect(res.allowed).toBe(false);
    });

    it("prohibits Staff from transitioning RESOLVED back to IN_PROGRESS directly", () => {
      const res = validateTransition(ReportStatus.RESOLVED, ReportStatus.IN_PROGRESS, UserRole.STAFF);
      expect(res.allowed).toBe(false);
    });

    it("rejects rejection without reason", () => {
      const res = validateTransition(ReportStatus.NEW, ReportStatus.REJECTED, UserRole.STAFF);
      expect(res.allowed).toBe(false);
      expect(res.error).toContain("سبب واضح");
    });
  });

  describe("Public Reference Generator", () => {
    it("should generate references in MD-XXXX-XXXX format", () => {
      const ref = generatePublicReference();
      expect(ref).toMatch(/^MD-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    });

    it("should not contain ambiguous characters 0, O, 1, I, L", () => {
      for (let i = 0; i < 50; i++) {
        const ref = generatePublicReference();
        expect(ref).not.toMatch(/[01OIL]/);
      }
    });

    it("should generate unique references across 100 iterations", () => {
      const refs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        refs.add(generatePublicReference());
      }
      expect(refs.size).toBe(100);
    });
  });
});
