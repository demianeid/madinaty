import { NextRequest, NextResponse } from "next/server";
import { getPublicReportByReference } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("reference");

    if (!reference || reference.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال الرقم المرجعي للبلاغ (مثال: MD-XXXX-XXXX)." },
        { status: 400 }
      );
    }

    const report = await getPublicReportByReference(reference);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على أي بلاغ مسجل بهذا الرمز المرجعي. يرجى التحقق من صحة الرمز.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "حدث خطأ أثناء الاستعلام عن البلاغ.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

