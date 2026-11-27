"use client";

import { useState } from "react";
import Link from "next/link";
import { forgetPassword } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgetPassword({
        email,
        redirectTo: "/reset-password",
      });
    } catch {
      // Intentionally suppress specific backend errors to prevent user enumeration
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 sm:p-8 shadow-civic-1">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#142D4E]">
              استعادة كلمة المرور
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة
            </p>
          </div>

          {isSubmitted ? (
            <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857] mb-3 font-bold border border-[#A7F3D0]">
                ✓
              </div>
              <h3 className="text-sm font-bold text-[#047857] mb-1">
                تم استلام طلبك
              </h3>
              <p className="text-xs text-[#047857] leading-relaxed">
                إذا كان هذا البريد مسجلاً لدينا، فستصلك رسالة تحتوي على رابط مؤقت لتعيين كلمة المرور. يرجى التحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
              </p>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-block text-xs font-semibold text-[#0891B2] hover:underline"
                >
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#0891B2] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0E7490] active:bg-[#155E75] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isLoading ? "جاري الإرسال..." : "إرسال رابط استعادة كلمة المرور"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-600">
            تذكرت كلمة المرور؟{" "}
            <Link href="/login" className="font-bold text-[#0891B2] hover:text-[#0E7490]">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
