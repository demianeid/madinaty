"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";
import type { FieldMapReport } from "@/components/dashboard/field-map";
import { OpsReportsTable } from "@/components/dashboard/ops-reports-table";
import type { OpsReport } from "@/components/dashboard/ops-reports-table";
import { Skeleton, SkeletonTable, DashboardSkeleton } from "@/components/ui/skeleton";

// Dynamic import – Leaflet is SSR-incompatible
const FieldMap = dynamic(
  () => import("@/components/dashboard/field-map").then((m) => ({ default: m.FieldMap })),
  { ssr: false, loading: () => (
    <Skeleton className="w-full h-[280px] sm:h-[360px] md:h-[400px] rounded-xl" />
  )}
);

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

  // Field Map visibility toggle & Interactive Two-Way Sync
  const [mapVisible, setMapVisible] = useState(true);
  const [previewReport, setPreviewReport] = useState<OpsReport | null>(null);
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);

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
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
            </Link>
            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">لوحة التحكم</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </header>
        <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <DashboardSkeleton />
        </main>
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
  // REUSABLE REPORTS WRAPPER (HEADER + FILTERS + CONTENT)
  // -------------------------------------------------------------
  const reportsTable = (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
      {/* Header & Filter Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>
                {role === UserRole.CITIZEN && "بلاغاتي المسجلة"}
                {role === UserRole.STAFF && "طابور مهام وتذاكر الجهة"}
                {role === UserRole.ADMIN && "كافة بلاغات المنظومة البلدية"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
                {reports.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              استعراض ومتابعة حالات البلاغات والتدقيق في مراحل الإنجاز الميداني
            </p>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setCategoryFilter("");
                setSearchQuery("");
              }}
              className="text-xs font-bold text-[#0891B2] hover:text-[#0E7490] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>إعادة ضبط التصفية</span>
              <span className="text-slate-400">✕</span>
            </button>
          )}
        </div>

        {/* Responsive Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5">
          {/* Search Input with Icon */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
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
              className="w-full rounded-xl border border-slate-300 bg-white pr-9 pl-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 hover:text-slate-600 text-xs"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              aria-label="تصفية حسب التصنيف"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto min-w-[150px] appearance-none rounded-xl border border-slate-300 bg-white pr-3 pl-8 py-2 text-xs text-slate-800 font-medium focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer shadow-xs"
            >
              <option value="">كافة التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.labelAr}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              aria-label="تصفية حسب الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto min-w-[150px] appearance-none rounded-xl border border-slate-300 bg-white pr-3 pl-8 py-2 text-xs text-slate-800 font-medium focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer shadow-xs"
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
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {reportsLoading ? (
        <SkeletonTable rows={5} cols={isOperationsRole ? 6 : 5} />
      ) : reports.length === 0 ? (
        <div className="py-16 text-center px-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            ✓
          </div>
          <h3 className="text-sm font-bold text-slate-700">لا توجد بلاغات تطابق البحث</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {role === UserRole.CITIZEN
              ? "لم تقم بتقديم أي بلاغات حتى الآن أو لا توجد نتائج تطابق معايير التصفية."
              : "لا توجد مهام أو بلاغات مطابقة في طابور العمل حالياً."}
          </p>
          {role === UserRole.CITIZEN && !hasActiveFilters && (
            <div className="mt-4">
              <Link
                href="/reports/new"
                className="inline-flex rounded-xl bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
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
          previewReport={previewReport}
          onSelectPreviewReport={setPreviewReport}
          hoveredReportId={hoveredReportId}
          onHoverReport={setHoveredReportId}
          onReportUpdated={(id, newStatus) => {
            setReports((prev) =>
              prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
            );
          }}
        />
      ) : (
        /* Citizen Reports Table & Mobile Cards */
        <>
          {/* Mobile Citizen Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {reports.map((report) => {
              const meta = REPORT_STATUS_METADATA[report.status];
              return (
                <div key={`cit-${report.id}`} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#0891B2] bg-cyan-50 border border-cyan-200/90 px-2 py-0.5 rounded-md">
                      {report.publicReference}
                    </span>
                    <span
                      className={`badge-civic-pill text-[10px] ${
                        report.status === ReportStatus.NEW
                          ? "badge-status-new"
                          : report.status === ReportStatus.UNDER_REVIEW
                          ? "badge-status-under-review"
                          : report.status === ReportStatus.ASSIGNED
                          ? "badge-status-assigned"
                          : report.status === ReportStatus.IN_PROGRESS
                          ? "badge-status-in-progress"
                          : report.status === ReportStatus.WAITING_FOR_RESIDENT
                          ? "badge-workflow-condition"
                          : report.status === ReportStatus.RESOLVED
                          ? "badge-status-resolved"
                          : report.status === ReportStatus.CLOSED
                          ? "badge-status-closed"
                          : report.status === ReportStatus.CLOSED_NO_RESPONSE
                          ? "badge-status-closed-no-response"
                          : "badge-status-rejected"
                      }`}
                    >
                      {meta?.labelAr || report.status}
                    </span>
                  </div>

                  <Link href={`/reports/${report.id}`} className="font-bold text-slate-900 block text-sm line-clamp-2 leading-relaxed hover:text-[#0891B2] transition-colors">
                    {report.title}
                  </Link>

                  {report.addressText && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <span className="text-[10px] text-slate-500 truncate">{report.addressText}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {report.category?.labelAr || "عام"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(report.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/reports/${report.id}`}
                      className="w-full block py-2 text-center text-xs font-bold rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-[#0891B2] text-slate-700 transition-colors"
                    >
                      عرض تفاصيل البلاغ والمتابعة
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Citizen Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 min-w-[240px]">البلاغ والعنوان</th>
                  <th className="py-3 px-4 min-w-[130px]">التصنيف</th>
                  <th className="py-3 px-4 min-w-[140px]">الجهة المختصة</th>
                  <th className="py-3 px-4 min-w-[120px]">الحالة الحالية</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const meta = REPORT_STATUS_METADATA[report.status];
                  return (
                    <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0891B2] bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded text-[11px]">
                              {report.publicReference}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(report.createdAt).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                          <Link
                            href={`/reports/${report.id}`}
                            className="font-semibold text-slate-900 hover:text-[#0891B2] text-right block max-w-sm truncate transition-colors"
                          >
                            {report.title}
                          </Link>

                          {report.addressText && (
                            <div className="flex items-center gap-1 mt-1">
                              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{report.addressText}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium whitespace-nowrap">
                          {report.category?.labelAr || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {report.authority?.nameAr || "قيد التعيين الآلي"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`badge-civic-pill text-[11px] ${
                            report.status === ReportStatus.NEW
                              ? "badge-status-new"
                              : report.status === ReportStatus.UNDER_REVIEW
                              ? "badge-status-under-review"
                              : report.status === ReportStatus.ASSIGNED
                              ? "badge-status-assigned"
                              : report.status === ReportStatus.IN_PROGRESS
                              ? "badge-status-in-progress"
                              : report.status === ReportStatus.WAITING_FOR_RESIDENT
                              ? "badge-workflow-condition"
                              : report.status === ReportStatus.RESOLVED
                              ? "badge-status-resolved"
                              : report.status === ReportStatus.CLOSED
                              ? "badge-status-closed"
                              : report.status === ReportStatus.CLOSED_NO_RESPONSE
                              ? "badge-status-closed-no-response"
                              : "badge-status-rejected"
                          }`}
                        >
                          {meta?.labelAr || report.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 transition-colors shadow-xs"
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
        </>
      )}
    </div>
  );

  // -------------------------------------------------------------
  // VIEW 1: STAFF & ADMIN OPERATIONS CONSOLE (WITH SIDEBAR)
  // -------------------------------------------------------------
  if (isOperationsRole) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-clip" dir="rtl">
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
                className="md:hidden h-10 w-10 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="فتح القائمة الجانبية"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight">
                  {role === UserRole.STAFF ? "لوحة العمليات الميدانية" : "لوحة الرقابة والإدارة العامة"}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  طابور المهام المباشر وإدارة بلاغات المواطنين
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <NotificationBell variant="light" />

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs">
                <span className="font-semibold text-slate-700 hidden sm:inline truncate max-w-[120px]">
                  {session.user.name || session.user.email}
                </span>
                <span className="badge-civic-pill badge-civic-info text-[10px] px-2 py-0.5 font-bold">
                  {roleLabels[role]}
                </span>
              </div>
            </div>
          </header>

          {/* Operational Content Body */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-5">
            {/* Metric Summary Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Card 1: Total */}
              <button
                type="button"
                onClick={() => setStatusFilter("")}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer relative overflow-hidden group ${
                  statusFilter === ""
                    ? "border-[#0891B2] bg-cyan-50/70 shadow-sm ring-2 ring-[#0891B2]/30"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500">إجمالي البلاغات</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    statusFilter === "" ? "bg-[#0891B2] text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">{totalCount}</p>
              </button>

              {/* Card 2: In Progress */}
              <button
                type="button"
                onClick={() => setStatusFilter("IN_PROGRESS")}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer relative overflow-hidden group ${
                  statusFilter === "IN_PROGRESS"
                    ? "border-indigo-400 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-indigo-700">قيد العمل الميداني</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    statusFilter === "IN_PROGRESS" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-indigo-900 mt-2 font-mono">{inProgressCount}</p>
              </button>

              {/* Card 3: Waiting */}
              <button
                type="button"
                onClick={() => setStatusFilter("WAITING_FOR_RESIDENT")}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer relative overflow-hidden group ${
                  statusFilter === "WAITING_FOR_RESIDENT"
                    ? "border-amber-400 bg-amber-50/80 shadow-sm ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-amber-800">بانتظار رد المواطن</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    statusFilter === "WAITING_FOR_RESIDENT" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-900 mt-2 font-mono">{waitingCount}</p>
              </button>

              {/* Card 4: Resolved */}
              <button
                type="button"
                onClick={() => setStatusFilter("RESOLVED")}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer relative overflow-hidden group ${
                  statusFilter === "RESOLVED"
                    ? "border-emerald-400 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800">تمت المعالجة والإصلاح</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    statusFilter === "RESOLVED" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-2 font-mono">{resolvedCount}</p>
              </button>
            </div>

            {/* ── الخريطة الميدانية التفاعلية ───────────────────────────────── */}
            <section id="field-map" className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-civic-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center">
                    <svg className="h-4 w-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.25l-6.75-6.75a1.5 1.5 0 010-2.12L9 4.5m6 15.75l6.75-6.75a1.5 1.5 0 000-2.12L15 4.5" />
                      <circle cx="12" cy="10" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">الخريطة الميدانية</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">التوزيع الجغرافي للبلاغات على خريطة مدينتي</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMapVisible((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${mapVisible ? "rotate-0" : "rotate-180"}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                  <span>{mapVisible ? "إخفاء الخريطة" : "عرض الخريطة"}</span>
                </button>
              </div>

              {mapVisible && (
                <div className="rounded-xl overflow-hidden border border-slate-200/80">
                  <FieldMap
                    reports={reports.filter(
                      (r): r is FieldMapReport & typeof r =>
                        typeof r.latitude === "number" && typeof r.longitude === "number"
                    ) as FieldMapReport[]}
                    height="360px"
                    onSelectReport={(rep) => setPreviewReport(rep as unknown as OpsReport)}
                    hoveredReportId={hoveredReportId}
                    selectedReportId={previewReport?.id}
                  />
                </div>
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
      {/* Light Top Navigation Bar for Citizen */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
            <MadinatyLogo variant="dark" priority className="h-8 w-auto object-contain" />
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 hidden sm:inline">بوابة المواطن</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#06b6d4] text-white text-xs font-bold transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">تقديم بلاغ جديد</span>
          </Link>

          <NotificationBell variant="light" />

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs">
            <div className="h-6 w-6 rounded-full bg-[#0891B2] text-white flex items-center justify-center font-bold text-[11px]">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "م"}
            </div>
            <span className="font-semibold text-slate-800 hidden sm:inline max-w-[130px] truncate">
              {session.user.name || session.user.email}
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            خروج
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-3.5 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-l from-[#0E7490] via-[#0891B2] to-[#142D4E] p-5 sm:p-7 text-white shadow-civic-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-white mb-2">
                <span>الصلاحية:</span>
                <span>{roleLabels[role]}</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                أهلاً بك، {session.user.name || session.user.email}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-cyan-100/90">
                متابعة بلاغاتك وتحديثات المعالجة والإصلاح الميداني للأحياء
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link
                href="/reports/new"
                className="flex-1 sm:flex-none text-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0891B2] hover:bg-cyan-50 transition-colors shadow-xs"
              >
                + تقديم بلاغ جديد
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex-1 sm:flex-none text-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-civic-1">
            <span className="text-xs font-bold text-slate-500">إجمالي البلاغات</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 shadow-civic-1">
            <span className="text-xs font-bold text-[#0891B2]">قيد المعالجة</span>
            <p className="text-xl sm:text-2xl font-black text-[#0891B2] mt-1 font-mono">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-civic-1">
            <span className="text-xs font-bold text-emerald-800">تم الإصلاح</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 font-mono">{resolvedCount}</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-civic-1">
            <span className="text-xs font-bold text-amber-800">بانتظار توضيحي</span>
            <p className="text-xl sm:text-2xl font-black text-amber-900 mt-1 font-mono">{waitingCount}</p>
          </div>
        </div>

        {/* Reports Table Component */}
        {reportsTable}
      </main>
    </div>
  );
}
