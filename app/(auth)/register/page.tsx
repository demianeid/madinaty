"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("يجب أن تكون كلمة المرور 8 أحرف على الأقل.");
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للاستمرار.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await signUp.email({
        name,
        email,
        password,
        // @ts-expect-error additionalFields passed to better auth
        phoneNumber,
        role: "CITIZEN",
      });

      if (res.error) {
        setErrorMessage(res.error.message || "فشل إنشاء الحساب. قد يكون البريد الإلكتروني مسجلاً مسبقاً.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.");
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
              إنشاء حساب مواطن جديد
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              سجل حسابك لتقديم البلاغات البلدية، متابعة حالة الإصلاح، والتقييم بعد الإنجاز
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
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أحمد محمد"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رقم الهاتف (اختياري)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 leading-normal">
                أوافق على{" "}
                <Link href="/terms" className="text-emerald-600 underline">
                  شروط الاستخدام
                </Link>{" "}
                و{" "}
                <Link href="/privacy" className="text-emerald-600 underline">
                  سياسة الخصوصية
                </Link>{" "}
                الخاصة بمنصة مدينتي.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب الآن"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            لديك حساب بالفعل؟{" "}
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
