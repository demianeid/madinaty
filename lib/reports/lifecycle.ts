import { ReportStatus, UserRole } from "@prisma/client";

/**
 * Authoritative Madinaty Report Status Definitions (Reconciled in Phase 0 Audit)
 */
export const REPORT_STATUSES = [
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
] as const;

export interface StatusMetadata {
  labelAr: string;
  labelEn: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  isTerminal: boolean;
  slaActive: boolean;
  publiclyVisible: boolean;
}

export const REPORT_STATUS_METADATA: Record<ReportStatus, StatusMetadata> = {
  NEW: {
    labelAr: "جديد",
    labelEn: "New",
    badgeVariant: "default",
    isTerminal: false,
    slaActive: true,
    publiclyVisible: false,
  },
  UNDER_REVIEW: {
    labelAr: "قيد المراجعة والتدقيق",
    labelEn: "Under Review",
    badgeVariant: "secondary",
    isTerminal: false,
    slaActive: true,
    publiclyVisible: false,
  },
  ASSIGNED: {
    labelAr: "تم التعيين للجهة المختصة",
    labelEn: "Assigned",
    badgeVariant: "secondary",
    isTerminal: false,
    slaActive: true,
    publiclyVisible: true,
  },
  IN_PROGRESS: {
    labelAr: "جاري العمل الميداني",
    labelEn: "In Progress",
    badgeVariant: "warning",
    isTerminal: false,
    slaActive: true,
    publiclyVisible: true,
  },
  WAITING_FOR_RESIDENT: {
    labelAr: "بانتظار توضيح من المواطن",
    labelEn: "Waiting for Resident",
    badgeVariant: "warning",
    isTerminal: false,
    slaActive: false, // Paused while waiting for citizen
    publiclyVisible: true,
  },
  RESOLVED: {
    labelAr: "تمت المعالجة والإصلاح",
    labelEn: "Resolved",
    badgeVariant: "success",
    isTerminal: false,
    slaActive: false, // Target met; 7-day appeal window running
    publiclyVisible: true,
  },
  REJECTED: {
    labelAr: "مرفوض مع ذكر السبب",
    labelEn: "Rejected",
    badgeVariant: "destructive",
    isTerminal: true, // Can only exit via appeal
    slaActive: false,
    publiclyVisible: false,
  },
  CLOSED: {
    labelAr: "مغلق نهائياً",
    labelEn: "Closed",
    badgeVariant: "outline",
    isTerminal: true,
    slaActive: false,
    publiclyVisible: true,
  },
  CLOSED_NO_RESPONSE: {
    labelAr: "مغلق لعدم التعقيب",
    labelEn: "Closed (No Response)",
    badgeVariant: "outline",
    isTerminal: true,
    slaActive: false,
    publiclyVisible: true,
  },
  REOPENED: {
    labelAr: "معاد فتحه للاستدراك",
    labelEn: "Reopened",
    badgeVariant: "destructive",
    isTerminal: false,
    slaActive: true,
    publiclyVisible: true,
  },
};

export interface TransitionRule {
  from: ReportStatus | null;
  to: ReportStatus;
  allowedRoles: UserRole[] | "SYSTEM";
  requiresReason?: boolean;
  requiresEvidence?: boolean; // Repair photo + description
}

/**
 * Official Status Transition Rules (From Phase 0 Audit §7.2)
 */
