import { NextRequest, NextResponse } from "next/server";
import { processExpiredAppealsCron } from "@/lib/reports/service";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "madinaty-cron-secret-key-phase2";

    // Validate cron authorization token
    if (authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = req.nextUrl.searchParams.get("key");
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ error: "غير مصرح بتنفيذ مهام النظام المجدولة." }, { status: 401 });
      }
    }

    const result = await processExpiredAppealsCron();

    return NextResponse.json({
      success: true,
      message: `تم فحص البلاغات المعالجة وإغلاق ${result.closedCount} بلاغاً لانقضاء مهلة الاعتراض.`,
      result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل تنفيذ معالجة البلاغات منتهية المهلة.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
