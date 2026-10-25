"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

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

    try {
      const res = await resetPassword({
        newPassword: password,
      });

      if (res.error) {
        setErrorMessage(res.error.message || "الرابط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء إعادة تعيين كلمة المرور.");
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
              تعيين كلمة مرور جديدة
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              أدخل كلمة المرور الجديدة لحسابك
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs sm:text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {success ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <h3 className="text-sm font-bold text-emerald-900 mb-1">
                تم تغيير كلمة المرور بنجاح!
              </h3>
              <p className="text-xs text-emerald-700">
                سيتم توجيهك إلى صفحة تسجيل الدخول خلال لحظات...
              </p>
              <div className="mt-4">
                <Link href="/login" className="text-xs font-bold text-emerald-700 underline">
                  الانتقال لتسجيل الدخول مباشرة
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  كلمة المرور الجديدة
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
