"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { UserRole } from "@prisma/client";
import { signOut } from "@/lib/auth/auth-client";

interface DashboardSidebarProps {
  role: UserRole;
  roleLabelOverride?: string;
  userName: string;
  userEmail: string;
  activeFilter?: string;
  onFilterChange?: (status: string) => void;
  canManageStaff?: boolean;
  activeView?: "REPORTS" | "STAFF";
  onSelectView?: (view: "REPORTS" | "STAFF") => void;
  counts?: {
    total: number;
    inProgress: number;
    waiting: number;
    resolved: number;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DashboardSidebar({
  role,
  roleLabelOverride,
  userName,
  userEmail,
  activeFilter = "",
  onFilterChange,
  canManageStaff = false,
  activeView = "REPORTS",
  onSelectView,
  counts = { total: 0, inProgress: 0, waiting: 0, resolved: 0 },
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const isAdmin = role === UserRole.ADMIN;
  const isStaff = role === UserRole.STAFF;

  const roleLabel =
    roleLabelOverride || (isAdmin ? "مدير المنظومة العام" : isStaff ? "طاقم العمليات" : "مواطن");

  // Handle ESC key and scroll lock on mobile
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        onCloseMobile();
      }
    }
    if (mobileOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, onCloseMobile]);

  const reportNavItems = [
    {
      id: "",
      label: isAdmin ? "كافة بلاغات المحافظة" : isStaff ? "طابور مهام الجهة" : "كافة البلاغات",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      count: counts.total,
      color: "text-slate-700",
    },
    {
      id: "IN_PROGRESS",
      label: "قيد المعالجة الميدانية",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      count: counts.inProgress,
      color: "text-indigo-700",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      id: "WAITING_FOR_RESIDENT",
      label: "بانتظار رد المواطن",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: counts.waiting,
      color: "text-amber-700",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "RESOLVED",
      label: "تمت المعالجة والإصلاح",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: counts.resolved,
      color: "text-emerald-700",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ];

  /* ─────────────────────────── Sidebar Content ─────────────────────────── */
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800">

      {/* ── Brand Header ── */}
      <div className="h-16 border-b border-slate-200/80 flex items-center relative">
        {isCollapsed ? (
          <>
            <Link href="/" className="flex items-center justify-center w-full" title="مدينتي">
              <Image
                src="/images/logo/madinaty-app-icon.svg"
                alt="مدينتي"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex absolute -left-3.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white border border-[#CBD5E1] shadow-sm text-slate-500 hover:text-[#0891B2] hover:border-[#0891B2]/40 items-center justify-center transition-all cursor-pointer z-10"
              title="توسيع القائمة"
            >
              <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full px-4">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
              <Image
                src="/images/logo/madinaty-app-icon.svg"
                alt="مدينتي"
                width={36}
                height={36}
                className="h-9 w-9 object-contain shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <MadinatyLogo variant="dark" className="h-6 w-auto object-contain block drop-shadow-xs" priority />
                <span className={`text-[10px] font-semibold block truncate ${isAdmin ? "text-[#142D4E]" : "text-[#0891B2]"}`}>
                  {isAdmin ? "الرقابة المركزية" : "لوحة العمليات"}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer shrink-0"
              title="طي القائمة"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation Body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

        {/* ════════════════════════════════════════════════
            ADMIN: Section 1 — الحوكمة والرقابة (FIRST)
            ════════════════════════════════════════════════ */}
        {isAdmin && (
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-bold text-[#142D4E] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0891B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>الحوكمة والرقابة</span>
              </p>
            )}
            <nav className="space-y-1">
              {/* إدارة الموظفين */}
              <button
                type="button"
                onClick={() => { onSelectView?.("STAFF"); onCloseMobile(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeView === "STAFF"
                  ? "bg-cyan-50 text-[#0E7490] border border-cyan-200/80 shadow-xs"
                  : "text-slate-700 hover:bg-cyan-50/60 hover:text-[#0E7490]"
                  }`}
                title={isCollapsed ? "إدارة الموظفين والهيئات بالمحافظة" : undefined}
              >
                <svg className={`w-5 h-5 shrink-0 ${activeView === "STAFF" ? "text-[#0E7490]" : "text-[#0891B2]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!isCollapsed && <span className="flex-1 text-right truncate">إدارة الموظفين والهيئات</span>}
              </button>

              {/* سجل التدقيق */}
              <Link
                href="/admin"
                onClick={onCloseMobile}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-cyan-50/60 hover:text-[#0E7490] transition-colors"
                title={isCollapsed ? "سجل التدقيق والبيانات" : undefined}
              >
                <svg className="w-5 h-5 text-[#0891B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {!isCollapsed && <span className="flex-1 text-right truncate">سجل التدقيق والبيانات</span>}
              </Link>
            </nav>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            STAFF (Sector Admin): Section — إدارة القطاع
            ════════════════════════════════════════════════ */}
        {canManageStaff && isStaff && (
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-bold text-[#0891B2] uppercase tracking-wider mb-2">
                إدارة القطاع
              </p>
            )}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => { onSelectView?.("STAFF"); onCloseMobile(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeView === "STAFF"
                  ? "bg-cyan-50 text-[#0891B2] border border-cyan-200/80 shadow-xs"
                  : "text-slate-700 hover:bg-cyan-50/70 hover:text-[#0891B2]"
                  }`}
                title={isCollapsed ? "إدارة فريق القطاع" : undefined}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!isCollapsed && <span className="flex-1 text-right truncate">إدارة فريق القطاع</span>}
              </button>
            </nav>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            Section: طابور البلاغات (Both Admin & Staff)
            ════════════════════════════════════════════════ */}
        <div>
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {isAdmin ? "مراقبة البلاغات" : "طابور البلاغات"}
            </p>
          )}
          <nav className="space-y-1">
            {reportNavItems.map((item) => {
              const active = activeFilter === item.id && activeView === "REPORTS";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onFilterChange?.(item.id);
                    onSelectView?.("REPORTS");
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${active
                    ? isAdmin
                      ? "bg-cyan-50 text-[#0E7490] border border-cyan-200/80 shadow-xs"
                      : "bg-cyan-50 text-[#0891B2] shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#142D4E]"
                    }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={active ? (isAdmin ? "text-[#0E7490]" : "text-[#0891B2]") : "text-slate-400"}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 text-right truncate">{item.label}</span>
                  )}
                  {!isCollapsed && typeof item.count === "number" && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${active
                      ? isAdmin
                        ? "bg-[#142D4E] text-white"
                        : "bg-[#0891B2] text-white"
                      : item.badgeColor || "bg-slate-100 text-slate-600"
                      }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ════════════════════════════════════════════════
            Section: أدوات سريعة
            ════════════════════════════════════════════════ */}
        <div>
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              أدوات سريعة
            </p>
          )}
          <nav className="space-y-1">
            {/* تقديم بلاغ — STAFF only, not for ADMIN */}
            {isStaff && (
              <Link
                href="/reports/new"
                onClick={onCloseMobile}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#0891B2] bg-cyan-50 hover:bg-cyan-100 transition-colors"
                title={isCollapsed ? "تقديم بلاغ جديد" : undefined}
              >
                <span className="font-bold text-base leading-none shrink-0">+</span>
                {!isCollapsed && <span className="flex-1 text-right truncate">تقديم بلاغ جديد</span>}
              </Link>
            )}

            <Link
              href="/notifications"
              onClick={onCloseMobile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#142D4E] transition-colors"
              title={isCollapsed ? "مركز التنبيهات" : undefined}
            >
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {!isCollapsed && <span className="flex-1 text-right truncate">مركز التنبيهات</span>}
            </Link>

            <Link
              href="/track"
              onClick={onCloseMobile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#142D4E] transition-colors"
              title={isCollapsed ? "تتبع برقم مرجعي" : undefined}
            >
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {!isCollapsed && <span className="flex-1 text-right truncate">تتبع برقم مرجعي</span>}
            </Link>

            <Link
              href="/settings"
              onClick={onCloseMobile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#142D4E] transition-colors"
              title={isCollapsed ? "الإعدادات والملف الشخصي" : undefined}
            >
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!isCollapsed && <span className="flex-1 text-right truncate">الإعدادات والملف الشخصي</span>}
            </Link>
          </nav>
        </div>
      </div>

      {/* ── User Profile & Sign Out Footer ── */}
      <div className={`p-3 border-t border-[#CBD5E1] ${isAdmin ? "bg-slate-100/80" : "bg-slate-50/70"}`}>
        <div className="flex items-center gap-2.5 p-1.5">
          <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${isAdmin ? "bg-[#142D4E]" : "bg-[#0891B2]"
            }`}>
            {userName?.[0] || "م"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#142D4E] truncate leading-snug">{userName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate" title={userEmail}>
                {roleLabel}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 py-1.5 px-2 text-xs font-semibold text-slate-600 transition-colors cursor-pointer shadow-xs"
          title="تسجيل الخروج"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span>خروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent / Collapsible Sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 right-0 h-screen border-l border-slate-200/80 bg-white transition-all duration-300 z-30 shrink-0 overflow-visible ${isCollapsed ? "w-20" : "w-64"
          }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide Over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" dir="rtl">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
