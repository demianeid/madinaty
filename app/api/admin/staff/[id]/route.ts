import { NextRequest, NextResponse } from "next/server";
import { requireStaffManagementScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "better-auth/crypto";
import { AlexandriaSector, MembershipRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const updateStaffSchema = z.object({
  isActive: z.boolean().optional(),
  membershipRole: z
    .enum([MembershipRole.AUTHORITY_ADMIN, MembershipRole.TRIAGE, MembershipRole.OPERATOR])
    .optional(),
  sector: z.nativeEnum(AlexandriaSector).optional(),
  assignedAreaId: z.string().nullable().optional(),
  newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireStaffManagementScope(req.headers);
    const { id } = await context.params;
    const raw = await req.json();
    const parsed = updateStaffSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "بيانات التحديث غير صالحة." },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const target = await prisma.authorityMembership.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, status: true } } },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "سجل الموظف غير موجود." }, { status: 404 });
    }

    // IDOR & sector enforcement for AUTHORITY_ADMIN
    if (!scope.isSuperAdmin) {
      if (
        !scope.membership ||
        target.authorityId !== scope.membership.authorityId ||
        (scope.membership.sector && target.sector !== scope.membership.sector)
      ) {
        return NextResponse.json(
          { success: false, error: "لا تملك صلاحية تعديل موظف خارج جهتك أو قطاعك." },
          { status: 403 }
        );
      }

      if (
        target.membershipRole === MembershipRole.AUTHORITY_ADMIN ||
        input.membershipRole === MembershipRole.AUTHORITY_ADMIN
      ) {
        return NextResponse.json(
          { success: false, error: "لا يملك مدير القطاع صلاحية تعديل أو ترقية مدراء القطاعات." },
          { status: 403 }
        );
      }

      if (input.sector && input.sector !== scope.membership.sector) {
        return NextResponse.json(
          { success: false, error: "لا يمكنك نقل موظف إلى قطاع آخر." },
          { status: 403 }
        );
      }
    }

    const effectiveSector = scope.isSuperAdmin && input.sector ? input.sector : target.sector;

    if (input.assignedAreaId) {
      const district = await prisma.serviceArea.findUnique({
        where: { id: input.assignedAreaId },
        select: { id: true, sector: true, isActive: true },
      });
      if (!district || !district.isActive || (effectiveSector && district.sector !== effectiveSector)) {
        return NextResponse.json(
          { success: false, error: "الحي المختار لا ينتمي إلى القطاع المحدد." },
          { status: 400 }
        );
      }
    }

    const hashedPassword = input.newPassword ? await hashPassword(input.newPassword) : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (typeof input.isActive === "boolean") {
        await tx.user.update({
          where: { id: target.userId },
          data: { status: input.isActive ? UserStatus.ACTIVE : UserStatus.SUSPENDED },
        });
      }

      if (hashedPassword) {
        await tx.account.updateMany({
          where: { userId: target.userId, providerId: "credential" },
          data: { password: hashedPassword },
        });
      }

      const membership = await tx.authorityMembership.update({
        where: { id: target.id },
        data: {
          ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
          ...(input.membershipRole ? { membershipRole: input.membershipRole } : {}),
          ...(scope.isSuperAdmin && input.sector ? { sector: input.sector } : {}),
          ...(input.assignedAreaId !== undefined ? { assignedAreaId: input.assignedAreaId } : {}),
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
          action: "STAFF_UPDATED",
          entityType: "AuthorityMembership",
          entityId: membership.id,
          metadata: {
            isActive: input.isActive,
            membershipRole: input.membershipRole,
            sector: effectiveSector,
            passwordReset: Boolean(hashedPassword),
          },
        },
      });

      return membership;
    });

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تحديث بيانات الموظف.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
