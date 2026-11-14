"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function Header() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;

  // Curated, high-value navigation links (uncluttered & spacious)
  const navLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "الخدمات البلدية", href: "/#categories" },
    { label: "تتبع بلاغ", href: "/track" },
    { label: "الأسئلة الشائعة", href: "/#faq" },
    ...(userRole === "ADMIN" ? [{ label: "الإدارة", href: "/admin", isAdmin: true }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-civic-1 transition-all">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Right Section: Brand Logo (RTL) */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#007766] to-[#005c4f] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
            <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-[#007766] transition-colors leading-none block">
              مدينتي
            </span>
            <span className="block text-[10px] font-medium text-slate-500 mt-0.5">
              المنصة البلدية الذكية
            </span>
          </div>
        </Link>

        {/* Center: Clean & Uncluttered Navigation */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 lg:gap-4">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  link.isAdmin
                    ? "text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold"
                    : active
                    ? "text-[#007766] bg-[#ecfdf5] font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Left Section: Compact User State (No Logout Button) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isPending ? (
            <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
          ) : session?.user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications Center Bell */}
              <NotificationBell />

              {/* Profile Avatar & Pill (Links directly to Dashboard) */}
              <Link
                href="/dashboard"
                title="الانتقال إلى لوحة التحكم"
                aria-label="لوحة التحكم"
                className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-[#f8fafc] hover:bg-[#ecfdf5] hover:border-[#007766]/40 px-2.5 py-1 text-xs text-slate-800 transition-all shadow-xs group cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-[#007766] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {session.user.name?.[0] || "م"}
                </div>
                <span className="hidden sm:inline max-w-[130px] truncate font-semibold text-slate-700 group-hover:text-[#007766] transition-colors">
                  {session.user.name || session.user.email}
                </span>
                <span className="badge-civic-pill badge-civic-info text-[10px] px-1.5 py-0.2">
                  {userRole === "ADMIN" ? "مدير" : userRole === "STAFF" ? "موظف" : "مواطن"}
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-[#007766] hover:bg-slate-100 transition-colors"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[#007766] hover:bg-[#005f52] px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors"
              >
                حساب جديد
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="القائمة الرئيسية"
            className="md:hidden rounded-lg p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 shadow-civic-2">
          {session?.user && (
            <div className="mb-3 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[#007766] text-white flex items-center justify-center font-bold text-xs">
                  {session.user.name?.[0] || "م"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{session.user.name || session.user.email}</p>
                  <p className="text-[10px] text-slate-400">
                    {userRole === "ADMIN" ? "مدير النظام" : userRole === "STAFF" ? "موظف ميداني" : "مواطن"}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-[#007766] bg-[#ecfdf5] px-2.5 py-1 rounded-md"
              >
                لوحة التحكم ←
              </Link>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "text-[#007766] bg-[#ecfdf5] font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
