import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { submitRating } from "@/lib/reports/service";
import { z } from "zod";

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await req.json();

    const validated = ratingSchema.parse(body);

    const rating = await submitRating({
      reportId: id,
      score: validated.score,
      comment: validated.comment,
      actor: user,
    });

    return NextResponse.json({ success: true, rating });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إرسال التقييم.";
    const status = (error as { status?: number }).status || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
