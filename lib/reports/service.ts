import { prisma } from "@/lib/db/prisma";
import { generatePublicReference, validateTransition } from "@/lib/reports/lifecycle";
import { AuthenticatedUser, ForbiddenError, NotFoundError } from "@/lib/auth/guards";
import {
  ReportStatus,
  ReportPriority,
  ReportVisibility,
  UserRole,
  AppealStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

// Provisional bounding box for development (DEC-01)
const PROVISIONAL_BOUNDS = {
  minLat: 29.5,
  maxLat: 31.5,
  minLng: 30.5,
  maxLng: 32.5,
};

export const createReportSchema = z.object({
  title: z
    .string()
    .min(5, "يجب أن يكون عنوان البلاغ 5 أحرف على الأقل")
    .max(100, "العنوان يجب ألا يتجاوز 100 حرف"),
  description: z
    .string()
    .min(10, "يرجى كتابة وصف تفصيلي للمشكلة (10 أحرف على الأقل)")
    .max(2000, "الوصف لا يتجاوز 2000 حرف"),
  categoryId: z.string().min(1, "يرجى اختيار تصنيف البلاغ"),
  latitude: z.number().refine((lat) => lat >= -90 && lat <= 90, "إحداثيات العرض غير صحيحة"),
  longitude: z.number().refine((lng) => lng >= -180 && lng <= 180, "إحداثيات الطول غير صحيحة"),
  addressText: z.string().optional().default(""),
  mediaIds: z.array(z.string()).max(5, "الحد الأقصى للصور هو 5 صور").optional().default([]),
  idempotencyKey: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Validates whether coordinates fall within the municipal service boundary.
 */
export function isWithinServiceBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= PROVISIONAL_BOUNDS.minLat &&
    latitude <= PROVISIONAL_BOUNDS.maxLat &&
    longitude >= PROVISIONAL_BOUNDS.minLng &&
    longitude <= PROVISIONAL_BOUNDS.maxLng
  );
}

/**
 * Creates a new report inside a transaction with public reference and status history.
 */
export async function createReport(
  rawInput: CreateReportInput,
  actor: AuthenticatedUser
) {
  const input = createReportSchema.parse(rawInput);

  // Validate geographic bounds
  if (!isWithinServiceBounds(input.latitude, input.longitude)) {
    throw new Error(
      "الموقع المحدد يقع خارج النطاق الجغرافي المعتمد لخدمات البلدية حالياً."
    );
  }

  // Verify category exists and get default authority routing
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, defaultAuthorityId: true, isActive: true },
  });

  if (!category || !category.isActive) {
    throw new NotFoundError("التصنيف المختار غير متوفر أو تم تعطيله.");
  }

  // Generate collision-resistant reference
  let publicReference = generatePublicReference();
  let collisionCheck = await prisma.report.findUnique({ where: { publicReference } });
  while (collisionCheck) {
    publicReference = generatePublicReference();
    collisionCheck = await prisma.report.findUnique({ where: { publicReference } });
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create Report
    const report = await tx.report.create({
      data: {
        publicReference,
        createdById: actor.id,
        categoryId: category.id,
        authorityId: category.defaultAuthorityId,
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        addressText: input.addressText,
        status: ReportStatus.NEW,
        priority: ReportPriority.MEDIUM,
        visibility: ReportVisibility.PUBLIC_PENDING,
        version: 1,
      },
    });

    // 2. Link Media attachments if provided
    if (input.mediaIds && input.mediaIds.length > 0) {
      await tx.reportMedia.updateMany({
        where: {
          id: { in: input.mediaIds },
          uploadedById: actor.id,
        },
        data: {
          reportId: report.id,
        },
      });
    }

    // 3. Create initial status history entry
    await tx.reportStatusHistory.create({
      data: {
        reportId: report.id,
        fromStatus: null,
        toStatus: ReportStatus.NEW,
        changedById: actor.id,
        actorType: "USER",
        reason: "تقديم البلاغ من قبل المواطن",
      },
    });

    // 4. Audit Log entry
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorType: "USER",
        action: "REPORT_CREATED",
        entityType: "Report",
        entityId: report.id,
        requestId: input.idempotencyKey ?? null,
        metadata: {
          publicReference: report.publicReference,
          categoryId: report.categoryId,
          authorityId: report.authorityId,
        },
      },
    });

    return report;
  });
}

