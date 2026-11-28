"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // If already logged in, redirect directly to dashboard; if logged out, ensure loading state is reset
  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/dashboard");
    } else if (!isPending && !session?.user) {
      setIsLoading(false);
    }
  }, [session, isPending, router]);

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
        setIsLoading(false);
      } else {
        setIsLoading(false);
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("حدث خطأ غير متوقع أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-xl border border-[#CBD5E1] bg-white p-6 sm:p-8 shadow-civic-1">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#142D4E]">
              تسجيل الدخول إلى مدينتي
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              أدخل بيانات حسابك لمتابعة بلاغاتك أو إدارة المهام المسندة إليك
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs sm:text-sm text-[#B91C1C]">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  كلمة المرور
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#0891B2] hover:text-[#0E7490]"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#0891B2] cursor-pointer transition-colors"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#0891B2] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0E7490] active:bg-[#155E75] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            ليس لديك حساب بعد؟{" "}
            <Link href="/register" className="font-bold text-[#0891B2] hover:text-[#0E7490]">
              إنشاء حساب مواطن جديد
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
