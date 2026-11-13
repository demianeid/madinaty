import { prisma } from "@/lib/db/prisma";
import { generatePublicReference, validateTransition } from "@/lib/reports/lifecycle";
import { AuthenticatedUser, ForbiddenError, NotFoundError } from "@/lib/auth/guards";
import { validateReportCoordinates, DEFAULT_SERVICE_BOUNDARY } from "@/lib/reports/bounds";
import { inspectReportWithGemini } from "@/lib/ai/gemini";
import { readStoredMedia } from "@/lib/media/storage";
import {
  ReportStatus,
  ReportPriority,
  ReportVisibility,
  UserRole,
  AppealStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

export const createReportSchema = z.object({
  title: z
    .string()
    .min(5, "يجب أن يكون عنوان البلاغ 5 أحرف على الأقل")
    .max(100, "العنوان يجب ألا يتجاوز 100 حرف"),
  description: z
    .string()
    .min(5, "يرجى كتابة وصف مختصر للمشكلة (5 أحرف على الأقل)")
    .max(2000, "الوصف لا يتجاوز 2000 حرف"),
  categoryId: z.string().min(1, "يرجى اختيار تصنيف البلاغ"),
  latitude: z.number().refine((lat) => lat >= -90 && lat <= 90, "إحداثيات العرض غير صحيحة"),
  longitude: z.number().refine((lng) => lng >= -180 && lng <= 180, "إحداثيات الطول غير صحيحة"),
  addressText: z.string().optional().default(""),
  mediaIds: z
    .array(z.string())
    .min(1, "يرجى إرفاق صورة واحدة على الأقل توثق المشكلة البلدية")
    .max(5, "الحد الأقصى للصور هو 5 صور"),
  idempotencyKey: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Validates whether coordinates fall within the municipal service boundary.
 */
export function isWithinServiceBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= DEFAULT_SERVICE_BOUNDARY.minLat &&
    latitude <= DEFAULT_SERVICE_BOUNDARY.maxLat &&
    longitude >= DEFAULT_SERVICE_BOUNDARY.minLng &&
    longitude <= DEFAULT_SERVICE_BOUNDARY.maxLng
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
  const coordsValidation = validateReportCoordinates(input.latitude, input.longitude);
  if (!coordsValidation.valid) {
    throw new Error(
      coordsValidation.error || "الموقع المحدد يقع خارج النطاق الجغرافي المعتمد لخدمات البلدية حالياً."
    );
  }

  // Verify category exists and get default authority routing
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, key: true, labelAr: true, defaultAuthorityId: true, isActive: true },
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

  const createdReport = await prisma.$transaction(async (tx) => {
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

    // 5. In-App Notification: Notify citizen that their report was successfully created
    await tx.notification.create({
      data: {
        userId: actor.id,
        reportId: report.id,
        type: "REPORT_CREATED",
        title: `تم استلام بلاغك بنجاح #${report.publicReference}`,
        body: `تم تسجيل بلاغك "${report.title}" وسيتم فحصه وتوجيهه للجهة البلدية المختصة لمباشرة المعالجة الميدانية.`,
        deliveries: {
          create: {
            channel: "IN_APP",
            status: "SENT",
            sentAt: new Date(),
            attemptCount: 1,
          },
        },
      },
    });

    return report;
  });

  // 6. Post-creation Gemini validation (Blueprint §8, Backlog Task 3.3.2 & 3.3.3)
  try {
    const activeCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { key: true, labelAr: true, descriptionAr: true },
    });

    const mediaList =
      input.mediaIds && input.mediaIds.length > 0
        ? await prisma.reportMedia.findMany({
            where: { id: { in: input.mediaIds } },
            select: { id: true, storageKey: true, mimeType: true },
          })
        : [];

    const mediaMap = new Map(mediaList.map((m) => [m.id, m]));
    const orderedMediaList = input.mediaIds
      ? input.mediaIds.map((id) => mediaMap.get(id)).filter(Boolean)
      : [];

    const imageBuffers: { buffer: Buffer; mimeType: string }[] = [];
    for (const m of orderedMediaList) {
      if (!m) continue;
      try {
        const { buffer } = await readStoredMedia(m.storageKey);
        imageBuffers.push({ buffer, mimeType: m.mimeType });
      } catch {
        // If image reading fails, continue
      }
    }

    const aiResult = await inspectReportWithGemini({
      title: input.title,
      description: input.description,
      categoryKey: category.key,
      categoryLabel: category.labelAr,
      availableCategories: activeCategories.map((c) => ({
        key: c.key,
        labelAr: c.labelAr,
        descriptionAr: c.descriptionAr || undefined,
      })),
      imageBuffers,
    });

    // AI Automated Routing and Rejection:
    // If AI is INVALID (confirmed non-municipal content like ads, pets, food), reject immediately
    // If AI is UNCERTAIN, route to UNDER_REVIEW for human triage
    // If AI is VALID, keep as NEW
    let finalStatus: ReportStatus = ReportStatus.NEW;
    let reviewState = "PASSED";

    if (aiResult.verdict === "INVALID") {
      finalStatus = ReportStatus.REJECTED;
      reviewState = "REJECTED_AUTOMATED";
    } else if (aiResult.verdict === "UNCERTAIN") {
      finalStatus = ReportStatus.UNDER_REVIEW;
      reviewState = "PENDING_REVIEW";
    }

    const updated = await prisma.report.update({
      where: { id: createdReport.id },
      data: {
        status: finalStatus,
        aiValidationResult: aiResult.verdict,
        aiConfidence: aiResult.confidence,
        aiReviewState: reviewState,
      },
    });

    if (finalStatus !== ReportStatus.NEW) {
      await prisma.reportStatusHistory.create({
        data: {
          reportId: createdReport.id,
          fromStatus: ReportStatus.NEW,
          toStatus: finalStatus,
          changedById: actor.id,
          actorType: "SYSTEM",
          reason:
            finalStatus === ReportStatus.REJECTED
              ? `رفض آلي بواسطة نظام الفحص الذكي: ${aiResult.reason}`
              : `نظام الفحص الذكي: ${aiResult.reason}`,
        },
      });
    }

    return updated;
  } catch {
    // Fail-safe guarantee: return the created report even if Gemini inspection encounters unexpected error
    return createdReport;
  }
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

    // 10. In-App Notification: Notify citizen about status transition
    const statusNotifications: Partial<Record<ReportStatus, { title: string; body: string }>> = {
      [ReportStatus.ASSIGNED]: {
        title: `تم إسناد بلاغك #${report.publicReference}`,
        body: `تم إسناد البلاغ إلى ${report.authority?.nameAr || "الجهة البلدية المختصة"} لبدء إجراءات الفحص الميداني.`,
      },
      [ReportStatus.IN_PROGRESS]: {
        title: `جاري العمل على معالجة بلاغك #${report.publicReference}`,
        body: `بدأت الفرق الميدانية التابعة للبلدية في تنفيذ أعمال الإصلاح والمعالجة.`,
      },
      [ReportStatus.WAITING_FOR_RESIDENT]: {
        title: `استفسار مطلوب بخصوص بلاغك #${report.publicReference}`,
        body: reason || "يرجى مراجعة تفاصيل البلاغ وتقديم المعلومات أو الإيضاحات المطلوبة لتسريع الحل.",
      },
      [ReportStatus.RESOLVED]: {
        title: `تم حل البلاغ وإصلاح العطل #${report.publicReference}`,
        body: repairDescription
          ? `تم إنجاز المعالجة بنجاح: ${repairDescription} (يمكنك الاعتراض خلال 7 أيام إذا لم تكن المعالجة مكتملة).`
          : "أفادت البلدية باكتمال معالجة المشكلة. يمكنك الاطلاع على صور ومحضر الإصلاح وتقييم الخدمة.",
      },
      [ReportStatus.REJECTED]: {
        title: `تعذر قبول البلاغ #${report.publicReference}`,
        body: reason || "تم فحص البلاغ ومراجعة المعايير البلدية وتقرر عدم قبوله. يمكنك تقديم اعتراض خلال 7 أيام.",
      },
      [ReportStatus.CLOSED]: {
        title: `إغلاق ملف البلاغ #${report.publicReference}`,
        body: `تم إغلاق البلاغ نهائياً بعد استيفاء كافة المراحل والإجراءات الميدانية.`,
      },
      [ReportStatus.CLOSED_NO_RESPONSE]: {
        title: `إغلاق البلاغ تلقائياً #${report.publicReference}`,
        body: `تم إغلاق البلاغ بعد انقضاء مهلة الـ 7 أيام دون تسجيل أي اعتراض. نشكركم على تعاونكم.`,
      },
      [ReportStatus.REOPENED]: {
        title: `إعادة فتح بلاغك #${report.publicReference}`,
        body: `بناءً على طلب المراجعة، تمت إعادة فتح البلاغ لمزيد من التدقيق والعمل الميداني.`,
      },
    };

    const notifInfo = statusNotifications[toStatus];
    if (notifInfo && report.createdById) {
      await tx.notification.create({
        data: {
          userId: report.createdById,
          reportId: report.id,
          type:
            toStatus === ReportStatus.RESOLVED
              ? "REPORT_RESOLVED"
              : toStatus === ReportStatus.REJECTED
              ? "REPORT_REJECTED"
              : toStatus === ReportStatus.WAITING_FOR_RESIDENT
              ? "INFO_REQUESTED"
              : "STATUS_CHANGED",
          title: notifInfo.title,
          body: notifInfo.body,
          deliveries: {
            create: {
              channel: "IN_APP",
              status: "SENT",
              sentAt: new Date(),
              attemptCount: 1,
            },
          },
        },
      });
    }

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

    // In-App Notification: Confirm appeal received to citizen
    await tx.notification.create({
      data: {
        userId: actor.id,
        reportId: report.id,
        type: "APPEAL_SUBMITTED",
        title: `تم استلام اعتراضك على البلاغ #${report.publicReference}`,
        body: `تم تسجيل طلب الاعتراض وإعادة فتح البلاغ لمراجعة أسباب الاعتراض بواسطة الإدارة الإشرافية.`,
        deliveries: {
          create: {
            channel: "IN_APP",
            status: "SENT",
            sentAt: new Date(),
            attemptCount: 1,
          },
        },
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
    select: { id: true, version: true, createdById: true, publicReference: true },
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

        // In-App Notification: Notify citizen of auto-close
        if (report.createdById) {
          await tx.notification.create({
            data: {
              userId: report.createdById,
              reportId: report.id,
              type: "AUTO_CLOSED",
              title: `إغلاق البلاغ نهائياً #${report.publicReference}`,
              body: `تم إغلاق البلاغ رسمياً بعد انقضاء مهلة الـ 7 أيام دون تسجيل أي اعتراض. نشكركم على مساهمتكم في تحسين المدينة.`,
              deliveries: {
                create: {
                  channel: "IN_APP",
                  status: "SENT",
                  sentAt: new Date(),
                  attemptCount: 1,
                },
              },
            },
          });
        }
      });
      closedReportIds.push(report.id);
    } catch (err) {
      console.error(`Failed to auto-close report ${report.id}:`, err);
    }
  }

  return { closedCount: closedReportIds.length, closedReportIds };
}
