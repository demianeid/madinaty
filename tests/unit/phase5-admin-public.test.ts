import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicReportByReference } from "@/lib/reports/service";
import { requireAdmin, UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { ReportStatus, UserRole, UserStatus } from "@prisma/client";

describe("Phase 5: Public Search & Tracking (Epic 6.4)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns sanitized PublicReportDTO with fuzzed coordinates and zero citizen PII", async () => {
    const rawLatitude = 31.2001;
    const rawLongitude = 29.9187;

    const mockReport = {
      id: "report_1",
      publicReference: "MD-9X2K-4M1P",
      title: "ماسورة مياه رئيسية مكسورة",
      description: "تسرب مياه شديد يغمر الشارع الرئيسي أمام مجمع المدارس",
      status: ReportStatus.RESOLVED,
      latitude: rawLatitude,
      longitude: rawLongitude,
      addressText: "شارع جمال عبد الناصر، الإسكندرية",
      resolutionSummary: "تم استبدال الماسورة وإعادة ضخ المياه بصورة طبيعية",
      deletedAt: null,
      createdAt: new Date("2026-05-01T10:00:00Z"),
      resolvedAt: new Date("2026-05-02T15:00:00Z"),
      closedAt: null,
      createdById: "citizen_user_123",
      category: {
        labelAr: "مياه وصرف صحي",
        key: "WATER_LEAK",
      },
      authority: {
        nameAr: "شركة مياه الشرب والصرف الصحي",
        slug: "alex-water",
      },
      statusHistory: [
        {
          toStatus: ReportStatus.NEW,
          reason: null,
          createdAt: new Date("2026-05-01T10:00:00Z"),
        },
        {
          toStatus: ReportStatus.RESOLVED,
          reason: "تم الإصلاح بنجاح",
          createdAt: new Date("2026-05-02T15:00:00Z"),
        },
      ],
      updates: [
        {
          body: "توجهت فرقة الطوارئ الميدانية للموقع",
          createdAt: new Date("2026-05-01T11:00:00Z"),
        },
      ],
      media: [
        {
          id: "photo_resolution_1",
        },
      ],
    };

    prisma.report.findUnique = vi.fn().mockResolvedValue(mockReport);

    const result = await getPublicReportByReference("MD-9X2K-4M1P");

    expect(result).not.toBeNull();
    if (!result) return;

    // 1. Basic properties preserved
    expect(result.publicReference).toBe("MD-9X2K-4M1P");
    expect(result.title).toBe("ماسورة مياه رئيسية مكسورة");
    expect(result.status).toBe(ReportStatus.RESOLVED);
    expect(result.category.labelAr).toBe("مياه وصرف صحي");
    expect(result.authority?.nameAr).toBe("شركة مياه الشرب والصرف الصحي");
    expect(result.resolutionSummary).toBe("تم استبدال الماسورة وإعادة ضخ المياه بصورة طبيعية");

    // 2. Citizen PII is strictly absent
    const rawDto = result as unknown as Record<string, unknown>;
    expect(rawDto.createdById).toBeUndefined();
    expect(rawDto.citizenName).toBeUndefined();
    expect(rawDto.citizenPhone).toBeUndefined();
    expect(rawDto.citizenEmail).toBeUndefined();

    // 3. Exact coordinates are fuzzed for resident privacy
    expect(result.approximateLocation.latitude).not.toBe(rawLatitude);
    expect(result.approximateLocation.longitude).not.toBe(rawLongitude);
    // Approximate difference should be within 0.005 degrees (~500m max jitter)
    expect(Math.abs(result.approximateLocation.latitude - rawLatitude)).toBeLessThan(0.005);
    expect(Math.abs(result.approximateLocation.longitude - rawLongitude)).toBeLessThan(0.005);

    // 4. Resolution photos & public updates
    expect(result.resolutionPhotos).toEqual([
      { id: "photo_resolution_1", url: "/api/media/photo_resolution_1" },
    ]);
    expect(result.publicUpdates).toHaveLength(1);
    expect(result.publicUpdates[0].body).toBe("توجهت فرقة الطوارئ الميدانية للموقع");
  });

  it("returns null for non-existent or soft-deleted reports", async () => {
    prisma.report.findUnique = vi.fn().mockResolvedValue(null);
    const nonExistent = await getPublicReportByReference("MD-NOT-FOUND");
    expect(nonExistent).toBeNull();

    prisma.report.findUnique = vi.fn().mockResolvedValue({
      id: "deleted_rep",
      deletedAt: new Date(),
    });
    const deleted = await getPublicReportByReference("MD-DELETED");
    expect(deleted).toBeNull();
  });
});

describe("Phase 5: Administrative Dashboard & System Management (Epic 6.3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requireAdmin denies unauthenticated access with 401", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null as never);

    await expect(requireAdmin(new Headers())).rejects.toThrow(UnauthorizedError);
  });

  it("requireAdmin denies CITIZEN role with 403 ForbiddenError", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: { id: "citizen_1", role: UserRole.CITIZEN },
    } as never);

    prisma.user.findUnique = vi.fn().mockResolvedValue({
      id: "citizen_1",
      email: "citizen@example.com",
      name: "أحمد المواطن",
      role: UserRole.CITIZEN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
      deletedAt: null,
    });

    await expect(requireAdmin(new Headers())).rejects.toThrow(ForbiddenError);
  });

  it("requireAdmin denies STAFF role with 403 ForbiddenError", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: { id: "staff_1", role: UserRole.STAFF },
    } as never);

    prisma.user.findUnique = vi.fn().mockResolvedValue({
      id: "staff_1",
      email: "staff@example.com",
      name: "مهندس الحي",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
      deletedAt: null,
    });

    await expect(requireAdmin(new Headers())).rejects.toThrow(ForbiddenError);
  });

  it("requireAdmin allows ADMIN role", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue({
      user: { id: "admin_1", role: UserRole.ADMIN },
    } as never);

    prisma.user.findUnique = vi.fn().mockResolvedValue({
      id: "admin_1",
      email: "admin@alex.gov.eg",
      name: "مدير المنظومة",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferredLocale: "ar",
      deletedAt: null,
    });

    const admin = await requireAdmin(new Headers());
    expect(admin.role).toBe(UserRole.ADMIN);
    expect(admin.name).toBe("مدير المنظومة");
  });
});
