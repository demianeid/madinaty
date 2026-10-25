import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { processAndStoreMedia, MAX_FILE_SIZE_BYTES } from "@/lib/media/storage";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const reportId = (formData.get("reportId") as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: "لم يتم تحديد أي ملف للرفع." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "حجم الصورة يتجاوز الحد المسموح به (5 ميجابايت)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image: validate magic bytes, re-encode, strip all EXIF/GPS metadata
    const processed = await processAndStoreMedia(buffer, file.type);

    // Persist media metadata in database
    const media = await prisma.reportMedia.create({
      data: {
        reportId,
        storageProvider: "local_secure",
        storageKey: processed.storageKey,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        width: processed.width ?? null,
        height: processed.height ?? null,
        sha256: processed.sha256,
        uploadedById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        storageKey: media.storageKey,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        width: media.width,
        height: media.height,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل رفع ومعالجة الصورة.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
