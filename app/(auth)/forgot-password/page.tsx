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
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              استعادة كلمة المرور
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة
            </p>
          </div>

          {isSubmitted ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
                ✓
              </div>
              <h3 className="text-sm font-bold text-emerald-900 mb-1">
                تم استلام طلبك
              </h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                إذا كان هذا البريد مسجلاً لدينا، فستصلك رسالة تحتوي على رابط مؤقت لتعيين كلمة المرور. يرجى التحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
              </p>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-block text-xs font-bold text-emerald-700 hover:underline"
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
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "جاري الإرسال..." : "إرسال رابط استعادة كلمة المرور"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-600">
            تذكرت كلمة المرور؟{" "}
            <Link href="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