export interface TransitionReportParams {
  reportId: string;
  toStatus: ReportStatus;
  expectedVersion?: number;
  reason?: string;
  repairDescription?: string;
  evidenceMediaIds?: string[];
  actor: AuthenticatedUser;
}

/**
 * Transitions a report's status inside a database transaction enforcing
 * concurrency controls, evidence verification, and role permissions.
 */
export async function transitionReportStatus(params: TransitionReportParams) {
  const { reportId, toStatus, reason, repairDescription, evidenceMediaIds, actor } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current report
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: {
        authority: true,
      },
    });

    if (!report || report.deletedAt !== null) {
      throw new NotFoundError("البلاغ المطلوب غير موجود.");
    }

    // 2. Optimistic Concurrency Control Check
    if (params.expectedVersion !== undefined && report.version !== params.expectedVersion) {
      throw new Error(
        "تم تعديل هذا البلاغ من قبل مستخدم آخر أثناء قيامك بالعملية. يرجى تحديث الصفحة والمحاولة مجدداً."
      );
    }

    // 3. Permission checks
    if (actor.role === UserRole.CITIZEN) {
      if (report.createdById !== actor.id) {
        throw new ForbiddenError("لا يمكنك تغيير حالة بلاغ مقدم من قبل مواطن آخر.");
      }
    } else if (actor.role === UserRole.STAFF) {
      // Must belong to the assigned authority
      if (!report.authorityId) {
        throw new ForbiddenError("البلاغ غير مسند لجهة محددة بعد.");
      }
      const membership = await tx.authorityMembership.findUnique({
        where: {
          userId_authorityId: {
            userId: actor.id,
            authorityId: report.authorityId,
          },
        },
      });
      if (!membership || !membership.isActive) {
        throw new ForbiddenError("لا تملك صلاحية تعديل بلاغات خارج نطاق جهتك المختصة.");
      }
    }

    // 4. Validate transition rules
    const hasEvidence = !!repairDescription || (evidenceMediaIds && evidenceMediaIds.length > 0);
    const validation = validateTransition(report.status, toStatus, actor.role, {
      reason,
      hasEvidence: toStatus === ReportStatus.RESOLVED ? hasEvidence : undefined,
    });

    if (!validation.allowed) {
      throw new Error(validation.error || "الانتقال المطلوب غير مسموح به.");
    }

    // 5. Update data payloads
    const now = new Date();
    const updateData: Prisma.ReportUpdateInput = {
      status: toStatus,
      version: { increment: 1 },
    };

    if (toStatus === ReportStatus.RESOLVED) {
      updateData.resolvedAt = now;
      if (repairDescription) {
        updateData.resolutionSummary = repairDescription;
      }
    } else if (toStatus === ReportStatus.CLOSED || toStatus === ReportStatus.CLOSED_NO_RESPONSE) {
      updateData.closedAt = now;
    } else if (toStatus === ReportStatus.REOPENED) {
      updateData.closedAt = null;
      updateData.resolvedAt = null;
    }

    // 6. Execute report update
    const updatedReport = await tx.report.update({
      where: { id: report.id },
      data: updateData,
    });

    // 7. Associate repair evidence photos
    if (evidenceMediaIds && evidenceMediaIds.length > 0) {
      await tx.reportMedia.updateMany({
        where: { id: { in: evidenceMediaIds } },
        data: { reportId: report.id, isResolutionPhoto: true },
      });
    }

    // 8. Record immutable status history
    await tx.reportStatusHistory.create({
      data: {
        reportId: report.id,
        fromStatus: report.status,
        toStatus,
        reason: reason || (toStatus === ReportStatus.RESOLVED ? repairDescription : null),
        changedById: actor.id,
        actorType: actor.role === UserRole.ADMIN ? "ADMIN_OVERRIDE" : "USER",
        metadata: {
          repairDescription: repairDescription ?? null,
          evidenceMediaCount: evidenceMediaIds?.length ?? 0,
        },
      },
    });

    // 9. Record Audit Log
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorType: "USER",
        action: `REPORT_STATUS_TRANSITION_${toStatus}`,
        entityType: "Report",
        entityId: report.id,
        metadata: {
          fromStatus: report.status,
          toStatus,
          reason,
        },
      },
    });

    return updatedReport;
  });
}

