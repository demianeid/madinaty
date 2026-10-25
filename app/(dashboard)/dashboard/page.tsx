"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    labelAr: string;
    labelEn: string;
  };
  authority: {
    slug: string;
    nameAr: string;
  } | null;
  media: Array<{ id: string; storageKey: string; isResolutionPhoto: boolean }>;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    let ignore = false;
    if (session?.user) {
      const url = statusFilter
        ? `/api/reports?status=${encodeURIComponent(statusFilter)}`
        : "/api/reports";
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
  }, [session, statusFilter]);

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-l from-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-md mb-8">
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
                لوحة التحكم الموحدة لمنصة مدينتي — متابعة دورة حياة البلاغات والمهام الميدانية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/reports/new"
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-xs"
              >
                + تقديم بلاغ جديد
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500">إجمالي البلاغات</span>
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
            <span className="text-xs font-bold text-orange-600">بانتظار توضيح المواطن</span>
            <p className="text-2xl font-black text-orange-700 mt-1 font-mono">{waitingCount}</p>
          </div>
        </div>

        {/* Reports Management Table Section */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {role === UserRole.CITIZEN ? "بلاغاتي المسجلة" : "قائمة البلاغات والمهام"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                استعراض ومتابعة حالات البلاغات والتدقيق في تفاصيل الإصلاح
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs font-semibold text-slate-600">
                تصفية بالحالة:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">كافة الحالات</option>
                <option value={ReportStatus.NEW}>جديد</option>
                <option value={ReportStatus.IN_PROGRESS}>جاري العمل الميداني</option>
                <option value={ReportStatus.WAITING_FOR_RESIDENT}>بانتظار توضيح المواطن</option>
                <option value={ReportStatus.RESOLVED}>تمت المعالجة</option>
                <option value={ReportStatus.REJECTED}>مرفوض</option>
                <option value={ReportStatus.CLOSED}>مغلق نهائياً</option>
              </select>
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
              <h3 className="text-sm font-bold text-slate-700">لا توجد بلاغات مسجلة حالياً</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {role === UserRole.CITIZEN
                  ? "لم تقم بتقديم أي بلاغات حتى الآن. يمكنك الإبلاغ عن أي مشكلة أو تلف في البنية التحتية بسهولة."
                  : "لا توجد مهام أو بلاغات ضمن نطاق الاختصاص المحدد حالياً."}
              </p>
              {role === UserRole.CITIZEN && (
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
                    <th className="py-3 px-4">الجهة المسند إليها</th>
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
                          {report.category.labelAr}
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
      </main>

      <Footer />
    </div>
  );
}
