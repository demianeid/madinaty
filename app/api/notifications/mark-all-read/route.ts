import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { markAllNotificationsAsRead } from "@/lib/notifications/service";

export async function POST() {
  try {
    const user = await requireUser();
    await markAllNotificationsAsRead(user.id);

    return NextResponse.json({
      success: true,
      message: "تم تحديد جميع الإشعارات كمقروءة.",
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : "فشل تحديث الإشعارات.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

