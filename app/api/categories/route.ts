import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        key: true,
        labelAr: true,
        labelEn: true,
        descriptionAr: true,
        defaultAuthorityId: true,
      },
      orderBy: { labelAr: "asc" },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل جلب تصنيفات البلاغات.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
