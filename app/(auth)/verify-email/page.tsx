"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(!!token);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    verifyEmail({
      query: {
        token,
      },
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.error) {
          setErrorMessage(res.error.message || "رابط التحقق غير صالح أو انتهت صلاحيته.");
        } else {
          setIsSuccess(true);
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage("حدث خطأ أثناء التحقق من البريد.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-civic-1">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">
        تأكيد البريد الإلكتروني
      </h1>

      {isLoading ? (
        <div className="py-8">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#007766] border-t-transparent" />
          <p className="mt-4 text-sm text-slate-600">جاري التحقق من صحة الرابط...</p>
        </div>
      ) : isSuccess ? (
        <div className="rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] p-4">
          <p className="text-sm font-bold text-[#166534]">
            تم تأكيد بريدك الإلكتروني بنجاح!
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-[#007766] px-6 py-2 text-xs font-semibold text-white hover:bg-[#005f52] transition-colors"
            >
              الانتقال إلى لوحة التحكم
            </Link>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-4">
          <p className="text-sm font-medium text-[#dc2626]">{errorMessage}</p>
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-block text-xs font-semibold text-[#007766] underline"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            تم إرسال رابط تأكيد إلى بريدك الإلكتروني المسجل. يرجى فتح الرسالة والنقر على الرابط لتفعيل حسابك بالكامل.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#007766] hover:text-[#005f52]"
            >
              الانتقال للوحة التحكم
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