export const ALLOWED_TRANSITIONS: TransitionRule[] = [
  // Creation
  { from: null, to: ReportStatus.NEW, allowedRoles: [UserRole.CITIZEN, UserRole.ADMIN] },

  // From NEW
  { from: ReportStatus.NEW, to: ReportStatus.UNDER_REVIEW, allowedRoles: "SYSTEM" },
  { from: ReportStatus.NEW, to: ReportStatus.UNDER_REVIEW, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.NEW, to: ReportStatus.ASSIGNED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.NEW, to: ReportStatus.REJECTED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresReason: true },

  // From UNDER_REVIEW
  { from: ReportStatus.UNDER_REVIEW, to: ReportStatus.ASSIGNED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.UNDER_REVIEW, to: ReportStatus.REJECTED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresReason: true },

  // From ASSIGNED
  { from: ReportStatus.ASSIGNED, to: ReportStatus.IN_PROGRESS, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.ASSIGNED, to: ReportStatus.UNDER_REVIEW, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresReason: true },

  // From IN_PROGRESS
  { from: ReportStatus.IN_PROGRESS, to: ReportStatus.WAITING_FOR_RESIDENT, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresReason: true },
  { from: ReportStatus.IN_PROGRESS, to: ReportStatus.RESOLVED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresEvidence: true },

  // From WAITING_FOR_RESIDENT
  { from: ReportStatus.WAITING_FOR_RESIDENT, to: ReportStatus.IN_PROGRESS, allowedRoles: [UserRole.CITIZEN, UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.WAITING_FOR_RESIDENT, to: ReportStatus.UNDER_REVIEW, allowedRoles: [UserRole.STAFF, UserRole.ADMIN], requiresReason: true },

  // From RESOLVED
  { from: ReportStatus.RESOLVED, to: ReportStatus.CLOSED, allowedRoles: [UserRole.CITIZEN, UserRole.ADMIN] },
  { from: ReportStatus.RESOLVED, to: ReportStatus.CLOSED_NO_RESPONSE, allowedRoles: "SYSTEM" },
  { from: ReportStatus.RESOLVED, to: ReportStatus.REOPENED, allowedRoles: [UserRole.CITIZEN, UserRole.ADMIN], requiresReason: true },

  // From REJECTED
  { from: ReportStatus.REJECTED, to: ReportStatus.UNDER_REVIEW, allowedRoles: [UserRole.CITIZEN, UserRole.ADMIN], requiresReason: true },

  // From CLOSED / CLOSED_NO_RESPONSE
  { from: ReportStatus.CLOSED, to: ReportStatus.REOPENED, allowedRoles: [UserRole.ADMIN, UserRole.CITIZEN], requiresReason: true },
  { from: ReportStatus.CLOSED_NO_RESPONSE, to: ReportStatus.REOPENED, allowedRoles: [UserRole.ADMIN, UserRole.CITIZEN], requiresReason: true },

  // From REOPENED
  { from: ReportStatus.REOPENED, to: ReportStatus.UNDER_REVIEW, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
  { from: ReportStatus.REOPENED, to: ReportStatus.ASSIGNED, allowedRoles: [UserRole.STAFF, UserRole.ADMIN] },
];

/**
 * Validates whether a requested transition is allowed according to the authoritative transition matrix.
 */
export function validateTransition(
  fromStatus: ReportStatus | null,
  toStatus: ReportStatus,
  actorRole: UserRole | "SYSTEM",
  options?: { reason?: string; hasEvidence?: boolean }
): { allowed: boolean; error?: string } {
  const rule = ALLOWED_TRANSITIONS.find((t) => {
    if (t.from !== fromStatus || t.to !== toStatus) return false;
    if (t.allowedRoles === "SYSTEM") return actorRole === "SYSTEM";
    if (actorRole === "SYSTEM") return false;
    return t.allowedRoles.includes(actorRole);
  });

  if (!rule) {
    return {
      allowed: false,
      error: `الانتقال من الحالة (${fromStatus || "إنشاء"}) إلى الحالة (${toStatus}) غير مسموح للدور (${actorRole}).`,
    };
  }

  if (rule.requiresReason && (!options?.reason || options.reason.trim().length < 5)) {
    return {
      allowed: false,
      error: "يتطلب هذا التغيير إدخال سبب واضح (لا يقل عن 5 أحرف).",
    };
  }

  if (rule.requiresEvidence && !options?.hasEvidence) {
    return {
      allowed: false,
      error: "لا يمكن وضع علامة معالجة (RESOLVED) دون توثيق أعمال الإصلاح وإرفاق الصور أو مستند الإثبات.",
    };
  }

  return { allowed: true };
}

/**
 * Generates a unique, non-sequential public reference string.
 * Format: "MD-XXXX-XXXX" using unambiguous uppercase alphanumeric characters.
 */
export function generatePublicReference(): string {
  // Crockford Base32-inspired alphabet excluding ambiguous characters: 0, O, 1, I, L
  const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  let part1 = "";
  let part2 = "";

  for (let i = 0; i < 4; i++) {
    part1 += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    part2 += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return `MD-${part1}-${part2}`;
}
