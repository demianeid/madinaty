import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { z, ZodError } from "zod";

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "الاسم الكامل يجب أن يكون حرفين على الأقل.")
    .max(100, "الاسم الكامل يجب ألا يتجاوز 100 حرف."),
  phoneNumber: z
    .string()
    .trim()
    .max(20, "رقم الهاتف طويل جداً.")
    .refine(
      (val) => val === "" || /^[0-9+\-\s()]{7,20}$/.test(val),
      "صيغة رقم الهاتف غير صحيحة."
    )
    .optional(),
});

export async function GET() {
  try {
    const authUser = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        preferredLocale: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          select: {
            id: true,
            membershipRole: true,
            sector: true,
            authority: { select: { nameAr: true, slug: true } },
            assignedArea: { select: { nameAr: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "الحساب غير موجود." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile: user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر جلب بيانات الملف الشخصي.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireUser();
    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    const normalizedPhone =
      parsed.phoneNumber === undefined
        ? undefined
        : parsed.phoneNumber === ""
        ? null
        : parsed.phoneNumber;

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name: parsed.name,
        ...(normalizedPhone !== undefined ? { phoneNumber: normalizedPhone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        preferredLocale: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: authUser.id,
        actorType: "USER",
        action: "PROFILE_UPDATED",
        entityType: "User",
        entityId: authUser.id,
        metadata: {
          name: updated.name,
          phoneNumberUpdated: normalizedPhone !== undefined,
        },
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || "البيانات المدخلة غير صحيحة." },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "فشل تحديث البيانات الشخصية.";
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
