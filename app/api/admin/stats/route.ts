import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalReports,
      statusGroups,
      totalUsers,
      roleGroups,
      totalAuthorities,
      totalCategories,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.report.count({ where: { deletedAt: null } }),
      prisma.report.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      prisma.authority.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: {
            select: { name: true, email: true, role: true },
          },
        },
      }),
    ]);

    const reportsByStatus: Record<string, number> = {};
    for (const group of statusGroups) {
      reportsByStatus[group.status] = group._count._all;
    }

    const usersByRole: Record<string, number> = {};
    for (const group of roleGroups) {
      usersByRole[group.role] = group._count._all;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalReports,
        reportsByStatus,
        totalUsers,
        usersByRole,
        totalAuthorities,
        totalCategories,
        recentAuditLogs,
      },
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "فشل جلب إحصائيات النظام.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

