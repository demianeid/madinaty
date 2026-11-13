"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";

interface ReportSummary {
  id: string;
  publicReference: string;
  title: string;
  status: ReportStatus;
  createdAt: string;
  category: {
    key: string;
    labelAr: string;
    labelEn: string;
  };
  authority: {
    slug: string;
    nameAr: string;
  } | null;
  media: Array<{ id: string; storageKey: string; isResolutionPhoto: boolean }>;
}

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600 font-medium">جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const role = ((session.user as Record<string, unknown>).role as UserRole) || UserRole.CITIZEN;
  const roleLabels: Record<string, string> = {
    ADMIN: "مدير النظام العام",
    STAFF: "موظف جهة مختصة",
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-l from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700/60 px-3 py-1 text-xs font-semibold text-emerald-100 mb-3">
                <span>الصلاحية:</span>
                <span>{roleLabels[role] || "مواطن"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                أهلاً بك، {session.user.name || session.user.email}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/90">
                {role === UserRole.CITIZEN && "متابعة بلاغاتك وتحديثات المعالجة والإصلاح الميداني للأحياء"}
                {role === UserRole.STAFF && "طابور مهام وعمليات الجهة المختصة — معالجة التذاكر وتحديث الإجراءات"}
                {role === UserRole.ADMIN && "اللوحة المركزية — إدارة البلاغات، الرقابة العامة، وسجل التدقيق الشامل"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {role === UserRole.ADMIN && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>🛡️</span>
                  <span>بوابة الرقابة والتدقيق (Admin)</span>
                </Link>
              )}
              <Link
                href="/reports/new"
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-xs"
              >
                + تقديم بلاغ جديد
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500">
              {role === UserRole.STAFF ? "مهام الجهة المسندة" : "إجمالي البلاغات"}
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-amber-600">قيد المعالجة الميدانية</span>
            <p className="text-2xl font-black text-amber-700 mt-1 font-mono">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-emerald-600">تم الإصلاح والمعالجة</span>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{resolvedCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-orange-600">
              {role === UserRole.CITIZEN ? "بانتظار توضيحي" : "بانتظار رد المواطن"}
            </span>
            <p className="text-2xl font-black text-orange-700 mt-1 font-mono">{waitingCount}</p>
          </div>
        </div>

        {/* Reports Management Table Section */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {role === UserRole.CITIZEN && "بلاغاتي المسجلة"}
                {role === UserRole.STAFF && "طابور مهام الجهة المختصة"}
                {role === UserRole.ADMIN && "كافة بلاغات المنظومة"}
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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 w-full sm:w-56"
              />

              {/* Category Filter */}
              <select
                aria-label="تصفية حسب التصنيف"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer"
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
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer"
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
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          {reportsLoading ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
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
                    className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    تقديم بلاغك الأول
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
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
                      <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
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
                            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                              report.status === ReportStatus.RESOLVED
                                ? "bg-emerald-100 text-emerald-800"
                                : report.status === ReportStatus.REJECTED
                                ? "bg-red-100 text-red-800"
                                : report.status === ReportStatus.IN_PROGRESS
                                ? "bg-amber-100 text-amber-800"
                                : report.status === ReportStatus.WAITING_FOR_RESIDENT
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-800"
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
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
                          >
                            {role === UserRole.STAFF ? "معالجة التذكرة" : "عرض التفاصيل"}
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
      </main>

      <Footer />
    </div>
  );
}
