"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        setErrorMessage(res.error.message || "فشل تسجيل الدخول. يرجى التحقق من البريد وكلمة المرور.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("حدث خطأ غير متوقع أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              تسجيل الدخول إلى مدينتي
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              أدخل بيانات حسابك لمتابعة بلاغاتك أو إدارة المهام المسندة إليك
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-700">
              {errorMessage}
            </div>
          )}

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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  كلمة المرور
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            ليس لديك حساب بعد؟{" "}
            <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
              إنشاء حساب مواطن جديد
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
