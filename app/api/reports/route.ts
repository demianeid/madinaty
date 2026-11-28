import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createReport } from "@/lib/reports/service";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const report = await createReport(body, user);
    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error: unknown) {
    // Zod validation errors → extract the first Arabic message cleanly
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const message = firstIssue?.message || "البيانات المدخلة غير صحيحة، يرجى التحقق من جميع الحقول.";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
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
    const sectorFilter = searchParams.get("sector");
    const authoritySlugFilter = searchParams.get("authoritySlug");
    const serviceAreaFilter = searchParams.get("serviceAreaId");
    const searchQuery = searchParams.get("q");

    const whereClause: Record<string, unknown> = {
      deletedAt: null,
    };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (categoryFilter) {
      whereClause.categoryId = categoryFilter;
    }
    if (sectorFilter) {
      whereClause.sector = sectorFilter;
    }
    if (authoritySlugFilter) {
      whereClause.authority = { slug: authoritySlugFilter };
    }
    if (serviceAreaFilter) {
      whereClause.serviceAreaId = serviceAreaFilter;
    }
    if (searchQuery && searchQuery.trim().length > 0) {
      whereClause.OR = [
        { title: { contains: searchQuery.trim(), mode: "insensitive" } },
        { publicReference: { contains: searchQuery.trim().toUpperCase(), mode: "insensitive" } },
        { description: { contains: searchQuery.trim(), mode: "insensitive" } },
      ];
    }

    let staffContext: {
      authorityName: string;
      sector: string | null;
      membershipRole: string;
      assignedAreaName: string | null;
    } | null = null;

    // Base scope clause (without user filters) for stable summary counts
    const scopeWhere: Record<string, unknown> = {
      deletedAt: null,
    };

    // Role-based visibility scoping
    if (user.role === UserRole.CITIZEN) {
      whereClause.createdById = user.id;
      scopeWhere.createdById = user.id;
    } else if (user.role === UserRole.STAFF) {
      // Find staff's active memberships (including sector & assigned district)
      const memberships = await prisma.authorityMembership.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          authorityId: true,
          sector: true,
          membershipRole: true,
          authority: { select: { nameAr: true } },
          assignedArea: { select: { nameAr: true } },
        },
      });

      if (memberships.length > 0) {
        const primary = memberships[0];
        staffContext = {
          authorityName: primary.authority.nameAr,
          sector: primary.sector,
          membershipRole: primary.membershipRole,
          assignedAreaName: primary.assignedArea?.nameAr ?? null,
        };
      }

      if (memberships.length === 0) {
        whereClause.authorityId = { in: [] };
        scopeWhere.authorityId = { in: [] };
      } else {
        whereClause.OR = [
          ...(Array.isArray(whereClause.OR) ? whereClause.OR : []),
        ];
        // Scope each membership to its authority (and sector if assigned)
        const scopeFilters = memberships.map((m) =>
          m.sector ? { authorityId: m.authorityId, sector: m.sector } : { authorityId: m.authorityId }
        );
        scopeWhere.OR = scopeFilters;
        // Combine with existing search OR if present using AND
        if (searchQuery && searchQuery.trim().length > 0) {
          delete whereClause.OR;
          whereClause.AND = [
            {
              OR: [
                { title: { contains: searchQuery.trim(), mode: "insensitive" } },
                { publicReference: { contains: searchQuery.trim().toUpperCase(), mode: "insensitive" } },
                { description: { contains: searchQuery.trim(), mode: "insensitive" } },
              ],
            },
            { OR: scopeFilters },
          ];
        } else {
          whereClause.OR = scopeFilters;
        }
      }
    }
    // Admins have no whereClause restriction

    const [reports, groupedCounts] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        include: {
          category: {
            select: { key: true, labelAr: true, labelEn: true },
          },
          authority: {
            select: { slug: true, nameAr: true },
          },
          createdBy: {
            select: { name: true, email: true, phoneNumber: true },
          },
          media: {
            select: { id: true, storageKey: true, mimeType: true, isResolutionPhoto: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.report.groupBy({
        by: ["status"],
        where: scopeWhere,
        _count: { _all: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    let totalAll = 0;
    for (const row of groupedCounts) {
      statusMap[row.status] = row._count._all;
      totalAll += row._count._all;
    }

    const summaryCounts = {
      total: totalAll,
      new: statusMap["NEW"] || 0,
      inProgress: (statusMap["IN_PROGRESS"] || 0) + (statusMap["ASSIGNED"] || 0),
      waiting: statusMap["WAITING_FOR_RESIDENT"] || 0,
      resolved: (statusMap["RESOLVED"] || 0) + (statusMap["CLOSED"] || 0),
      closedOrRejected: (statusMap["REJECTED"] || 0) + (statusMap["CLOSED_NO_RESPONSE"] || 0),
    };

    return NextResponse.json({ success: true, reports, staffContext, summaryCounts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب قائمة البلاغات.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
