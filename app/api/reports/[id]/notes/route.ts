import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { addInternalNote } from "@/lib/reports/service";
import { z } from "zod";

const noteSchema = z.object({
  body: z.string().min(3, "يجب إدخال نص الملاحظة (3 أحرف على الأقل)"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const json = await req.json();

    const validated = noteSchema.parse(json);

    const note = await addInternalNote({
      reportId: id,
      body: validated.body,
      actor: user,
    });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إضافة الملاحظة الداخلية.";
    const status = (error as { status?: number }).status || 403;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