/**
 * Submits an appeal against a REJECTED or RESOLVED report within the 7-calendar-day window.
 */
export async function submitAppeal(params: {
  reportId: string;
  reason: string;
  actor: AuthenticatedUser;
}) {
  const { reportId, reason, actor } = params;

  if (!reason || reason.trim().length < 10) {
    throw new Error("يرجى كتابة أسباب الاعتراض بشكل واضح (10 أحرف على الأقل).");
  }

  return await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: { appeals: { where: { status: AppealStatus.PENDING } } },
    });

    if (!report || report.deletedAt !== null) {
      throw new NotFoundError("البلاغ المطلوب غير موجود.");
    }

    if (actor.role !== UserRole.ADMIN && report.createdById !== actor.id) {
      throw new ForbiddenError("لا يمكنك تقديم اعتراض على بلاغ مقدم من مواطن آخر.");
    }

    if (report.status !== ReportStatus.RESOLVED && report.status !== ReportStatus.REJECTED) {
      throw new Error("لا يمكن تقديم اعتراض إلا على البلاغات المرفوضة أو المعالجة.");
    }

    if (report.appeals.length > 0) {
      throw new Error("يوجد اعتراض معلق قيد المراجعة بالفعل لهذا البلاغ.");
    }

    // Check 7-calendar-day deadline
    const referenceDate = report.resolvedAt || report.updatedAt;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(referenceDate).getTime() > sevenDaysMs) {
      throw new Error("انتهت المدة المسموح بها لتقديم الاعتراض (7 أيام تقويمية).");
    }

    // Create appeal record
    const appeal = await tx.appeal.create({
      data: {
        reportId: report.id,
        createdById: actor.id,
        reason,
        status: AppealStatus.PENDING,
      },
    });

    // Target status: If REJECTED -> UNDER_REVIEW; If RESOLVED -> REOPENED
    const targetStatus =
      report.status === ReportStatus.REJECTED
        ? ReportStatus.UNDER_REVIEW
        : ReportStatus.REOPENED;

    await tx.report.update({
      where: { id: report.id },
      data: {
        status: targetStatus,
        version: { increment: 1 },
      },
    });

    await tx.reportStatusHistory.create({
      data: {
        reportId: report.id,
        fromStatus: report.status,
        toStatus: targetStatus,
        reason: `تقديم اعتراض من قبل المواطن: ${reason}`,
        changedById: actor.id,
        actorType: "USER",
        metadata: { appealId: appeal.id },
      },
    });

    return appeal;
  });
}

/**
 * Submits citizen satisfaction rating and comment for a resolved or closed report.
 */
export async function submitRating(params: {
  reportId: string;
  score: number;
  comment?: string;
  actor: AuthenticatedUser;
}) {
  const { reportId, score, comment, actor } = params;

  if (score < 1 || score > 5) {
    throw new Error("التقييم يجب أن يكون بين 1 و 5 نجوم.");
  }

  return await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
    });

    if (!report || report.deletedAt !== null) {
      throw new NotFoundError("البلاغ المطلوب غير موجود.");
    }

    if (actor.role !== UserRole.ADMIN && report.createdById !== actor.id) {
      throw new ForbiddenError("لا يمكنك تقييم بلاغ مقدم من مواطن آخر.");
    }

    if (report.status !== ReportStatus.RESOLVED && report.status !== ReportStatus.CLOSED) {
      throw new Error("يمكن تقييم البلاغات المعالجة فقط.");
    }

    // Upsert Rating
    const rating = await tx.rating.upsert({
      where: {
        reportId_createdById: {
          reportId: report.id,
          createdById: actor.id,
        },
      },
      update: {
        score,
        comment,
      },
      create: {
        reportId: report.id,
        createdById: actor.id,
        score,
        comment,
      },
    });

    // If report was RESOLVED, close it
    if (report.status === ReportStatus.RESOLVED) {
      await tx.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.CLOSED,
          closedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: ReportStatus.RESOLVED,
          toStatus: ReportStatus.CLOSED,
          reason: `إغلاق البلاغ بعد تقييم المواطن (${score}/5)`,
          changedById: actor.id,
          actorType: "USER",
        },
      });
    }

    return rating;
  });
}

