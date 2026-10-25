import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { addReportUpdate } from "@/lib/reports/service";
import { z } from "zod";

const updateSchema = z.object({
  body: z.string().min(3, "يجب إدخال نص التوضيح (3 أحرف على الأقل)"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const json = await req.json();

    const validated = updateSchema.parse(json);

    const update = await addReportUpdate({
      reportId: id,
      body: validated.body,
      actor: user,
    });

    return NextResponse.json({ success: true, update }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إضافة التوضيح.";
    const status = (error as { status?: number }).status || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
