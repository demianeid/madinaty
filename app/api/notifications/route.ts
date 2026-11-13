import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import {
  listUserNotifications,
  markNotificationAsRead,
} from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = req.nextUrl;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 20;
    const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0;
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";

    const result = await listUserNotifications(user.id, { limit, offset, unreadOnly });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء جلب الإشعارات.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "معرّف الإشعار مطلوب." }, { status: 400 });
    }

    await markNotificationAsRead(user.id, id);

    return NextResponse.json({
      success: true,
      message: "تم تحديد الإشعار كمقروء.",
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : "فشل تحديث حالة الإشعار.";
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

