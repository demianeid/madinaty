import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { inspectReportWithGemini } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال عنوان ووصف البلاغ أولاً لتتمكن الأداة من اقتراح التصنيف." },
        { status: 400 }
      );
    }

    // Call Gemini inspection
    const result = await inspectReportWithGemini({
      title,
      description,
    });

    // Match suggestedCategoryKey to actual DB categories
    let matchedCategory = null;
    if (result.suggestedCategoryKey) {
      matchedCategory = await prisma.category.findFirst({
        where: {
          isActive: true,
          OR: [
            { key: result.suggestedCategoryKey },
            { key: { contains: result.suggestedCategoryKey } },
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      verdict: result.verdict,
      confidence: result.confidence,
      reason: result.reason,
      suggestedCategoryId: matchedCategory?.id || null,
      suggestedCategoryKey: matchedCategory?.key || result.suggestedCategoryKey || null,
      suggestedCategoryLabel: matchedCategory?.labelAr || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل اقتراح التصنيف الذكي.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

