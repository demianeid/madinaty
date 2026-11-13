"use client";

import { useSession } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { UserRole } from "@prisma/client";

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

export default function AdminDashboardPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"AUDIT_LOGS" | "STATS" | "AUTHORITIES">("AUDIT_LOGS");

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLogMetadata, setSelectedLogMetadata] = useState<Record<string, unknown> | null>(null);

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

  if (sessionLoading || !session?.user || userRole !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600 font-medium">جاري التحقق من صلاحيات الإدارة العليا...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin Banner */}
        <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-emerald-950 to-teal-900 p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-200 mb-3">
                <span>🛡️</span>
                <span>بوابة الإدارة المركزية والرقابة العامة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                مركز تدقيق ومراقبة منصة مدينتي
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
                متابعة سجل التدقيق غير القابل للتعديل (Audit Log Inspector) وإدارة الجهات والسياسات البلدية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
              >
                العودة للوحة التشغيل
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => setActiveTab("AUDIT_LOGS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "AUDIT_LOGS"
                  ? "bg-white text-slate-900 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              📜 سجل التدقيق والرقابة ({totalLogs})
            </button>
            <button
              onClick={() => setActiveTab("STATS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "STATS"
                  ? "bg-white text-slate-900 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              📊 مؤشرات المنظومة وتوزيع الأعطال
            </button>
            <button
              onClick={() => setActiveTab("AUTHORITIES")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "AUTHORITIES"
                  ? "bg-white text-slate-900 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              🏛️ دليل الجهات المختصة والكوادر
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800">
            {errorMessage}
          </div>
        )}

        {/* TAB 1: Audit Log Inspector */}
        {activeTab === "AUDIT_LOGS" && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">سجل الأحداث والعمليات الإدارية</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  سجل غير قابل للتعديل يوثق جميع التغييرات على البلاغات وحسابات المستخدمين والقرارات
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <input
                  type="text"
                  placeholder="بحث في العملية أو المنفّذ أو المعرّف..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSearchQuery(val);
                      setPage(1);
                    });
                  }}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />

                {/* Entity Filter */}
                <select
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="ALL">كافة الكيانات</option>
                  <option value="Report">البلاغات (Report)</option>
                  <option value="User">المستخدمين (User)</option>
                  <option value="Authority">الجهات (Authority)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {logsLoading ? (
              <div className="py-20 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-xs text-slate-500 font-medium">جاري تحميل سجلات التدقيق...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-bold text-slate-700">لا توجد سجلات تدقيق تطابق معايير البحث</p>
                <p className="text-xs text-slate-400 mt-1">جرّب مسح حقول التصفية أو تغيير الكيان المحدد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">التاريخ والوقت</th>
                      <th className="py-3.5 px-4">المنفّذ (Actor)</th>
                      <th className="py-3.5 px-4">نوع العملية (Action)</th>
                      <th className="py-3.5 px-4">الكيان (Entity)</th>
                      <th className="py-3.5 px-4">معرّف الكيان (Entity ID)</th>
                      <th className="py-3.5 px-4 text-center">التفاصيل والبيانات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          {log.actorUser ? (
                            <div>
                              <p className="font-bold text-slate-900">{log.actorUser.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{log.actorUser.email}</p>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
                              {log.actorType}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 font-mono text-[11px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700">{log.entityType}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[140px] truncate">
                          {log.entityId}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.metadata ? (
                            <button
                              onClick={() => setSelectedLogMetadata(log.metadata)}
                              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                            >
                              عرض البيانات
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  الصفحة {page} من {totalPages} (إجمالي {totalLogs} سجل)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: System Stats & Metrics */}
        {activeTab === "STATS" && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="py-20 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-xs text-slate-500 font-medium">جاري احتساب مؤشرات المنظومة...</p>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-500">إجمالي البلاغات المسجلة</span>
                    <p className="text-3xl font-black text-slate-900 mt-2 font-mono">{stats.totalReports}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold text-emerald-600">الجهات البلدية الفعالة</span>
                    <p className="text-3xl font-black text-emerald-700 mt-2 font-mono">{stats.totalAuthorities}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold text-teal-600">التصنيفات والخدمات البلدية</span>
                    <p className="text-3xl font-black text-teal-700 mt-2 font-mono">{stats.totalCategories}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold text-slate-600">إجمالي المستخدمين</span>
                    <p className="text-3xl font-black text-slate-800 mt-2 font-mono">{stats.totalUsers}</p>
                  </div>
                </div>

                {/* Status Breakdown Grid */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-4">توزيع البلاغات حسب دورة الحياة</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {Object.entries(stats.reportsByStatus).map(([status, count]) => (
                      <div key={status} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <span className="text-[11px] font-bold text-slate-500 block truncate">{status}</span>
                        <p className="text-xl font-black text-slate-800 mt-1 font-mono">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users by Role */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-4">توزيع الحسابات حسب الأدوار</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(stats.usersByRole).map(([role, count]) => (
                      <div key={role} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <span className="text-xs font-bold text-slate-600">{role}</span>
                        <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 3: Authorities Directory */}
        {activeTab === "AUTHORITIES" && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xs p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4">دليل الجهات البلدية ونطاق المسؤولية</h2>
            {authoritiesLoading ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-xs text-slate-500 font-medium">جاري تحميل بيانات الجهات...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authorities.map((auth) => (
                  <div key={auth.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{auth.nameAr}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">{auth.name} ({auth.slug})</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        auth.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}>
                        {auth.isActive ? "نشطة" : "معطلة"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">الكوادر النشطة</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{auth.activeStaffCount}</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">البلاغات المسندة</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">{auth.reportsCount}</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">التصنيفات التابعة</span>
                        <span className="font-mono font-bold text-teal-700 text-sm">{auth.categoriesCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* JSON Metadata Viewer Modal */}
        {selectedLogMetadata && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">بيانات العملية الإدارية (Audit Metadata)</h3>
                <button
                  onClick={() => setSelectedLogMetadata(null)}
                  className="rounded-lg bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 flex-1 overflow-auto bg-slate-900 rounded-2xl p-4 text-emerald-400 font-mono text-xs" dir="ltr">
                <pre>{JSON.stringify(selectedLogMetadata, null, 2)}</pre>
              </div>
              <div className="mt-4 text-left">
                <button
                  onClick={() => setSelectedLogMetadata(null)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
