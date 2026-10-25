"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth/auth-client";

export function Header() {
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                مدينتي
              </span>
              <span className="block text-[10px] font-medium text-emerald-600 -mt-1">
                خدمات البلاغات البلدية
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <Link href="/" className="hover:text-emerald-600 transition-colors">
              الرئيسية
            </Link>
            <Link href="/#track" className="hover:text-emerald-600 transition-colors">
              تتبع بلاغ
            </Link>
            <Link href="/#emergency" className="hover:text-red-600 transition-colors">
              أرقام الطوارئ
            </Link>
          </nav>
        </div>

        {/* Auth CTA & Profile */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {session.user.name?.[0] || "م"}
                </div>
                <span>{session.user.name || session.user.email}</span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {((session.user as Record<string, unknown>).role as string) === "ADMIN"
                    ? "مدير"
                    : ((session.user as Record<string, unknown>).role as string) === "STAFF"
                    ? "موظف"
                    : "مواطن"}
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                خروج
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                حساب جديد
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
