import { NextRequest, NextResponse } from "next/server";
import { requireStaffManagementScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "better-auth/crypto";
import { AlexandriaSector, MembershipRole, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(80),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").toLowerCase(),
  phoneNumber: z.string().trim().max(25).optional().or(z.literal("")),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  membershipRole: z.enum([
    MembershipRole.AUTHORITY_ADMIN,
    MembershipRole.TRIAGE,
    MembershipRole.OPERATOR,
  ]),
  authorityId: z.string().optional(),
  sector: z.nativeEnum(AlexandriaSector).optional(),
  assignedAreaId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const scope = await requireStaffManagementScope(req.headers);
    const { searchParams } = new URL(req.url);

    const authorityFilter = searchParams.get("authorityId");
    const sectorFilter = searchParams.get("sector") as AlexandriaSector | null;
    const roleFilter = searchParams.get("membershipRole") as MembershipRole | null;

    const where: Record<string, unknown> = {};

    if (scope.isSuperAdmin) {
      if (authorityFilter) where.authorityId = authorityFilter;
      if (sectorFilter && Object.values(AlexandriaSector).includes(sectorFilter)) {
        where.sector = sectorFilter;
      }
    } else if (scope.membership) {
      // Strict sector & authority scoping for AUTHORITY_ADMIN
      where.authorityId = scope.membership.authorityId;
      if (scope.membership.sector) {
        where.sector = scope.membership.sector;
      }
    }

    if (roleFilter && Object.values(MembershipRole).includes(roleFilter)) {
      where.membershipRole = roleFilter;
    }

    const [staff, authorities, districts] = await Promise.all([
      prisma.authorityMembership.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              status: true,
              role: true,
              createdAt: true,
            },
          },
          authority: {
            select: { id: true, nameAr: true, slug: true },
          },
          assignedArea: {
            select: { id: true, code: true, nameAr: true, sector: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.authority.findMany({
        where: scope.isSuperAdmin
          ? { isActive: true }
          : { id: scope.membership?.authorityId },
        select: { id: true, nameAr: true, slug: true },
        orderBy: { nameAr: "asc" },
      }),
      prisma.serviceArea.findMany({
        where: {
          isActive: true,
          ...(!scope.isSuperAdmin && scope.membership?.sector
            ? { sector: scope.membership.sector }
            : {}),
        },
        select: { id: true, code: true, nameAr: true, sector: true },
        orderBy: { nameAr: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      isSuperAdmin: scope.isSuperAdmin,
      scopeAuthority: scope.membership?.authority ?? null,
      scopeSector: scope.membership?.sector ?? null,
      staff,
      authorities,
      districts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب قائمة الموظفين.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const scope = await requireStaffManagementScope(req.headers);
    const raw = await req.json();
    const parsed = createStaffSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "بيانات غير صالحة." },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Enforce authority, sector, and role rules
    let targetAuthorityId: string;
    let targetSector: AlexandriaSector;

    if (scope.isSuperAdmin) {
      if (!input.authorityId) {
        return NextResponse.json({ success: false, error: "يرجى اختيار الجهة المختصة." }, { status: 400 });
      }
      if (!input.sector) {
        return NextResponse.json({ success: false, error: "يرجى تحديد القطاع." }, { status: 400 });
      }
      const authExists = await prisma.authority.findUnique({
        where: { id: input.authorityId },
        select: { id: true, isActive: true },
      });
      if (!authExists || !authExists.isActive) {
        return NextResponse.json({ success: false, error: "الجهة المختصة غير موجودة أو غير نشطة." }, { status: 400 });
      }
      targetAuthorityId = input.authorityId;
      targetSector = input.sector;
    } else {
      if (!scope.membership || !scope.membership.sector) {
        return NextResponse.json(
          { success: false, error: "حساب مدير القطاع غير مرتبط بقطاع محدد." },
          { status: 403 }
        );
      }
      if (input.membershipRole === MembershipRole.AUTHORITY_ADMIN) {
        return NextResponse.json(
          { success: false, error: "لا يملك مدير القطاع صلاحية إنشاء مدير قطاع آخر." },
          { status: 403 }
        );
      }
      targetAuthorityId = scope.membership.authorityId;
      targetSector = scope.membership.sector;
    }

    // Validate assigned district belongs to targetSector if provided
    let targetAreaId: string | null = null;
    if (input.assignedAreaId) {
      const district = await prisma.serviceArea.findUnique({
        where: { id: input.assignedAreaId },
        select: { id: true, sector: true, isActive: true },
      });
      if (!district || !district.isActive || district.sector !== targetSector) {
        return NextResponse.json(
          { success: false, error: "الحي المختار لا ينتمي إلى القطاع المحدد." },
          { status: 400 }
        );
      }
      targetAreaId = district.id;
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني مسجل مسبقاً في النظام." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(input.password);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber || null,
          emailVerified: true,
          role: UserRole.STAFF,
          status: UserStatus.ACTIVE,
          preferredLocale: "ar",
        },
      });

      await tx.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        },
      });

      const membership = await tx.authorityMembership.create({
        data: {
          userId: user.id,
          authorityId: targetAuthorityId,
          membershipRole: input.membershipRole,
          sector: targetSector,
          assignedAreaId: targetAreaId,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              status: true,
              role: true,
              createdAt: true,
            },
          },
          authority: { select: { id: true, nameAr: true, slug: true } },
          assignedArea: { select: { id: true, code: true, nameAr: true, sector: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: scope.user.id,
          actorType: "USER",
          action: "STAFF_CREATED",
          entityType: "AuthorityMembership",
          entityId: membership.id,
          metadata: {
            createdEmail: user.email,
            authorityId: targetAuthorityId,
            sector: targetSector,
            membershipRole: input.membershipRole,
            assignedAreaId: targetAreaId,
          },
        },
      });

      return membership;
    });

    return NextResponse.json({ success: true, staff: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء حساب الموظف.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
