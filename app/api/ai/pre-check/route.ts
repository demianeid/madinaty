import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { inspectReportWithGemini } from "@/lib/ai/gemini";
import { readStoredMedia } from "@/lib/media/storage";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { mediaIds, title, description, categoryKey, categoryId } = body;

    // Load active categories for exact taxonomy consistency
    const activeCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, key: true, labelAr: true, labelEn: true, descriptionAr: true },
    });

    // Resolve current category from categoryId or categoryKey
    let currentCategory = null;
    let effectiveCategoryKey = categoryKey;
    if (categoryId) {
      currentCategory = activeCategories.find((c) => c.id === categoryId) || null;
      if (currentCategory && !effectiveCategoryKey) {
        effectiveCategoryKey = currentCategory.key;
      }
    } else if (categoryKey) {
      currentCategory = activeCategories.find((c) => c.key === categoryKey) || null;
    }

    // Load images if mediaIds provided, preserving the exact order of mediaIds
    const imageBuffers: { buffer: Buffer; mimeType: string }[] = [];
    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      const mediaList = await prisma.reportMedia.findMany({
        where: { id: { in: mediaIds } },
        select: { id: true, storageKey: true, mimeType: true },
      });

      const mediaMap = new Map(mediaList.map((m) => [m.id, m]));
      const orderedMediaList = mediaIds.map((id) => mediaMap.get(id)).filter(Boolean);

      for (const m of orderedMediaList) {
        if (!m) continue;
        try {
          const { buffer } = await readStoredMedia(m.storageKey);
          imageBuffers.push({ buffer, mimeType: m.mimeType });
        } catch {
          // If a file cannot be read, continue
        }
      }
    }

    // Inspect with Gemini using dynamic category taxonomy
    const result = await inspectReportWithGemini({
      title: title || "بلاغ بلدي قيد الفحص",
      description: description || "فحص أولي للصور المرفقة قبل اعتماد البلاغ",
      categoryKey: effectiveCategoryKey,
      categoryLabel: currentCategory?.labelAr,
      availableCategories: activeCategories.map((c) => ({
        key: c.key,
        labelAr: c.labelAr,
        descriptionAr: c.descriptionAr || undefined,
      })),
      imageBuffers,
    });

    const isInvalid = result.verdict === "INVALID";

    // Lookup suggested category from active categories list
    let suggestedCategory = null;
    if (result.suggestedCategoryKey && result.suggestedCategoryKey !== "other") {
      suggestedCategory =
        activeCategories.find(
          (c) => c.key === result.suggestedCategoryKey || c.key.includes(result.suggestedCategoryKey!)
        ) || null;
    }

    const isMismatch = Boolean(
      !isInvalid &&
      suggestedCategory &&
      currentCategory &&
      suggestedCategory.id !== currentCategory.id
    );

    return NextResponse.json({
      success: true,
      verdict: result.verdict,
      confidence: result.confidence,
      reason: result.reason,
      suggestedCategoryKey: result.suggestedCategoryKey || null,
      suggestedCategory: suggestedCategory || null,
      currentCategory: currentCategory || null,
      invalidImageIndices: result.invalidImageIndices || [],
      isMismatch,
      isIssue: result.verdict === "VALID",
      isUncertain: result.verdict === "UNCERTAIN",
      requiresReplacement: isInvalid,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل الفحص المسبق للصور.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

