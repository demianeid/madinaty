"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import { ReportStatus } from "@prisma/client";
import { PublicReportDTO } from "@/lib/reports/service";

const LeafletMap = dynamic(
  () => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 animate-pulse border border-slate-200">
        جاري تحميل خريطة النطاق الجغرافي...
      </div>
    ),
  }
);

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRef = searchParams.get("ref") || "";

  const [referenceInput, setReferenceInput] = useState(initialRef);
  const [report, setReport] = useState<PublicReportDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchPublicReport = async (ref: string) => {
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage("يرجى إدخال الرقم المرجعي للبلاغ (مثال: MD-XXXX-XXXX).");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setHasSearched(true);

    try {
      const res = await fetch(`/api/reports/public?reference=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setReport(null);
        setErrorMessage(data.error || "لم يتم العثور على أي بلاغ مسجل بهذا الرقم المرجعي.");
      }
    } catch {
      setReport(null);
      setErrorMessage("فشل الاتصال بخادم الاستعلام. يرجى المحاولة لاحقاً.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (initialRef) {
      Promise.resolve().then(() => {
        if (!ignore) {
          fetchPublicReport(initialRef);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [initialRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceInput.trim()) {
      router.push(`/track?ref=${encodeURIComponent(referenceInput.trim().toUpperCase())}`);
      fetchPublicReport(referenceInput);
    }
  };

  const statusMeta = report ? REPORT_STATUS_METADATA[report.status] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-slate-800">الاستعلام العام وتتبع البلاغ</span>
        </div>

        {/* Search Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-civic-1 mb-8">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf5] border border-[#dce8e4] px-3.5 py-1 text-xs font-semibold text-[#007766] mb-3">
              <span>🔎</span>
              <span>بوابة الاستعلام والشفافية العامة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              تتبع حالة بلاغك البلدي
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              أدخل الرمز المرجعي العام للبلاغ للاطلاع على سير المعالجة الميدانية وقرارات الجهات المختصة
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                placeholder="MD-XXXX-XXXX"
                className="w-full uppercase font-mono tracking-wider rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-center font-bold focus:border-[#007766] focus:outline-none focus:ring-2 focus:ring-[#007766]/15"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto whitespace-nowrap rounded-lg bg-[#007766] hover:bg-[#005f52] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "جاري البحث..." : "استعلام"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 text-center font-mono">
              مثال: MD-7K2X-9P4W (يتم إرساله في إشعار تأكيد البلاغ)
            </p>
          </form>

          {errorMessage && (
            <div className="mt-6 rounded-lg bg-[#fef2f2] border border-[#fecaca] p-4 text-xs sm:text-sm text-[#dc2626] text-center font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-civic-1">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#007766] border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">جاري استرجاع تفاصيل البلاغ من السجل البلدي...</p>
          </div>
        )}

        {/* Report Result Display (Sanitized Public View) */}
        {!isLoading && report && statusMeta && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Status Header Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-civic-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#007766] bg-[#ecfdf5] px-3 py-1 rounded-md border border-[#dce8e4]">
                      #{report.publicReference}
                    </span>
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
                      {statusMeta.labelAr}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {report.category.labelAr}
                    </span>
                    {report.authority && (
                      <span className="rounded-md bg-[#eff4ff] text-[#005683] border border-[#d3e4fe] px-2.5 py-0.5 text-xs font-medium">
                        {report.authority.nameAr}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {report.title}
                  </h2>
                </div>

                <div className="text-left text-xs text-slate-400 font-medium">
                  <span>تاريخ التسجيل:</span>
                  <p className="font-bold text-slate-600 mt-0.5 font-mono">
                    {new Date(report.createdAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="pt-6">
                <h3 className="text-xs font-bold text-slate-400 mb-1">وصف البلاغ المقدم:</h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-[#f8fafc] rounded-lg p-4 border border-slate-100">
                  {report.description}
                </p>
              </div>

              {/* Resolution Summary (If resolved) */}
              {report.resolutionSummary && (
                <div className="mt-4 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] p-4">
                  <h3 className="text-xs font-bold text-[#166534] mb-1 flex items-center gap-1.5">
                    <span>✅</span>
                    <span>تقرير المعالجة والإصلاح الميداني:</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#14532d] leading-relaxed font-medium">
                    {report.resolutionSummary}
                  </p>
                </div>
              )}
            </div>

            {/* Approximate Geographic Location & Privacy Protection */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-civic-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📍</span>
                  <span>النطاق الجغرافي للبلاغ</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  نطاق تقريبي لحماية الخصوصية (~100م)
                </span>
              </div>

              {report.approximateLocation.addressText && (
                <p className="text-xs text-slate-600 mb-3 font-medium">
                  {report.approximateLocation.addressText}
                </p>
              )}

              <div className="rounded-lg overflow-hidden border border-slate-200">
                <LeafletMap
                  latitude={report.approximateLocation.latitude}
                  longitude={report.approximateLocation.longitude}
                  readOnly={true}
                  zoom={15}
                />
              </div>
            </div>

            {/* Timeline History */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-civic-1">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span>⏱️</span>
                <span>سجل المراحل والإجراءات الميدانية</span>
              </h3>

              <div className="space-y-4">
                {report.statusHistory.map((step, idx) => {
                  const stepMeta = REPORT_STATUS_METADATA[step.toStatus];
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-[#ecfdf5] text-[#007766] border border-[#dce8e4] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 font-mono">
                        {idx + 1}
                      </div>
                      <div className="flex-1 bg-[#f8fafc] rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800">
                            {stepMeta?.labelAr || step.toStatus}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(step.createdAt).toLocaleDateString("ar-EG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {step.reason && (
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            {step.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution Photos (If any) */}
            {report.resolutionPhotos && report.resolutionPhotos.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-civic-1">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span>📸</span>
                  <span>صور توثيق الإصلاح والمعالجة</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {report.resolutionPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="توثيق الإصلاح" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial Empty State */}
        {!isLoading && !report && !hasSearched && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-civic-1">
            <div className="text-4xl mb-3">🏛️</div>
            <h3 className="text-base font-bold text-slate-800">الاستعلام المباشر عبر البوابة البلدية</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              يمكن لأي مواطن متابعة مسار معالجة البلاغات البلدية بشفافية كاملة دون الحاجة لتسجيل الدخول، مع الحفاظ التام على سرية وخصوصية بيانات المبلغ.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
