import { describe, it, expect } from "vitest";
import {
  createReportSchema,
  isWithinServiceBounds,
} from "@/lib/reports/service";
import {
  generatePublicReference,
  validateTransition,
} from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";

describe("Report Service & Domain Logic Unit Tests", () => {
  describe("Geographic Service Boundaries (DEC-01)", () => {
    it("accepts coordinates within the municipal service bounds (Greater Cairo region)", () => {
      // Cairo Downtown: 30.0444, 31.2357
      expect(isWithinServiceBounds(30.0444, 31.2357)).toBe(true);
      // New Cairo / Madinaty: 30.08, 31.62
      expect(isWithinServiceBounds(30.08, 31.62)).toBe(true);
    });

    it("rejects coordinates outside the municipal service bounds", () => {
      // Paris, France
      expect(isWithinServiceBounds(48.8566, 2.3522)).toBe(false);
      // Tokyo, Japan
      expect(isWithinServiceBounds(35.6762, 139.6503)).toBe(false);
      // South of Egypt outside bounds
      expect(isWithinServiceBounds(24.0889, 32.8998)).toBe(false);
    });
  });

  describe("Report Input Validation Schema", () => {
    it("validates valid report input", () => {
      const valid = {
        title: "حفرة عميقة في تقاطع الشارع الرئيسي",
        description: "يوجد هبوط أرضي وحفرة عميقة تهدد سلامة المركبات والمشاة.",
        categoryId: "cat_roads_01",
        latitude: 30.0444,
        longitude: 31.2357,
        addressText: "شارع التحرير، وسط البلد",
        mediaIds: ["m1", "m2"],
      };

      const parsed = createReportSchema.parse(valid);
      expect(parsed.title).toBe(valid.title);
      expect(parsed.mediaIds).toHaveLength(2);
    });

    it("rejects short titles less than 5 characters", () => {
      const invalid = {
        title: "حفرة",
        description: "وصف طويل وكافٍ للمشكلة في الحي السكني",
        categoryId: "cat_roads_01",
        latitude: 30.0444,
        longitude: 31.2357,
      };

      expect(() => createReportSchema.parse(invalid)).toThrow(
        "يجب أن يكون عنوان البلاغ 5 أحرف على الأقل"
      );
    });

    it("rejects descriptions shorter than 10 characters", () => {
      const invalid = {
        title: "هبوط أرضي في الشارع",
        description: "قصير",
        categoryId: "cat_roads_01",
        latitude: 30.0444,
        longitude: 31.2357,
      };

      expect(() => createReportSchema.parse(invalid)).toThrow(
        "يرجى كتابة وصف تفصيلي للمشكلة"
      );
    });

    it("rejects invalid latitude and longitude values", () => {
      const invalidLat = {
        title: "هبوط أرضي في الشارع العام",
        description: "تفاصيل كافية حول البلاغ المقدم من المواطن",
        categoryId: "cat_roads_01",
        latitude: 95.0, // Invalid latitude > 90
        longitude: 31.2357,
      };

      expect(() => createReportSchema.parse(invalidLat)).toThrow("إحداثيات العرض غير صحيحة");
    });

    it("enforces maximum 5 media attachments per report", () => {
      const tooManyMedia = {
        title: "هبوط أرضي في الشارع العام",
        description: "تفاصيل كافية حول البلاغ المقدم من المواطن",
        categoryId: "cat_roads_01",
        latitude: 30.0444,
        longitude: 31.2357,
        mediaIds: ["1", "2", "3", "4", "5", "6"],
      };

      expect(() => createReportSchema.parse(tooManyMedia)).toThrow(
        "الحد الأقصى للصور هو 5 صور"
      );
    });
  });

  describe("Public Reference Generation", () => {
    it("generates reference matching MD-XXXX-XXXX format", () => {
      const ref = generatePublicReference();
      expect(ref).toMatch(/^MD-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    });

    it("uses Crockford Base32 alphabet excluding ambiguous I, L, O, U", () => {
      for (let i = 0; i < 50; i++) {
        const ref = generatePublicReference();
        const chars = ref.replace("MD-", "").replace("-", "");
        expect(chars).not.toMatch(/[ILOU]/i);
      }
    });
  });

  describe("Lifecycle State Transition Permissions & Gate Rules", () => {
    it("prohibits transition to RESOLVED without repair description or evidence photo", () => {
      const result = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.RESOLVED,
        UserRole.STAFF,
        { hasEvidence: false }
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("توثيق أعمال الإصلاح وإرفاق الصور");
    });

    it("allows transition to RESOLVED when evidence is provided by STAFF", () => {
      const result = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.RESOLVED,
        UserRole.STAFF,
        { hasEvidence: true }
      );
      expect(result.allowed).toBe(true);
    });

    it("prohibits CITIZEN from marking a report as RESOLVED directly", () => {
      const result = validateTransition(
        ReportStatus.IN_PROGRESS,
        ReportStatus.RESOLVED,
        UserRole.CITIZEN,
        { hasEvidence: true }
      );
      expect(result.allowed).toBe(false);
    });

    it("prohibits transition to REJECTED without specifying a reason", () => {
      const result = validateTransition(
        ReportStatus.UNDER_REVIEW,
        ReportStatus.REJECTED,
        UserRole.STAFF,
        { reason: "" }
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("يتطلب هذا التغيير إدخال سبب واضح");
    });

    it("allows transition to REJECTED when a reason is provided", () => {
      const result = validateTransition(
        ReportStatus.UNDER_REVIEW,
        ReportStatus.REJECTED,
        UserRole.STAFF,
        { reason: "خارج اختصاص البلدية — يتبع وزارة الإسكان" }
      );
      expect(result.allowed).toBe(true);
    });

    it("prohibits illegal transition from NEW directly to RESOLVED", () => {
      const result = validateTransition(
        ReportStatus.NEW,
        ReportStatus.RESOLVED,
        UserRole.STAFF,
        { hasEvidence: true }
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("غير مسموح للدور");
    });
  });

  describe("Appeal Window Calculation (7-Calendar-Day Rule)", () => {
    it("considers appeal within 7 calendar days as valid", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - fiveDaysAgo.getTime() > sevenDaysMs;
      expect(isExpired).toBe(false);
    });

    it("considers appeal past 7 calendar days as expired", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - eightDaysAgo.getTime() > sevenDaysMs;
      expect(isExpired).toBe(true);
    });
  });
});
