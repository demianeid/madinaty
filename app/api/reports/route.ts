import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createReport } from "@/lib/reports/service";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const report = await createReport(body, user);
    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء البلاغ.";
    const status = (error as { status?: number }).status || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const statusFilter = searchParams.get("status");
    const categoryFilter = searchParams.get("categoryId");

    const whereClause: Record<string, unknown> = {
      deletedAt: null,
    };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (categoryFilter) {
      whereClause.categoryId = categoryFilter;
    }

    // Role-based visibility scoping
    if (user.role === UserRole.CITIZEN) {
      whereClause.createdById = user.id;
    } else if (user.role === UserRole.STAFF) {
      // Find staff's active authorities
      const memberships = await prisma.authorityMembership.findMany({
        where: { userId: user.id, isActive: true },
        select: { authorityId: true },
      });
      const authorityIds = memberships.map((m) => m.authorityId);
      whereClause.authorityId = { in: authorityIds };
    }
    // Admins have no whereClause restriction

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        category: {
          select: { key: true, labelAr: true, labelEn: true },
        },
        authority: {
          select: { slug: true, nameAr: true },
        },
        media: {
          select: { id: true, storageKey: true, mimeType: true, isResolutionPhoto: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب قائمة البلاغات.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
