import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { readStoredMedia } from "@/lib/media/storage";
import { prisma } from "@/lib/db/prisma";
import { UserRole, ReportVisibility } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await prisma.reportMedia.findUnique({
      where: { id },
      include: {
        report: {
          select: {
            id: true,
            createdById: true,
            authorityId: true,
            visibility: true,
          },
        },
      },
    });

    if (!media) {
      return NextResponse.json({ error: "الصورة غير موجودة." }, { status: 404 });
    }

    // Access authorization check
    // If report is explicitly approved as PUBLIC, public access is allowed
    const isPublicReport = media.report?.visibility === ReportVisibility.PUBLIC;

    if (!isPublicReport) {
      // Must be authenticated
      const user = await requireUser();

      // If media is still unlinked, only the uploader can access it
      if (!media.report) {
        if (media.uploadedById !== user.id && user.role !== UserRole.ADMIN) {
          return NextResponse.json({ error: "غير مصرح بالوصول إلى هذه الصورة." }, { status: 403 });
        }
      } else {
        // Linked to report: check ownership / authority scope
        if (user.role === UserRole.CITIZEN && media.report.createdById !== user.id) {
          return NextResponse.json({ error: "غير مصرح لك بعرض صور هذا البلاغ." }, { status: 403 });
        } else if (user.role === UserRole.STAFF) {
          if (media.report.authorityId) {
            const membership = await prisma.authorityMembership.findUnique({
              where: {
                userId_authorityId: {
                  userId: user.id,
                  authorityId: media.report.authorityId,
                },
              },
            });
            if (!membership || !membership.isActive) {
              return NextResponse.json(
                { error: "هذه الصورة تتبع بلاغاً خارج نطاق صلاحيات جهتك." },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    const { buffer } = await readStoredMedia(media.storageKey);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Cache-Control": "private, no-transform, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب الصورة.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
