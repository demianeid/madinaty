"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";
import { Skeleton, SkeletonTable, AdminDashboardSkeleton } from "@/components/ui/skeleton";
import { StaffManagementPanel } from "@/components/admin/staff-management-panel";

interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  actorUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AdminStats {
  totalReports: number;
  reportsByStatus: Record<string, number>;
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalAuthorities: number;
  totalCategories: number;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorUser: { name: string; email: string; role: string } | null;
  }>;
}

interface AuthorityItem {
  id: string;
  slug: string;
  nameAr: string;
  name: string;
  contactEmail: string;
  description: string | null;
  isActive: boolean;
  activeStaffCount: number;
  reportsCount: number;
  categoriesCount: number;
  members: Array<{
    userId: string;
    name: string;
    email: string;
    membershipRole: string;
  }>;
}

const ENTITY_LABELS: Record<string, string> = {
  Report: "بلاغ بلدي",
  AuthorityMembership: "عضوية موظف / جهة",
  User: "حساب مستخدم",
  Authority: "جهة مختصة",
  Category: "تصنيف خدمي",
  ServiceArea: "نطاق جغرافي / حي",
};

const ROLE_LABELS: Record<string, { label: string; badge: string }> = {
  ADMIN: { label: "مدير النظام العام", badge: "bg-[#142D4E] text-white" },
  STAFF: { label: "طاقم العمليات الميدانية", badge: "bg-cyan-50 text-[#0891B2] border border-cyan-200" },
  CITIZEN: { label: "مواطن / مقيم", badge: "bg-slate-100 text-slate-700" },
};

const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  AUTHORITY_ADMIN: "مدير قطاع",
  TRIAGE: "منسق فرز",
  OPERATOR: "فني ميداني",
  VIEWER: "مراقب",
};

