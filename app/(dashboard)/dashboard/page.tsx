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
import { StaffManagementPanel } from "@/components/admin/staff-management-panel";
import { ALEXANDRIA_DISTRICTS, ALEXANDRIA_SECTORS } from "@/lib/alexandria/sectors";
import type { AlexandriaSector } from "@prisma/client";

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
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [authorityFilter, setAuthorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [summaryCounts, setSummaryCounts] = useState<{
    total: number;
    new: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    closedOrRejected: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [nowMs] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState("");
  const [, startTransition] = useTransition();

  // Sidebar Controls for Staff/Admin
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<"REPORTS" | "STAFF">("REPORTS");
  const [canManageSectorStaff, setCanManageSectorStaff] = useState(false);
  const [sectorTeamStats, setSectorTeamStats] = useState<{ total: number; active: number } | null>(null);
  const [staffContext, setStaffContext] = useState<{
    authorityName: string;
    sector: AlexandriaSector | null;
    membershipRole: string;
    assignedAreaName: string | null;
  } | null>(null);

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
      if (districtFilter) params.set("serviceAreaId", districtFilter);
      if (sectorFilter) params.set("sector", sectorFilter);
      if (authorityFilter) params.set("authoritySlug", authorityFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const url = `/api/reports?${params.toString()}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.success && data.reports) {
              setReports(data.reports);
              if (data.summaryCounts) {
                setSummaryCounts(data.summaryCounts);
              }
              if (data.staffContext) {
                setStaffContext(data.staffContext);
              }
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
  }, [session, statusFilter, categoryFilter, districtFilter, sectorFilter, authorityFilter, searchQuery]);

  // Detect whether STAFF user is a Sector Authority Admin (AUTHORITY_ADMIN)
  useEffect(() => {
    const userRole = (session?.user as Record<string, unknown> | undefined)?.role as UserRole | undefined;
    if (userRole !== UserRole.STAFF) return;
    let alive = true;
    fetch("/api/admin/staff")
      .then(async (r) => {
        if (!alive || !r.ok) return;
        setCanManageSectorStaff(true);
        const data = await r.json().catch(() => null);
        if (alive && data?.success && Array.isArray(data.staff)) {
          const active = data.staff.filter((s: { isActive?: boolean }) => s.isActive).length;
          setSectorTeamStats({ total: data.staff.length, active });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session]);

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

  // Metrics calculation (uses stable server summaryCounts so cards never zero out while filtering)
  const totalCount = summaryCounts?.total ?? reports.length;
  const newCount = summaryCounts?.new ?? reports.filter((r) => r.status === ReportStatus.NEW).length;
  const inProgressCount =
    summaryCounts?.inProgress ??
    reports.filter(
      (r) => r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED
    ).length;
  const resolvedCount =
    summaryCounts?.resolved ??
    reports.filter(
      (r) => r.status === ReportStatus.RESOLVED || r.status === ReportStatus.CLOSED
    ).length;
  const waitingCount =
    summaryCounts?.waiting ??
    reports.filter((r) => r.status === ReportStatus.WAITING_FOR_RESIDENT).length;
  const closedOrRejectedCount =
    summaryCounts?.closedOrRejected ??
    reports.filter(
      (r) => r.status === ReportStatus.REJECTED || r.status === ReportStatus.CLOSED_NO_RESPONSE
    ).length;

  // Admin Executive KPIs
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const overdueSlaCount = reports.filter((r) => {
    const meta = REPORT_STATUS_METADATA[r.status];
    if (!meta?.slaActive) return false;
    const ageHours = (nowMs - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
    return ageHours > 48;
  }).length;

  // Scope visible districts in filter to staff's sector when applicable
  const visibleDistricts =
    role === UserRole.STAFF && staffContext?.sector
      ? ALEXANDRIA_DISTRICTS.filter((d) => d.sector === staffContext.sector)
      : ALEXANDRIA_DISTRICTS;

  const isSectorAdmin =
    role === UserRole.STAFF && staffContext?.membershipRole === "AUTHORITY_ADMIN";

  const sectorDistrictBreakdown = isSectorAdmin
    ? visibleDistricts.map((d) => {
        const dReports = reports.filter((r) => r.serviceAreaId === d.id);
        const resolved = dReports.filter(
          (r) => r.status === ReportStatus.RESOLVED || r.status === ReportStatus.CLOSED
        ).length;
        const inProgress = dReports.filter(
          (r) => r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED
        ).length;
        return {
          id: d.id,
          nameAr: d.nameAr,
          total: dReports.length,
          resolved,
          inProgress,
        };
      })
    : [];

  // Apply local overdue filter + sort order on displayed reports
  const displayedReports = (() => {
    let list = overdueOnly
      ? reports.filter((r) => {
          const meta = REPORT_STATUS_METADATA[r.status];
          if (!meta?.slaActive) return false;
          return (nowMs - new Date(r.createdAt).getTime()) / (1000 * 60 * 60) > 48;
        })
      : reports;

    if (sortOrder === "oldest") {
      list = [...list].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    return list;
  })();

  // Admin: Authority breakdown from reports
  const authorityBreakdown = role === UserRole.ADMIN
    ? Object.values(
        reports.reduce<Record<string, { slug: string; name: string; total: number; resolved: number; inProgress: number }>>((acc, r) => {
          const slug = r.authority?.slug || "__none__";
          const name = r.authority?.nameAr || "غير محددة";
          if (!acc[slug]) acc[slug] = { slug, name, total: 0, resolved: 0, inProgress: 0 };
          acc[slug].total++;
          if (r.status === ReportStatus.RESOLVED || r.status === ReportStatus.CLOSED) acc[slug].resolved++;
          if (r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED) acc[slug].inProgress++;
          return acc;
        }, {})
      ).sort((a, b) => b.total - a.total)
    : [];

  // Admin: 4-Sector breakdown from reports
  const sectorBreakdown = role === UserRole.ADMIN
    ? (Object.keys(ALEXANDRIA_SECTORS) as AlexandriaSector[]).map((sectorKey) => {
        const sectorReports = reports.filter((r) => r.sector === sectorKey);
        const resolved = sectorReports.filter(
          (r) => r.status === ReportStatus.RESOLVED || r.status === ReportStatus.CLOSED
        ).length;
        const inProgress = sectorReports.filter(
          (r) => r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED
        ).length;
        return {
          key: sectorKey,
          label: ALEXANDRIA_SECTORS[sectorKey].labelAr,
          short: ALEXANDRIA_SECTORS[sectorKey].shortAr,
          total: sectorReports.length,
          resolved,
          inProgress,
        };
      })
    : [];

  const hasActiveFilters = Boolean(
    statusFilter ||
      categoryFilter ||
      districtFilter ||
      sectorFilter ||
      authorityFilter ||
      overdueOnly ||
      sortOrder !== "newest" ||
      searchQuery.trim()
  );

  // Client-side table pagination (keeps KPIs & Map accurate across all fetched reports)
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(displayedReports.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedReports = displayedReports.slice(startIndex, startIndex + PAGE_SIZE);

  // Build visible page numbers with ellipsis for large counts
  const pageNumbers: Array<number | "..."> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

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
                {displayedReports.length}
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
                setDistrictFilter("");
                setSectorFilter("");
                setAuthorityFilter("");
                setOverdueOnly(false);
                setSortOrder("newest");
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

          {/* District Filter (Scoped to sector for STAFF, all 10 for ADMIN; hidden if locked to 1 district) */}
          {isOperationsRole && !(role === UserRole.STAFF && staffContext?.assignedAreaName) && (
            <div className="relative">
              <select
                aria-label="تصفية حسب الحي"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full sm:w-auto min-w-[150px] appearance-none rounded-xl border border-slate-300 bg-white pr-3 pl-8 py-2 text-xs text-slate-800 font-medium focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer shadow-xs"
              >
                <option value="">
                  {role === UserRole.STAFF && staffContext?.sector
                    ? `أحياء القطاع (${visibleDistricts.length})`
                    : `كافة الأحياء (${visibleDistricts.length})`}
                </option>
                {visibleDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          )}

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

          {/* Sort & Overdue Toggle (Operations only) */}
          {isOperationsRole && (
            <>
              <select
                aria-label="ترتيب البلاغات"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 font-medium focus:border-[#0891B2] focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
              </select>

              <button
                type="button"
                onClick={() => setOverdueOnly((v) => !v)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                  overdueOnly
                    ? "border-rose-300 bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>المتأخرة (+48س)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {reportsLoading ? (
        <SkeletonTable rows={5} cols={isOperationsRole ? 6 : 5} />
      ) : displayedReports.length === 0 ? (
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
          reports={paginatedReports}
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
            {paginatedReports.map((report) => {
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
                {paginatedReports.map((report) => {
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
                        <div className="space-y-1.5">
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
                          {/* Simple 3-step visual progress bar */}
                          {report.status !== ReportStatus.REJECTED && report.status !== ReportStatus.CLOSED_NO_RESPONSE && (
                            <div className="flex items-center gap-1 max-w-[110px]" title="مراحل التقدم: تسجيل ← تنفيذ ← إصلاح">
                              <span className="h-1 flex-1 rounded-full bg-[#0891B2]" />
                              <span
                                className={`h-1 flex-1 rounded-full ${
                                  report.status !== ReportStatus.NEW ? "bg-[#0891B2]" : "bg-slate-200"
                                }`}
                              />
                              <span
                                className={`h-1 flex-1 rounded-full ${
                                  report.status === ReportStatus.RESOLVED || report.status === ReportStatus.CLOSED
                                    ? "bg-emerald-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            </div>
                          )}
                        </div>
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

      {/* Numbered Pagination Footer */}
      {!reportsLoading && displayedReports.length > 0 && totalPages > 1 && (
        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            عرض <span className="font-mono font-bold text-slate-800">{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, displayedReports.length)}</span> من أصل{" "}
            <span className="font-mono font-bold text-slate-800">{displayedReports.length}</span> بلاغ
          </span>

          <div className="flex items-center gap-1" dir="ltr">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              aria-label="الصفحة السابقة"
            >
              <span>&lt;</span>
              <span className="hidden sm:inline">السابق</span>
            </button>

            {pageNumbers.map((num, idx) =>
              num === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400 font-mono">
                  ...
                </span>
              ) : (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-[32px] h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    safePage === num
                      ? "bg-[#0891B2] text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200"
                  }`}
                >
                  {num}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              aria-label="الصفحة التالية"
            >
              <span className="hidden sm:inline">التالي</span>
              <span>&gt;</span>
            </button>
          </div>
        </div>
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
          roleLabelOverride={
            role === UserRole.STAFF && staffContext
              ? staffContext.membershipRole === "AUTHORITY_ADMIN"
                ? "مدير القطاع"
                : staffContext.membershipRole === "TRIAGE"
                ? "منسق فرز"
                : staffContext.membershipRole === "OPERATOR"
                ? "فني ميداني"
                : undefined
              : undefined
          }
          userName={session.user.name || session.user.email}
          userEmail={session.user.email}
          activeFilter={statusFilter}
          onFilterChange={(st) => {
            setStatusFilter(st);
            setActiveView("REPORTS");
          }}
          canManageStaff={canManageSectorStaff}
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
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
              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden h-10 w-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-90 touch-manipulation flex items-center justify-center transition-all cursor-pointer"
                aria-label="فتح القائمة الجانبية"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight truncate">
                    {role === UserRole.STAFF ? "لوحة العمليات الميدانية" : "لوحة الرقابة والإدارة العامة"}
                  </h1>
                  {role === UserRole.ADMIN && (
                    <span className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200/80 text-[#0E7490] text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                      <svg className="w-3 h-3 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      مدير النظام العام
                    </span>
                  )}
                </div>

                {role === UserRole.STAFF && staffContext ? (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mt-0.5">
                    <span className="font-bold text-[#142D4E] truncate max-w-[200px] sm:max-w-none">
                      {staffContext.authorityName}
                    </span>
                    {staffContext.sector && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center rounded-md bg-cyan-50 border border-cyan-200/80 px-1.5 py-0.5 text-[10px] font-bold text-[#0891B2]">
                          {ALEXANDRIA_SECTORS[staffContext.sector]?.labelAr}
                        </span>
                      </>
                    )}
                    {staffContext.assignedAreaName && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="hidden sm:inline font-semibold text-slate-600">
                          {staffContext.assignedAreaName}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                    {role === UserRole.ADMIN
                      ? "إدارة المنظومة العامة • كافة جهات وقطاعات محافظة الإسكندرية"
                      : "طابور المهام المباشر وإدارة بلاغات المواطنين"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <NotificationBell variant="light" />

              <Link
                href="/settings"
                title="الإعدادات والملف الشخصي"
                className="flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-200/80 hover:border-cyan-200 px-2.5 py-1 text-xs transition-colors"
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white ${
                  role === UserRole.ADMIN ? "bg-[#142D4E]" : "bg-[#0891B2]"
                }`}>
                  {session.user.name?.[0]?.toUpperCase() || "م"}
                </div>
                <span className="font-semibold text-slate-700 hidden sm:inline truncate max-w-[140px]">
                  {session.user.name || session.user.email}
                </span>
                {role === UserRole.STAFF && (
                  <span className="badge-civic-pill badge-civic-info text-[10px] px-2 py-0.5 font-bold hidden sm:inline">
                    {staffContext
                      ? staffContext.membershipRole === "AUTHORITY_ADMIN"
                        ? "مدير القطاع"
                        : staffContext.membershipRole === "TRIAGE"
                        ? "منسق فرز"
                        : staffContext.membershipRole === "OPERATOR"
                        ? "فني ميداني"
                        : roleLabels[role]
                      : roleLabels[role]}
                  </span>
                )}
              </Link>
            </div>
          </header>

          {/* Operational Content Body */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-5">
            {activeView === "STAFF" && (canManageSectorStaff || role === UserRole.ADMIN) ? (
              <StaffManagementPanel />
            ) : (
              <>
            {/* ══ ADMIN: نظرة عامة على المنظومة (بانر خاص بالمدير) ══ */}
            {role === UserRole.ADMIN && (
              <div className="rounded-2xl bg-gradient-to-l from-[#0E7490] via-[#0891B2] to-[#142D4E] p-5 sm:p-6 text-white shadow-civic-2 overflow-hidden relative">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-cyan-300 translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <svg className="w-5 h-5 text-cyan-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-xs font-bold text-cyan-100 uppercase tracking-widest">
                        نظرة عامة على المنظومة
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
                      محافظة الإسكندرية
                    </h2>
                    <p className="text-sm text-cyan-100/85 mt-1">
                      {session.user.name || session.user.email} — مدير المنظومة العام
                    </p>
                  </div>

                  {/* Quick authority stats pills */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2">
                      <svg className="w-4 h-4 text-cyan-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-lg font-black text-white font-mono">6</span>
                      <span className="text-[11px] text-cyan-100 font-medium">جهات مختصة</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2">
                      <svg className="w-4 h-4 text-cyan-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-lg font-black text-white font-mono">4</span>
                      <span className="text-[11px] text-cyan-100 font-medium">قطاعات</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2">
                      <svg className="w-4 h-4 text-cyan-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span className="text-lg font-black text-white font-mono">10</span>
                      <span className="text-[11px] text-cyan-100 font-medium">أحياء إدارية</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metric Summary Ribbon */}
            <div className={`grid gap-2.5 sm:gap-4 ${role === UserRole.ADMIN ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
              {/* Card 1: Total */}
              <button
                type="button"
                onClick={() => { setStatusFilter(""); setActiveView("REPORTS"); }}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer relative overflow-hidden group ${
                  statusFilter === "" && activeView === "REPORTS"
                    ? role === UserRole.ADMIN
                      ? "border-[#0E7490] bg-cyan-50/70 shadow-sm ring-2 ring-[#0E7490]/25"
                      : "border-[#0891B2] bg-cyan-50/70 shadow-sm ring-2 ring-[#0891B2]/30"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] sm:text-xs font-bold ${
                    statusFilter === "" && activeView === "REPORTS"
                      ? role === UserRole.ADMIN ? "text-[#142D4E]" : "text-slate-500"
                      : "text-slate-500"
                  }`}>إجمالي البلاغات</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                    statusFilter === "" && activeView === "REPORTS"
                      ? role === UserRole.ADMIN ? "bg-[#142D4E] text-white" : "bg-[#0891B2] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">{totalCount}</p>
              </button>

              {/* Card 2: New (Admin only - shows NEW separately) */}
              {role === UserRole.ADMIN && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter("NEW"); setActiveView("REPORTS"); }}
                  className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                    statusFilter === "NEW"
                      ? "border-sky-400 bg-sky-50/80 shadow-sm ring-2 ring-sky-400/40"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold text-sky-700">جديد — قيد التعيين</span>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      statusFilter === "NEW" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-600"
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-sky-900 mt-2 font-mono">{newCount}</p>
                </button>
              )}

              {/* Card 3: In Progress */}
              <button
                type="button"
                onClick={() => { setStatusFilter("IN_PROGRESS"); setActiveView("REPORTS"); }}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                  statusFilter === "IN_PROGRESS"
                    ? "border-indigo-400 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-indigo-700">قيد العمل الميداني</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    statusFilter === "IN_PROGRESS" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-indigo-900 mt-2 font-mono">{inProgressCount}</p>
              </button>

              {/* Card 4: Waiting */}
              <button
                type="button"
                onClick={() => { setStatusFilter("WAITING_FOR_RESIDENT"); setActiveView("REPORTS"); }}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                  statusFilter === "WAITING_FOR_RESIDENT"
                    ? "border-amber-400 bg-amber-50/80 shadow-sm ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-amber-800">بانتظار رد المواطن</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    statusFilter === "WAITING_FOR_RESIDENT" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-900 mt-2 font-mono">{waitingCount}</p>
              </button>

              {/* Card 5: Resolved */}
              <button
                type="button"
                onClick={() => { setStatusFilter("RESOLVED"); setActiveView("REPORTS"); }}
                className={`text-right rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                  statusFilter === "RESOLVED"
                    ? "border-emerald-400 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-800">تمت المعالجة والإصلاح</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
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

            {/* ══ SECTOR ADMIN: Sector KPIs & District Breakdown ══ */}
            {isSectorAdmin && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                  {/* Sector KPI 1: Resolution Rate */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">نسبة إنجاز القطاع</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-[#0891B2] font-mono">{resolutionRate}%</span>
                        <span className="text-[10px] text-slate-400 font-medium">({resolvedCount}/{totalCount})</span>
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-cyan-50 border border-cyan-100 text-[#0891B2] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Sector KPI 2: Overdue SLA (>48h) */}
                  <button
                    type="button"
                    onClick={() => setOverdueOnly((v) => !v)}
                    className={`text-right rounded-2xl border p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      overdueOnly
                        ? "border-rose-300 bg-rose-50/70 ring-2 ring-rose-300/40"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">بلاغات متأخرة (+48س)</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className={`text-xl sm:text-2xl font-black font-mono ${overdueSlaCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                          {overdueSlaCount}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {overdueOnly ? "تصفية مفعّلة" : "اضغط للتصفية"}
                        </span>
                      </div>
                    </div>
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      overdueSlaCount > 0 ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-slate-50 text-slate-400"
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </button>

                  {/* Sector KPI 3: Active Sector Team */}
                  <button
                    type="button"
                    onClick={() => setActiveView("STAFF")}
                    className="text-right rounded-2xl border border-slate-200/90 bg-white hover:border-cyan-300 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">فريق القطاع النشط</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-[#142D4E] font-mono">
                          {sectorTeamStats ? sectorTeamStats.active : "—"}
                        </span>
                        <span className="text-[10px] text-[#0891B2] font-bold">
                          {sectorTeamStats ? `من ${sectorTeamStats.total} • إدارة الفريق ←` : "إدارة الفريق ←"}
                        </span>
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-slate-100 text-[#142D4E] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* District Breakdown inside Sector */}
                {sectorDistrictBreakdown.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <h2 className="text-xs font-bold text-[#142D4E] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        توزيع بلاغات القطاع حسب الأحياء
                      </h2>
                      {districtFilter ? (
                        <button
                          type="button"
                          onClick={() => setDistrictFilter("")}
                          className="text-[11px] font-bold text-[#0891B2] hover:underline cursor-pointer"
                        >
                          عرض كل الأحياء ✕
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {sectorDistrictBreakdown.length} أحياء
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-100">
                      {sectorDistrictBreakdown.map((d) => {
                        const pct = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
                        const isSelected = districtFilter === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setDistrictFilter((prev) => (prev === d.id ? "" : d.id))}
                            className={`text-right p-4 transition-colors cursor-pointer space-y-2 ${
                              isSelected ? "bg-cyan-50/80" : "hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold ${isSelected ? "text-[#0891B2]" : "text-slate-800"}`}>
                                {d.nameAr}
                              </span>
                              <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                {d.total}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0891B2] rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{pct}% منجز</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ ADMIN: Executive KPIs Strip ══ */}
            {role === UserRole.ADMIN && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                {/* KPI 1: Resolution Rate */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">نسبة الإنجاز الكلية</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xl sm:text-2xl font-black text-[#0891B2] font-mono">{resolutionRate}%</span>
                      <span className="text-[10px] text-slate-400 font-medium">({resolvedCount}/{totalCount})</span>
                    </div>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-cyan-50 border border-cyan-100 text-[#0891B2] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* KPI 2: Overdue SLA (>48h) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">متأخرة (+48 ساعة)</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${overdueSlaCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {overdueSlaCount}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">تجاوزت المهلة</span>
                    </div>
                  </div>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    overdueSlaCount > 0 ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-slate-50 text-slate-400"
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* KPI 4: Rejected / Closed No Response */}
                <button
                  type="button"
                  onClick={() => { setStatusFilter(ReportStatus.REJECTED); setActiveView("REPORTS"); }}
                  className={`text-right rounded-2xl border p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    statusFilter === ReportStatus.REJECTED
                      ? "border-rose-400 bg-rose-50/70 ring-2 ring-rose-400/30"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">مرفوضة / منتهية</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{closedOrRejectedCount}</span>
                      <span className="text-[10px] text-slate-400 font-medium">خارج التنفيذ</span>
                    </div>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            {/* ══ ADMIN: Dual Interactive Breakdown (Authorities + 4 Sectors) ══ */}
            {role === UserRole.ADMIN && (authorityBreakdown.length > 0 || sectorBreakdown.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Column 1: Authority Breakdown */}
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[#142D4E] flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      توزيع البلاغات بحسب الجهة المختصة
                    </h2>
                    {authorityFilter ? (
                      <button
                        type="button"
                        onClick={() => setAuthorityFilter("")}
                        className="text-[11px] font-bold text-[#0891B2] hover:underline cursor-pointer"
                      >
                        عرض الكل ✕
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">{authorityBreakdown.length} جهة</span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {authorityBreakdown.slice(0, 6).map((auth) => {
                      const resolvedPct = auth.total > 0 ? Math.round((auth.resolved / auth.total) * 100) : 0;
                      const isSelected = authorityFilter === auth.slug && auth.slug !== "__none__";
                      return (
                        <button
                          key={auth.slug}
                          type="button"
                          onClick={() => {
                            if (auth.slug === "__none__") return;
                            setAuthorityFilter((prev) => (prev === auth.slug ? "" : auth.slug));
                          }}
                          className={`w-full text-right flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer ${
                            isSelected ? "bg-cyan-50/80" : "hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isSelected ? "text-[#0891B2]" : "text-slate-800"}`}>
                              {auth.name}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0891B2] rounded-full transition-all"
                                  style={{ width: `${resolvedPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{resolvedPct}% منجز</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex gap-1">
                              {auth.inProgress > 0 && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                                  {auth.inProgress} جاري
                                </span>
                              )}
                              {auth.resolved > 0 && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                                  {auth.resolved} منجز
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-black text-slate-900 w-7 text-center bg-slate-100 rounded-md py-0.5">
                              {auth.total}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: 4 Sectors Breakdown */}
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[#142D4E] flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      توزيع البلاغات بحسب القطاعات الأربعة
                    </h2>
                    {sectorFilter ? (
                      <button
                        type="button"
                        onClick={() => setSectorFilter("")}
                        className="text-[11px] font-bold text-[#0891B2] hover:underline cursor-pointer"
                      >
                        عرض الكل ✕
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">4 قطاعات</span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sectorBreakdown.map((sec) => {
                      const sharePct = totalCount > 0 ? Math.round((sec.total / totalCount) * 100) : 0;
                      const isSelected = sectorFilter === sec.key;
                      return (
                        <button
                          key={sec.key}
                          type="button"
                          onClick={() => setSectorFilter((prev) => (prev === sec.key ? "" : sec.key))}
                          className={`w-full text-right flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer ${
                            isSelected ? "bg-cyan-50/80" : "hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isSelected ? "text-[#0891B2]" : "text-slate-800"}`}>
                              {sec.label}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#142D4E] rounded-full transition-all"
                                  style={{ width: `${sharePct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">{sharePct}% من الإجمالي</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex gap-1">
                              {sec.inProgress > 0 && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                                  {sec.inProgress} جاري
                                </span>
                              )}
                              {sec.resolved > 0 && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                                  {sec.resolved} منجز
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono font-black text-slate-900 w-7 text-center bg-slate-100 rounded-md py-0.5">
                              {sec.total}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── الخريطة الميدانية التفاعلية ── */}
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
              </>
            )}
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

          <Link
            href="/settings"
            title="الإعدادات والملف الشخصي"
            className="flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-200/80 hover:border-cyan-200 px-2.5 py-1 text-xs transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-[#0891B2] text-white flex items-center justify-center font-bold text-[11px]">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "م"}
            </div>
            <span className="font-semibold text-slate-800 hidden sm:inline max-w-[130px] truncate">
              {session.user.name || session.user.email}
            </span>
          </Link>

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

        {/* Citizen Action Required Alert Banner */}
        {waitingCount > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-900">
                  لديك {waitingCount} {waitingCount === 1 ? "بلاغ ينتظر" : "بلاغات تنتظر"} توضيحك لاستكمال المعالجة
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  يرجى الرد في أقرب وقت حتى لا يُغلق البلاغ تلقائياً لعدم الرد.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter(ReportStatus.WAITING_FOR_RESIDENT)}
              className="rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              عرض والرد الآن
            </button>
          </div>
        )}

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
