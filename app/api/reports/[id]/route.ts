import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    // Query report by id OR publicReference
    const report = await prisma.report.findFirst({
      where: {
        OR: [{ id }, { publicReference: id.toUpperCase() }],
        deletedAt: null,
      },
      include: {
        category: true,
        authority: true,
        media: {
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            isResolutionPhoto: true,
            createdAt: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reason: true,
            actorType: true,
            createdAt: true,
            metadata: true,
          },
        },
        updates: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            isPublic: true,
            author: { select: { name: true, role: true } },
          },
        },
        internalNotes: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { name: true, role: true } },
          },
        },
        appeals: {
          orderBy: { createdAt: "desc" },
        },
        ratings: true,
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "البلاغ غير موجود." }, { status: 404 });
    }

    // IDOR / Access Control Validation
    if (user.role === UserRole.CITIZEN) {
      if (report.createdById !== user.id) {
        return NextResponse.json(
          { success: false, error: "لا تملك صلاحية عرض هذا البلاغ." },
          { status: 403 }
        );
      }
    } else if (user.role === UserRole.STAFF) {
      // Must have active membership in the assigned authority
      if (report.authorityId) {
        const membership = await prisma.authorityMembership.findUnique({
          where: {
            userId_authorityId: {
              userId: user.id,
              authorityId: report.authorityId,
            },
          },
        });
        if (!membership || !membership.isActive) {
          return NextResponse.json(
            { success: false, error: "هذا البلاغ يتبع جهة أخرى خارج نطاق اختصاصك." },
            { status: 403 }
          );
        }
      }
    }

    // Sanitize: Citizens must NEVER receive internal staff notes
    if (user.role === UserRole.CITIZEN) {
      // @ts-expect-error sanitize internal notes
      delete report.internalNotes;
    }

    return NextResponse.json({ success: true, report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب تفاصيل البلاغ.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