function formatActionLabel(action: string): { labelAr: string; style: string } {
  if (action.includes("REJECT") || action.includes("DELETE") || action.includes("SUSPEND") || action.includes("DEACTIVATE")) {
    return { labelAr: action, style: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (action.includes("RESOLVED") || action.includes("CREATE") || action.includes("APPROVED") || action.includes("ACTIVATE")) {
    return { labelAr: action, style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (action.includes("ASSIGNED") || action.includes("IN_PROGRESS")) {
    return { labelAr: action, style: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  return { labelAr: action, style: "bg-cyan-50 text-[#0891B2] border-cyan-200" };
}

function getActionArabicHint(action: string): string | null {
  if (action === "STAFF_CREATED") return "إنشاء حساب موظف جديد";
  if (action === "STAFF_UPDATED") return "تحديث صلاحية أو حالة موظف";
  if (action === "REPORT_CREATED") return "تسجيل بلاغ جديد";
  if (action.startsWith("REPORT_STATUS_TRANSITION_")) {
    const target = action.replace("REPORT_STATUS_TRANSITION_", "") as ReportStatus;
    const meta = REPORT_STATUS_METADATA[target];
    return meta ? `تحويل الحالة إلى: ${meta.labelAr}` : "تحديث حالة البلاغ";
  }
  if (action === "INTERNAL_NOTE_ADDED") return "إضافة ملاحظة داخلية";
  if (action === "REPORT_UPDATE_ADDED") return "إضافة تحديث أو توضيح";
  if (action === "APPEAL_SUBMITTED") return "تقديم اعتراض على البلاغ";
  return null;
}

export default function AdminDashboardPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"AUDIT_LOGS" | "STATS" | "AUTHORITIES" | "STAFF">("AUDIT_LOGS");

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedMetadata, setCopiedMetadata] = useState(false);

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Authorities State
  const [authorities, setAuthorities] = useState<AuthorityItem[]>([]);
  const [authoritiesLoading, setAuthoritiesLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [, startTransition] = useTransition();

  const userRole = (session?.user as Record<string, unknown>)?.role as UserRole | undefined;

  useEffect(() => {
    if (!sessionLoading) {
      if (!session?.user) {
        router.push("/login?redirect=/admin");
      } else if (userRole !== UserRole.ADMIN) {
        router.push("/dashboard");
      }
    }
  }, [session, sessionLoading, userRole, router]);

  // Fetch Audit Logs
  useEffect(() => {
    if (session?.user && userRole === UserRole.ADMIN && activeTab === "AUDIT_LOGS") {
      let isMounted = true;
      async function fetchLogs() {
        setLogsLoading(true);
        setErrorMessage("");
        try {
          const params = new URLSearchParams();
          params.set("page", String(page));
          params.set("limit", "15");
          if (entityFilter !== "ALL") params.set("entityType", entityFilter);
          if (searchQuery.trim()) params.set("q", searchQuery.trim());

          const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
          const data = await res.json();
          if (isMounted) {
            if (data.success) {
              setLogs(data.logs);
              setTotalPages(data.pagination.totalPages);
              setTotalLogs(data.pagination.total);
            } else {
              setErrorMessage(data.error || "فشل جلب سجلات التدقيق.");
            }
            setLogsLoading(false);
          }
        } catch {
          if (isMounted) {
            setErrorMessage("تعذر الاتصال بالخادم لجلب السجلات.");
            setLogsLoading(false);
          }
        }
      }
      fetchLogs();
      return () => {
        isMounted = false;
      };
    }
  }, [session, userRole, activeTab, page, entityFilter, searchQuery]);

  // Fetch Stats when Stats Tab Active
  useEffect(() => {
    if (session?.user && userRole === UserRole.ADMIN && activeTab === "STATS" && !stats) {
      let isMounted = true;
      async function fetchStats() {
        setStatsLoading(true);
        try {
          const res = await fetch("/api/admin/stats");
          const data = await res.json();
          if (isMounted && data.success) {
            setStats(data.stats);
          }
        } catch {
          // ignore
        } finally {
          if (isMounted) setStatsLoading(false);
        }
      }
      fetchStats();
      return () => {
        isMounted = false;
      };
    }
  }, [session, userRole, activeTab, stats]);

  // Fetch Authorities when Authorities Tab Active
  useEffect(() => {
    if (session?.user && userRole === UserRole.ADMIN && activeTab === "AUTHORITIES" && authorities.length === 0) {
      let isMounted = true;
      async function fetchAuthorities() {
        setAuthoritiesLoading(true);
        try {
          const res = await fetch("/api/admin/authorities");
          const data = await res.json();
          if (isMounted && data.success) {
            setAuthorities(data.authorities);
          }
        } catch {
          // ignore
        } finally {
          if (isMounted) setAuthoritiesLoading(false);
        }
      }
      fetchAuthorities();
      return () => {
        isMounted = false;
      };
    }
  }, [session, userRole, activeTab, authorities.length]);

  const handleCopyMetadata = async () => {
    if (!selectedLog?.metadata) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedLog.metadata, null, 2));
      setCopiedMetadata(true);
      setTimeout(() => setCopiedMetadata(false), 2000);
    } catch {
      // ignore
    }
  };

  if (sessionLoading || !session?.user || userRole !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900" dir="rtl">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
            </Link>
            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">مركز الرقابة والإدارة</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </header>
        <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AdminDashboardSkeleton />
        </main>
      </div>
    );
  }

  const hasLogFilters = entityFilter !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
            <MadinatyLogo variant="dark" priority className="h-8 w-auto object-contain" />
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 hidden sm:inline">مركز الرقابة والإدارة المركزية</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 text-xs font-bold text-slate-700 transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>لوحة التحكم</span>
          </Link>

          <NotificationBell variant="light" />

          <Link
            href="/settings"
            title="الإعدادات والملف الشخصي"
            className="flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-200/80 hover:border-cyan-200 px-2.5 py-1 text-xs transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-[#142D4E] text-white flex items-center justify-center font-bold text-[11px]">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "أ"}
            </div>
            <span className="font-semibold text-slate-800 hidden sm:inline max-w-[140px] truncate">
              {session.user.name || session.user.email}
            </span>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            خروج
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Admin Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-l from-[#0E7490] via-[#0891B2] to-[#142D4E] p-6 sm:p-7 text-white shadow-civic-2 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-44 h-44 rounded-full bg-cyan-300 translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-xs font-semibold text-white mb-2.5">
                <svg className="w-3.5 h-3.5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>بوابة الإدارة المركزية والرقابة العامة</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                مركز تدقيق ومراقبة منصة مدينتي
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-cyan-100/85">
                متابعة سجل التدقيق غير القابل للتعديل ومؤشرات الأداء ودليل الجهات المختصة بمحافظة الإسكندرية
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/25 px-4 py-2 text-xs font-bold text-white hover:bg-white/25 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span>العودة للوحة التحكم</span>
            </Link>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-civic-1 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("AUDIT_LOGS")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "AUDIT_LOGS"
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#142D4E]"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">سجل التدقيق والرقابة</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === "AUDIT_LOGS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {totalLogs}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STATS")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "STATS"
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#142D4E]"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="truncate">مؤشرات المنظومة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AUTHORITIES")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "AUTHORITIES"
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#142D4E]"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate">دليل الجهات والكوادر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAFF")}
            className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "STAFF"
                ? "bg-[#142D4E] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#142D4E]"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">إدارة الموظفين والهيئات</span>
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-xs font-bold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 1: Audit Log Inspector
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "AUDIT_LOGS" && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 overflow-hidden">
            {/* Filter Bar */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#142D4E] flex items-center gap-2">
                    <span>سجل الأحداث والعمليات الإدارية</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
                      {totalLogs}
                    </span>
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    سجل غير قابل للتعديل يوثق جميع التغييرات على البلاغات وحسابات المستخدمين والجهات
                  </p>
                </div>

                {hasLogFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setEntityFilter("ALL");
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="text-xs font-bold text-[#0891B2] hover:text-[#0E7490] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>إعادة ضبط التصفية</span>
                    <span className="text-slate-400">✕</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search with Icon */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="بحث بنوع العملية أو اسم المنفّذ أو معرّف الكيان..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      startTransition(() => {
                        setSearchQuery(val);
                        setPage(1);
                      });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white pr-9 pl-8 py-2 text-xs text-[#142D4E] placeholder-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setPage(1);
                      }}
                      className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      title="مسح البحث"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Entity Filter */}
                <select
                  aria-label="تصفية حسب الكيان"
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-[#142D4E] font-semibold focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] cursor-pointer shadow-xs sm:min-w-[200px]"
                >
                  <option value="ALL">كافة الكيانات</option>
                  <option value="Report">البلاغات البلدية (Report)</option>
                  <option value="AuthorityMembership">عضويات الموظفين (AuthorityMembership)</option>
                  <option value="User">المستخدمين (User)</option>
                  <option value="Authority">الجهات المختصة (Authority)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {logsLoading ? (
              <SkeletonTable rows={6} cols={6} />
            ) : logs.length === 0 ? (
              <div className="py-16 text-center px-4">
                <p className="text-sm font-bold text-slate-700">لا توجد سجلات تدقيق تطابق معايير البحث</p>
                <p className="text-xs text-slate-400 mt-1">جرّب مسح حقول التصفية أو تغيير الكيان المحدد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3.5 px-4">التاريخ والوقت</th>
                      <th className="py-3.5 px-4">المنفّذ</th>
                      <th className="py-3.5 px-4">العملية</th>
                      <th className="py-3.5 px-4">الكيان</th>
                      <th className="py-3.5 px-4">المعرّف</th>
                      <th className="py-3.5 px-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const actionBadge = formatActionLabel(log.action);
                      const hint = getActionArabicHint(log.action);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                            {new Date(log.createdAt).toLocaleString("ar-EG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            {log.actorUser ? (
                              <div>
                                <p className="font-bold text-[#142D4E]">{log.actorUser.name}</p>
                                <p className="text-[10px] text-[#64748B] font-mono">{log.actorUser.email}</p>
                              </div>
                            ) : (
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
                                {log.actorType}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${actionBadge.style}`}>
                                {actionBadge.labelAr}
                              </span>
                              {hint && (
                                <p className="text-[11px] text-slate-600 font-medium">{hint}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                              {ENTITY_LABELS[log.entityType] || log.entityType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] max-w-[140px] truncate" dir="ltr">
                            {log.entityId}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              {log.entityType === "Report" && (
                                <Link
                                  href={`/reports/${log.entityId}`}
                                  className="rounded-lg bg-[#0891B2] hover:bg-[#0E7490] px-2.5 py-1 text-[11px] font-bold text-white transition-colors shadow-2xs"
                                >
                                  عرض البلاغ
                                </Link>
                              )}
                              {log.entityType === "AuthorityMembership" && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("STAFF")}
                                  className="rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 text-[11px] font-bold text-[#0E7490] transition-colors cursor-pointer"
                                >
                                  إدارة الموظفين
                                </button>
                              )}
                              {log.metadata && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLog(log)}
                                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-[#142D4E] px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                                >
                                  التفاصيل
                                </button>
                              )}
                              {!log.metadata && log.entityType !== "Report" && log.entityType !== "AuthorityMembership" && (
                                <span className="text-slate-300 text-[11px]">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <span className="text-xs text-[#64748B] font-medium">
                  الصفحة <span className="font-mono font-bold text-slate-800">{page}</span> من{" "}
                  <span className="font-mono font-bold text-slate-800">{totalPages}</span> (إجمالي {totalLogs} سجل)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: System Stats & Metrics
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "STATS" && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="space-y-6" aria-busy="true">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-civic-1 space-y-2">
                      <Skeleton className="h-4 w-28 rounded-sm" />
                      <Skeleton className="h-9 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-civic-1 space-y-3">
                    <Skeleton className="h-5 w-44 rounded-md" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-civic-1 space-y-3">
                    <Skeleton className="h-5 w-44 rounded-md" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </div>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-civic-1">
                    <span className="text-xs font-bold text-[#64748B]">إجمالي البلاغات المسجلة</span>
                    <p className="text-3xl font-black text-[#142D4E] mt-2 font-mono">{stats.totalReports}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-civic-1">
                    <span className="text-xs font-bold text-[#047857]">الجهات البلدية الفعالة</span>
                    <p className="text-3xl font-black text-[#047857] mt-2 font-mono">{stats.totalAuthorities}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-civic-1">
                    <span className="text-xs font-bold text-[#0E7490]">التصنيفات والخدمات البلدية</span>
                    <p className="text-3xl font-black text-[#0891B2] mt-2 font-mono">{stats.totalCategories}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-civic-1">
                    <span className="text-xs font-bold text-[#64748B]">إجمالي المستخدمين</span>
                    <p className="text-3xl font-black text-[#142D4E] mt-2 font-mono">{stats.totalUsers}</p>
                  </div>
                </div>

                {/* Status Breakdown Grid */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-civic-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#142D4E]">توزيع البلاغات حسب دورة الحياة</h3>
                    <span className="text-xs text-slate-500 font-mono">الإجمالي: {stats.totalReports}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(stats.reportsByStatus).map(([statusKey, count]) => {
                      const meta = REPORT_STATUS_METADATA[statusKey as ReportStatus];
                      const pct = stats.totalReports > 0 ? Math.round((count / stats.totalReports) * 100) : 0;
                      return (
                        <div key={statusKey} className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#142D4E] truncate">
                              {meta?.labelAr || statusKey}
                            </span>
                            <span className="text-lg font-black text-[#0891B2] font-mono">{count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0891B2] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 w-9 text-left">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Users by Role */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-civic-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#142D4E]">توزيع الحسابات حسب الأدوار</h3>
                    <span className="text-xs text-slate-500 font-mono">الإجمالي: {stats.totalUsers}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(stats.usersByRole).map(([roleKey, count]) => {
                      const roleInfo = ROLE_LABELS[roleKey] || { label: roleKey, badge: "bg-slate-100 text-slate-700" };
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={roleKey} className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${roleInfo.badge}`}>
                              {roleInfo.label}
                            </span>
                            <span className="text-2xl font-black text-[#142D4E] font-mono">{count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#142D4E] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 w-9 text-left">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: Authorities Directory
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "AUTHORITIES" && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-civic-1 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#142D4E]">دليل الجهات البلدية ونطاق المسؤولية</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  استعراض الجهات المختصة، الكوادر المرتبطة بكل جهة، وحجم البلاغات المسندة إليها
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("STAFF")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-50 border border-cyan-200 px-3.5 py-2 text-xs font-bold text-[#0891B2] hover:bg-cyan-100 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>إدارة الكوادر والموظفين</span>
              </button>
            </div>

            {authoritiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32 rounded-sm" />
                        <Skeleton className="h-3 w-24 rounded-sm" />
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="rounded-lg bg-white p-2.5 border border-slate-100 text-center space-y-1">
                          <Skeleton className="h-3 w-16 mx-auto rounded-sm" />
                          <Skeleton className="h-5 w-8 mx-auto rounded-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authorities.map((auth) => (
                  <div key={auth.id} className="rounded-xl border border-slate-200/90 bg-[#F8FAFC] p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#142D4E] text-sm">{auth.nameAr}</h3>
                        <p className="text-[11px] text-[#64748B] font-mono truncate">{auth.contactEmail}</p>
                        {auth.description && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{auth.description}</p>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        auth.isActive ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]" : "bg-slate-200 text-slate-600"
                      }`}>
                        {auth.isActive ? "نشطة" : "معطلة"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                        <span className="text-[10px] text-[#64748B] block">الكوادر النشطة</span>
                        <span className="font-mono font-bold text-[#142D4E] text-sm">{auth.activeStaffCount}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                        <span className="text-[10px] text-[#64748B] block">البلاغات المسندة</span>
                        <span className="font-mono font-bold text-[#0891B2] text-sm">{auth.reportsCount}</span>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                        <span className="text-[10px] text-[#64748B] block">التصنيفات التابعة</span>
                        <span className="font-mono font-bold text-[#0E7490] text-sm">{auth.categoriesCount}</span>
                      </div>
                    </div>

                    {auth.members && auth.members.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 block">أبرز الكوادر المعينة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {auth.members.slice(0, 4).map((m) => (
                            <span
                              key={m.userId}
                              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200/80 px-2 py-1 text-[10px] font-semibold text-slate-700"
                              title={m.email}
                            >
                              <span className="truncate max-w-[140px]">{m.name}</span>
                              <span className="text-[#0891B2] font-bold">
                                ({MEMBERSHIP_ROLE_LABELS[m.membershipRole] || m.membershipRole})
                              </span>
                            </span>
                          ))}
                          {auth.members.length > 4 && (
                            <span className="inline-flex items-center rounded-lg bg-slate-200/70 px-2 py-1 text-[10px] font-bold text-slate-600">
                              +{auth.members.length - 4} آخرين
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 4: Staff & Sector Management
            ════════════════════════════════════════════════════════════════ */}
        {activeTab === "STAFF" && <StaffManagementPanel />}

        {/* JSON Metadata Viewer Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-civic-3 border border-slate-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-[#142D4E] text-sm">تفاصيل العملية الإدارية</h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {getActionArabicHint(selectedLog.action) || selectedLog.action} • {ENTITY_LABELS[selectedLog.entityType] || selectedLog.entityType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Human-readable Arabic summary of common metadata fields */}
              {selectedLog.metadata && (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                  {Object.entries(selectedLog.metadata).map(([k, v]) => {
                    const keyMap: Record<string, string> = {
                      fromStatus: "الحالة السابقة",
                      toStatus: "الحالة الجديدة",
                      reason: "السبب / الملاحظة",
                      name: "الاسم",
                      email: "البريد الإلكتروني",
                      membershipRole: "الدور الوظيفي",
                      sector: "القطاع",
                      isActive: "حالة التفعيل",
                      phoneNumberUpdated: "تم تحديث الهاتف",
                      publicReference: "الرقم المرجعي",
                    };
                    let displayVal = typeof v === "boolean" ? (v ? "نعم" : "لا") : String(v ?? "—");
                    if ((k === "fromStatus" || k === "toStatus") && typeof v === "string") {
                      displayVal = REPORT_STATUS_METADATA[v as ReportStatus]?.labelAr || v;
                    }
                    if (k === "membershipRole" && typeof v === "string") {
                      displayVal = MEMBERSHIP_ROLE_LABELS[v] || v;
                    }
                    return (
                      <div key={k} className="flex items-center justify-between gap-3 border-b border-slate-200/50 last:border-0 pb-1.5 last:pb-0">
                        <span className="font-semibold text-slate-500">{keyMap[k] || k}</span>
                        <span className="font-bold text-[#142D4E] text-left" dir="auto">{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Collapsible Raw JSON (for technical debugging only) */}
              <details className="mt-3 group">
                <summary className="text-[11px] font-bold text-slate-500 hover:text-[#0891B2] cursor-pointer select-none">
                  عرض البيانات التقنية الخام (JSON)
                </summary>
                <div className="mt-2 max-h-48 overflow-auto bg-slate-900 rounded-xl p-3.5 text-cyan-300 font-mono text-xs text-left" dir="ltr">
                  <pre className="text-left whitespace-pre-wrap break-words" dir="ltr">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </details>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyMetadata}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  {copiedMetadata ? "تم النسخ ✓" : "نسخ JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