/**
 * Adds a public update / resident clarification to a report.
 * If report is in WAITING_FOR_RESIDENT and actor is reporter, transitions to IN_PROGRESS.
 */
export async function addReportUpdate(params: {
  reportId: string;
  body: string;
  actor: AuthenticatedUser;
}) {
  const { reportId, body, actor } = params;

  if (!body || body.trim().length < 3) {
    throw new Error("نص التوضيح يجب أن يحتوي على 3 أحرف على الأقل.");
  }

  return await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
    });

    if (!report || report.deletedAt !== null) {
      throw new NotFoundError("البلاغ غير موجود.");
    }

    const update = await tx.reportUpdate.create({
      data: {
        reportId: report.id,
        authorId: actor.id,
        body,
        isPublic: true,
      },
    });

    // Auto-resume flow: If WAITING_FOR_RESIDENT and citizen provided response -> return to IN_PROGRESS
    if (report.status === ReportStatus.WAITING_FOR_RESIDENT && report.createdById === actor.id) {
      await tx.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.IN_PROGRESS,
          version: { increment: 1 },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: ReportStatus.WAITING_FOR_RESIDENT,
          toStatus: ReportStatus.IN_PROGRESS,
          reason: `استئناف العمل بعد استلام توضيح المواطن: ${body.substring(0, 100)}`,
          changedById: actor.id,
          actorType: "USER",
        },
      });
    }

    return update;
  });
}

/**
 * Adds an internal note visible exclusively to authority staff and admins.
 */
export async function addInternalNote(params: {
  reportId: string;
  body: string;
  actor: AuthenticatedUser;
}) {
  const { reportId, body, actor } = params;

  if (actor.role === UserRole.CITIZEN) {
    throw new ForbiddenError("لا يمكنك إضافة ملاحظات داخلية خاصة بالموظفين.");
  }

  if (!body || body.trim().length < 3) {
    throw new Error("نص الملاحظة يجب ألا يقل عن 3 أحرف.");
  }

  return await prisma.internalNote.create({
    data: {
      reportId,
      authorId: actor.id,
      body,
    },
  });
}

/**
 * Cron Job: Automatically closes resolved reports whose 7-day appeal window expired
 * without open appeals.
 */
export async function processExpiredAppealsCron() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find resolved reports past 7 days with no pending appeals
  const expiredReports = await prisma.report.findMany({
    where: {
      status: ReportStatus.RESOLVED,
      resolvedAt: { lte: sevenDaysAgo },
      appeals: {
        none: { status: AppealStatus.PENDING },
      },
    },
    select: { id: true, version: true },
  });

  const closedReportIds: string[] = [];

  for (const report of expiredReports) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.report.update({
          where: { id: report.id },
          data: {
            status: ReportStatus.CLOSED_NO_RESPONSE,
            closedAt: new Date(),
            version: { increment: 1 },
          },
        });

        await tx.reportStatusHistory.create({
          data: {
            reportId: report.id,
            fromStatus: ReportStatus.RESOLVED,
            toStatus: ReportStatus.CLOSED_NO_RESPONSE,
            reason: "إغلاق تلقائي بعد انقضاء مهلة الاعتراض (7 أيام) دون تسجيل أي اعتراض",
            actorType: "SYSTEM_CRON",
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: "CRON",
            action: "AUTO_CLOSE_EXPIRED_APPEAL_WINDOW",
            entityType: "Report",
            entityId: report.id,
          },
        });
      });
      closedReportIds.push(report.id);
    } catch (err) {
      console.error(`Failed to auto-close report ${report.id}:`, err);
    }
  }

  return { closedCount: closedReportIds.length, closedReportIds };
}
