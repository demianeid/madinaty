import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { transitionReportStatus } from "@/lib/reports/service";
import { ReportStatus } from "@prisma/client";
import { z } from "zod";

const transitionSchema = z.object({
  toStatus: z.nativeEnum(ReportStatus),
  expectedVersion: z.number().int().optional(),
  reason: z.string().optional(),
  repairDescription: z.string().optional(),
  evidenceMediaIds: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await req.json();

    const validated = transitionSchema.parse(body);

    const updated = await transitionReportStatus({
      reportId: id,
      toStatus: validated.toStatus,
      expectedVersion: validated.expectedVersion,
      reason: validated.reason,
      repairDescription: validated.repairDescription,
      evidenceMediaIds: validated.evidenceMediaIds,
      actor: user,
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تحديث حالة البلاغ.";
    const status = (error as { status?: number }).status || 422;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
