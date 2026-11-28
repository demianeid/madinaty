import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { UserRole, MembershipRole, UserStatus, AlexandriaSector } from "@prisma/client";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "غير مصرح. يرجى تسجيل الدخول أولاً.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "العنصر المطلوب غير موجود.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  preferredLocale: string;
}

/**
 * Validates the current session and ensures the user account is active.
 * Throws UnauthorizedError if unauthenticated or suspended.
 */
export async function requireUser(customHeaders?: Headers): Promise<AuthenticatedUser> {
  const reqHeaders = customHeaders ?? (await headers());
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    throw new UnauthorizedError("جلسة غير صالحة. يرجى تسجيل الدخول.");
  }

  // Fast-path: check user status directly from database to enforce immediate revocation
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      preferredLocale: true,
      deletedAt: true,
    },
  });

  if (!dbUser || dbUser.deletedAt !== null) {
    throw new UnauthorizedError("الحساب غير موجود أو تم حذفه.");
  }

  if (dbUser.status === UserStatus.SUSPENDED) {
    throw new ForbiddenError("تم تجميد هذا الحساب من قبل الإدارة.");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    status: dbUser.status,
    preferredLocale: dbUser.preferredLocale,
  };
}

/**
 * Centralized role guard: ensures the authenticated user has one of the allowed roles.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  customHeaders?: Headers
): Promise<AuthenticatedUser> {
  const user = await requireUser(customHeaders);

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `غير مصرح لهذا الدور (${user.role}). الأدوار المسموح بها: ${allowedRoles.join(", ")}`
    );
  }

  return user;
}

/**
 * System administrator guard: ensures the authenticated user is an ADMIN.
 */
export async function requireAdmin(customHeaders?: Headers): Promise<AuthenticatedUser> {
  return requireRole([UserRole.ADMIN], customHeaders);
}

/**
 * Authority scope guard: ensures the authenticated user is either a system ADMIN,
 * or active STAFF with valid membership in the specified authority.
 */
export async function requireAuthorityScope(
  authorityId: string,
  minMembershipRole?: MembershipRole,
  customHeaders?: Headers
): Promise<{ user: AuthenticatedUser; membershipRole?: MembershipRole }> {
  const user = await requireUser(customHeaders);

  // System Administrators bypass authority scoping
  if (user.role === UserRole.ADMIN) {
    return { user };
  }

  if (user.role !== UserRole.STAFF) {
    throw new ForbiddenError("يتطلب هذا الإجراء صلاحيات موظف جهة مختصة.");
  }

  const membership = await prisma.authorityMembership.findUnique({
    where: {
      userId_authorityId: {
        userId: user.id,
        authorityId,
      },
    },
    select: {
      membershipRole: true,
      isActive: true,
      authority: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!membership || !membership.isActive || !membership.authority.isActive) {
    throw new ForbiddenError("لا تملك عضوية نشطة في هذه الجهة أو أن الجهة غير نشطة حالياً.");
  }

  if (minMembershipRole) {
    const roleRank: Record<MembershipRole, number> = {
      VIEWER: 1,
      OPERATOR: 2,
      TRIAGE: 3,
      AUTHORITY_ADMIN: 4,
    };

    if (roleRank[membership.membershipRole] < roleRank[minMembershipRole]) {
      throw new ForbiddenError("مستوى صلاحية العضوية غير كافٍ لتنفيذ هذا الإجراء.");
    }
  }

  return { user, membershipRole: membership.membershipRole };
}

export type ReportAccessAction = "READ" | "UPDATE" | "TRANSITION" | "DELETE" | "ADD_INTERNAL_NOTE";

/**
 * Server-side guard to prevent Insecure Direct Object Reference (IDOR) attacks.
 * Enforces ownership for Citizens and jurisdiction for Authority Staff.
 */
export async function requireReportAccess(
  reportId: string,
  action: ReportAccessAction,
  customHeaders?: Headers
): Promise<{ user: AuthenticatedUser; report: { id: string; createdById: string; authorityId: string | null; status: string } }> {
  const user = await requireUser(customHeaders);

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      createdById: true,
      authorityId: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!report || report.deletedAt !== null) {
    throw new NotFoundError("البلاغ المطلوب غير موجود.");
  }

  // Admins have global access
  if (user.role === UserRole.ADMIN) {
    return { user, report };
  }

  // Citizen access check
  if (user.role === UserRole.CITIZEN) {
    if (report.createdById !== user.id) {
      throw new ForbiddenError("لا يمكنك الوصول إلى بلاغ مقدم من قبل مواطن آخر.");
    }

    if (action === "ADD_INTERNAL_NOTE") {
      throw new ForbiddenError("لا تملك صلاحية كتابة ملاحظات داخلية للموظفين.");
    }

    return { user, report };
  }

  // Staff access check
  if (user.role === UserRole.STAFF) {
    if (!report.authorityId) {
      // Unassigned reports can only be viewed/triaged by triage staff with global permissions or admins
      throw new ForbiddenError("هذا البلاغ لم يتم تعيينه لجهة بعد.");
    }

    await requireAuthorityScope(report.authorityId, undefined, customHeaders);
    return { user, report };
  }

  throw new ForbiddenError("تم رفض الوصول إلى هذا البلاغ.");
}

export interface StaffManagementScope {
  user: AuthenticatedUser;
  isSuperAdmin: boolean;
  membership: {
    id: string;
    authorityId: string;
    sector: AlexandriaSector | null;
    authority: { id: string; nameAr: string; slug: string; isActive: boolean };
  } | null;
}

/**
 * Guard for Staff Management endpoints:
 * - Allows Super Admin (UserRole.ADMIN) across all authorities & sectors.
 * - Allows Sector Authority Admin (MembershipRole.AUTHORITY_ADMIN) strictly within their authority & sector.
 */
export async function requireStaffManagementScope(
  customHeaders?: Headers
): Promise<StaffManagementScope> {
  const user = await requireUser(customHeaders);

  if (user.role === UserRole.ADMIN) {
    return { user, isSuperAdmin: true, membership: null };
  }

  if (user.role === UserRole.STAFF) {
    const membership = await prisma.authorityMembership.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        membershipRole: MembershipRole.AUTHORITY_ADMIN,
      },
      select: {
        id: true,
        authorityId: true,
        sector: true,
        authority: {
          select: { id: true, nameAr: true, slug: true, isActive: true },
        },
      },
    });

    if (membership && membership.authority.isActive) {
      return { user, isSuperAdmin: false, membership };
    }
  }

  throw new ForbiddenError("يتطلب هذا الإجراء صلاحيات مدير النظام أو المدير الإداري للقطاع.");
}
