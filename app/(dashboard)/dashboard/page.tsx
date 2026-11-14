"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";
import type { FieldMapReport } from "@/components/dashboard/field-map";
import { OpsReportsTable } from "@/components/dashboard/ops-reports-table";
import type { OpsReport } from "@/components/dashboard/ops-reports-table";

// Dynamic import – Leaflet is SSR-incompatible
const FieldMap = dynamic(
  () => import("@/components/dashboard/field-map").then((m) => ({ default: m.FieldMap })),
  { ssr: false, loading: () => (
    <div className="w-full h-[400px] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007766] border-t-transparent" />
    </div>
  )}
);

// ReportSummary extends OpsReport — same shape, compatible with both table and map
type ReportSummary = OpsReport;

interface CategoryOption {
  id: string;
  key: string;
  labelAr: string;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [, startTransition] = useTransition();

  // Sidebar Controls for Staff/Admin
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Field Map visibility toggle
  const [mapVisible, setMapVisible] = useState(true);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Load Categories for dropdown filter
  useEffect(() => {
    let ignore = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch Reports with filters
  useEffect(() => {
    let ignore = false;
    if (session?.user) {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const url = `/api/reports?${params.toString()}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.success && data.reports) {
              setReports(data.reports);
            } else {
              setErrorMessage(data.error || "تعذر جلب البلاغات.");
            }
            setReportsLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            setErrorMessage("فشل الاتصال بالخادم لجلب البلاغات.");
            setReportsLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [session, statusFilter, categoryFilter, searchQuery]);

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#007766] border-t-transparent" />
        <p className="mt-4 text-xs text-slate-600 font-semibold">جاري التحقق من الصلاحيات وتهيئة اللوحة...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const role = ((session.user as Record<string, unknown>).role as UserRole) || UserRole.CITIZEN;
  const isOperationsRole = role === UserRole.STAFF || role === UserRole.ADMIN;

  const roleLabels: Record<string, string> = {
    ADMIN: "مدير النظام العام",
    STAFF: "طاقم العمليات الميدانية",
    CITIZEN: "مواطن / مقيم",
  };

  // Metrics calculation
  const totalCount = reports.length;
  const inProgressCount = reports.filter(
    (r) => r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED
  ).length;
  const resolvedCount = reports.filter(
    (r) => r.status === ReportStatus.RESOLVED || r.status === ReportStatus.CLOSED
  ).length;
  const waitingCount = reports.filter(
    (r) => r.status === ReportStatus.WAITING_FOR_RESIDENT
  ).length;

  const hasActiveFilters = Boolean(statusFilter || categoryFilter || searchQuery.trim());

  // -------------------------------------------------------------
  // REUSABLE REPORTS TABLE
  // -------------------------------------------------------------
  const reportsTable = (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {role === UserRole.CITIZEN && "بلاغاتي المسجلة"}
            {role === UserRole.STAFF && "طابور مهام وتذاكر الجهة"}
            {role === UserRole.ADMIN && "كافة بلاغات المنظومة البلدية"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            استعراض ومتابعة حالات البلاغات والتدقيق في مراحل الإنجاز الميداني
          </p>
        </div>

        {/* Filter Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <input
            type="text"
            placeholder="بحث بالعنوان أو الرمز (MD-XXXX)..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => {
                setSearchQuery(val);
              });
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#007766] focus:outline-none focus:ring-1 focus:ring-[#007766] w-full sm:w-56"
          />

          {/* Category Filter */}
          <select
            aria-label="تصفية حسب التصنيف"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-[#007766] focus:ring-1 focus:ring-[#007766] cursor-pointer"
          >
            <option value="">كافة التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelAr}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="تصفية حسب الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-[#007766] focus:ring-1 focus:ring-[#007766] cursor-pointer"
          >
            <option value="">كافة الحالات</option>
            <option value={ReportStatus.NEW}>جديد</option>
            <option value={ReportStatus.ASSIGNED}>مسند لجهة</option>
            <option value={ReportStatus.IN_PROGRESS}>جاري العمل الميداني</option>
            <option value={ReportStatus.WAITING_FOR_RESIDENT}>بانتظار توضيح المواطن</option>
            <option value={ReportStatus.RESOLVED}>تمت المعالجة والإصلاح</option>
            <option value={ReportStatus.REJECTED}>مرفوض</option>
            <option value={ReportStatus.CLOSED}>مغلق نهائياً</option>
            <option value={ReportStatus.CLOSED_NO_RESPONSE}>مغلق لعدم الرد</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter("");
                setCategoryFilter("");
                setSearchQuery("");
              }}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {reportsLoading ? (
        <div className="py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007766] border-t-transparent mx-auto" />
          <p className="mt-3 text-xs text-slate-500 font-medium">جاري تحميل البلاغات...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center px-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            ✓
          </div>
          <h3 className="text-sm font-bold text-slate-700">لا توجد بلاغات تطابق البحث</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {role === UserRole.CITIZEN
              ? "لم تقم بتقديم أي بلاغات حتى الآن أو لا توجد نتائج تطابق التصفية."
              : "لا توجد مهام أو بلاغات مطابقة في طابور العمل حالياً."}
          </p>
          {role === UserRole.CITIZEN && !hasActiveFilters && (
            <div className="mt-4">
              <Link
                href="/reports/new"
                className="inline-flex rounded-lg bg-[#007766] hover:bg-[#005f52] px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                تقديم بلاغك الأول
              </Link>
            </div>
          )}
        </div>
      ) : isOperationsRole ? (
        <OpsReportsTable
          reports={reports}
          role={role}
          onReportUpdated={(id, newStatus) => {
            setReports((prev) =>
              prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
            );
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f8fafc] text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">رقم البلاغ</th>
                <th className="py-3 px-4">عنوان المشكلة</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">الجهة المختصة</th>
                <th className="py-3 px-4">الحالة الحالية</th>
                <th className="py-3 px-4">تاريخ التقديم</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => {
                const meta = REPORT_STATUS_METADATA[report.status];
                return (
                  <tr key={report.id} className="hover:bg-[#f5faf8] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#007766]">
                      {report.publicReference}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {report.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {report.category?.labelAr || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {report.authority?.nameAr || "قيد التعيين الآلي"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge-civic-pill ${
                          report.status === ReportStatus.RESOLVED
                            ? "badge-civic-success"
                            : report.status === ReportStatus.REJECTED
                            ? "badge-civic-danger"
                            : report.status === ReportStatus.IN_PROGRESS || report.status === ReportStatus.WAITING_FOR_RESIDENT
                            ? "badge-civic-warning"
                            : "badge-civic-info"
                        }`}
                      >
                        {meta?.labelAr || report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(report.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/reports/${report.id}`}
                        className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-[#ecfdf5] hover:text-[#007766] transition-colors"
                      >
                        عرض التفاصيل
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------
  // VIEW 1: STAFF & ADMIN OPERATIONS CONSOLE (WITH SIDEBAR)
  // -------------------------------------------------------------
  if (isOperationsRole) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-x-clip" dir="rtl">
        {/* Operations Sidebar */}
        <DashboardSidebar
          role={role}
          userName={session.user.name || session.user.email}
          userEmail={session.user.email}
          activeFilter={statusFilter}
          onFilterChange={(st) => setStatusFilter(st)}
          counts={{
            total: totalCount,
            inProgress: inProgressCount,
            waiting: waitingCount,
            resolved: resolvedCount,
          }}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Operational Workspace */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? "md:mr-20" : "md:mr-64"
          }`}
        >
          
          {/* Top Operational Bar */}
          <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                aria-label="فتح القائمة الجانبية"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {role === UserRole.STAFF ? "لوحة العمليات الميدانية" : "لوحة الرقابة والإدارة العامة"}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  طابور المهام المباشر وإدارة بلاغات المواطنين
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs">
                <span className="font-semibold text-slate-700 hidden sm:inline">{session.user.name || session.user.email}</span>
                <span className="badge-civic-pill badge-civic-info text-[10px] px-2 py-0.5 font-bold">
                  {roleLabels[role]}
                </span>
              </div>
            </div>
          </header>

          {/* Operational Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Metric Summary Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setStatusFilter("")}
                className={`text-right rounded-xl border p-4 transition-all cursor-pointer ${
                  statusFilter === "" ? "border-[#007766] bg-[#ecfdf5]/50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-bold text-slate-500">إجمالي البلاغات المسندة</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</p>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("IN_PROGRESS")}
                className={`text-right rounded-xl border p-4 transition-all cursor-pointer ${
                  statusFilter === "IN_PROGRESS" ? "border-amber-500 bg-amber-50/50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-bold text-amber-700">قيد العمل الميداني</span>
                <p className="text-xl sm:text-2xl font-black text-amber-900 mt-1 font-mono">{inProgressCount}</p>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("WAITING_FOR_RESIDENT")}
                className={`text-right rounded-xl border p-4 transition-all cursor-pointer ${
                  statusFilter === "WAITING_FOR_RESIDENT" ? "border-orange-500 bg-orange-50/50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-bold text-orange-700">بانتظار رد المواطن</span>
                <p className="text-xl sm:text-2xl font-black text-orange-900 mt-1 font-mono">{waitingCount}</p>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("RESOLVED")}
                className={`text-right rounded-xl border p-4 transition-all cursor-pointer ${
                  statusFilter === "RESOLVED" ? "border-emerald-500 bg-emerald-50/50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-xs font-bold text-emerald-700">تمت المعالجة والإصلاح</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 font-mono">{resolvedCount}</p>
              </button>
            </div>

            {/* ── الخريطة الميدانية ───────────────────────────────── */}
            <section id="field-map">
              {/* Section header with toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#ecfdf5] border border-[#007766]/20 flex items-center justify-center">
                    <svg className="h-4 w-4 text-[#007766]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.25l-6.75-6.75a1.5 1.5 0 010-2.12L9 4.5m6 15.75l6.75-6.75a1.5 1.5 0 000-2.12L15 4.5" />
                      <circle cx="12" cy="10" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">الخريطة الميدانية</h2>
                    <p className="text-[11px] text-slate-500">التوزيع الجغرافي للبلاغات على خريطة مدينتي</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapVisible((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all cursor-pointer"
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${mapVisible ? "rotate-0" : "rotate-180"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                  {mapVisible ? "إخفاء الخريطة" : "عرض الخريطة"}
                </button>
              </div>

              {mapVisible && (
                <FieldMap
                  key={reports.length}
                  reports={reports.filter(
                    (r): r is FieldMapReport & typeof r =>
                      typeof r.latitude === "number" && typeof r.longitude === "number"
                  ) as FieldMapReport[]}
                  height="400px"
                />
              )}
            </section>

            {/* Reports Table Component */}
            {reportsTable}
          </main>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: CITIZEN FRIENDLY PORTAL (TOP NAV CONTAINER LAYOUT)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-l from-[#005c4f] via-[#007766] to-[#0f172a] p-6 sm:p-8 text-white shadow-civic-2 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold text-white mb-3">
                <span>الصلاحية:</span>
                <span>{roleLabels[role]}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                أهلاً بك، {session.user.name || session.user.email}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/90">
                متابعة بلاغاتك وتحديثات المعالجة والإصلاح الميداني للأحياء
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/reports/new"
                className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-[#005c4f] hover:bg-[#ecfdf5] transition-colors shadow-xs"
              >
                + تقديم بلاغ جديد
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-civic-1">
            <span className="text-xs font-bold text-slate-500">إجمالي البلاغات</span>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-civic-1">
            <span className="text-xs font-bold text-[#d97706]">قيد المعالجة الميدانية</span>
            <p className="text-2xl font-black text-[#b45309] mt-1 font-mono">{inProgressCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-civic-1">
            <span className="text-xs font-bold text-[#16a34a]">تم الإصلاح والمعالجة</span>
            <p className="text-2xl font-black text-[#15803d] mt-1 font-mono">{resolvedCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-civic-1">
            <span className="text-xs font-bold text-[#d97706]">بانتظار توضيحي</span>
            <p className="text-2xl font-black text-[#b45309] mt-1 font-mono">{waitingCount}</p>
          </div>
        </div>

        {/* Reports Table Component */}
        {reportsTable}
      </main>

      <Footer />
    </div>
  );
}
