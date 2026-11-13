import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const authorities = await prisma.authority.findMany({
      orderBy: { nameAr: "asc" },
      include: {
        _count: {
          select: {
            memberships: { where: { isActive: true } },
            reports: { where: { deletedAt: null } },
            categories: { where: { isActive: true } },
          },
        },
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true, status: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      authorities: authorities.map((a) => ({
        id: a.id,
        slug: a.slug,
        nameAr: a.nameAr,
        name: a.name,
        contactEmail: a.contactEmail,
        description: a.description,
        isActive: a.isActive,
        activeStaffCount: a._count.memberships,
        reportsCount: a._count.reports,
        categoriesCount: a._count.categories,
        members: a.memberships.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          membershipRole: m.membershipRole,
        })),
      })),
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "فشل جلب قائمة الجهات المختصة.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
