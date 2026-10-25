import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { submitAppeal } from "@/lib/reports/service";
import { z } from "zod";

const appealSchema = z.object({
  reason: z.string().min(10, "يرجى كتابة سبب الاعتراض بوضوح (10 أحرف على الأقل)"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await req.json();

    const validated = appealSchema.parse(body);

    const appeal = await submitAppeal({
      reportId: id,
      reason: validated.reason,
      actor: user,
    });

    return NextResponse.json({ success: true, appeal }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تقديم الاعتراض.";
    const status = (error as { status?: number }).status || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
