"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/auth-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { REPORT_STATUS_METADATA, ALLOWED_TRANSITIONS } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";

interface ReportMediaItem {
  id: string;
  storageKey: string;
  mimeType: string;
  isResolutionPhoto: boolean;
  createdAt: string;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  reason: string | null;
  actorType: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface UpdateItem {
  id: string;
  body: string;
  createdAt: string;
  isPublic: boolean;
  author: {
    name: string | null;
    role: UserRole;
  };
}

interface InternalNoteItem {
  id: string;
  body: string;
  createdAt: string;
  author: {
    name: string | null;
    role: UserRole;
  };
}

interface AppealItem {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface RatingItem {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

interface ReportDetail {
  id: string;
  publicReference: string;
  title: string;
  description: string;
  status: ReportStatus;
  priority: string;
  latitude: number;
  longitude: number;
  addressText: string | null;
  resolutionSummary: string | null;
  version: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  category: {
    id: string;
    key: string;
    labelAr: string;
    labelEn: string;
  };
  authority: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
  } | null;
  media: ReportMediaItem[];
  statusHistory: StatusHistoryItem[];
  updates: UpdateItem[];
  internalNotes?: InternalNoteItem[];
  appeals: AppealItem[];
  ratings: RatingItem[];
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-600 font-medium">جاري التحميل...</p>
        </div>
      }
    >
      <ReportDetailContent params={params} />
    </Suspense>
  );
}

function ReportDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const reportIdOrRef = unwrappedParams.id;
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Citizen Action States
  const [clarificationBody, setClarificationBody] = useState("");
  const [submittingClarification, setSubmittingClarification] = useState(false);

  const [appealReason, setAppealReason] = useState("");
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Staff Action States
  const [selectedNextStatus, setSelectedNextStatus] = useState<ReportStatus | "">("");
  const [transitionReason, setTransitionReason] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [evidenceMediaIds, setEvidenceMediaIds] = useState<string[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [submittingTransition, setSubmittingTransition] = useState(false);

  // Internal Notes State
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [appealState, setAppealState] = useState<{ isAppealWindowActive: boolean; daysRemaining: number }>({
    isAppealWindowActive: true,
    daysRemaining: 7,
  });

  const computeAppealState = (rep: ReportDetail) => {
    const referenceDate = rep.resolvedAt ? new Date(rep.resolvedAt) : new Date(rep.updatedAt);
    const appealDeadlineMs = referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return {
      isAppealWindowActive: nowMs <= appealDeadlineMs,
      daysRemaining: Math.max(0, Math.ceil((appealDeadlineMs - nowMs) / (24 * 60 * 60 * 1000))),
    };
  };

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${reportIdOrRef}`);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        setAppealState(computeAppealState(data.report));
      } else {
        setErrorMessage(data.error || "تعذر جلب تفاصيل البلاغ.");
      }
    } catch {
      setErrorMessage("فشل الاتصال بالخادم. يرجى إعادة المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!sessionLoading && !session?.user) {
      router.push(`/login?redirect=/reports/${reportIdOrRef}`);
      return;
    }
    if (session?.user) {
      fetch(`/api/reports/${reportIdOrRef}`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            if (data.success && data.report) {
              setReport(data.report);
              setAppealState(computeAppealState(data.report));
            } else {
              setErrorMessage(data.error || "تعذر جلب تفاصيل البلاغ.");
            }
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            setErrorMessage("فشل الاتصال بالخادم. يرجى إعادة المحاولة.");
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [session, sessionLoading, reportIdOrRef, router]);

  // Citizen Submit Clarification
  const handleClarificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationBody.trim()) return;

    setSubmittingClarification(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${report?.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: clarificationBody }),
      });
      const data = await res.json();
      if (data.success) {
        setClarificationBody("");
        setSuccessMessage("تم إرسال التوضيح بنجاح واستئناف متابعة البلاغ.");
        await fetchReport();
      } else {
        setErrorMessage(data.error || "فشل إرسال التوضيح.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء الإرسال.");
    } finally {
      setSubmittingClarification(false);
    }
  };

  // Citizen Submit Appeal
  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;

    setSubmittingAppeal(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${report?.id}/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: appealReason }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAppealModal(false);
        setAppealReason("");
        setSuccessMessage("تم تسجيل الاعتراض بنجاح وإعادة فتح ملف البلاغ للدراسة.");
        await fetchReport();
      } else {
        setErrorMessage(data.error || "فشل تقديم الاعتراض.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء تقديم الاعتراض.");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // Citizen Submit Rating
  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRating(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${report?.id}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRatingModal(false);
        setSuccessMessage("شكراً لك! تم تسجيل تقييمك وإغلاق البلاغ نهائياً.");
        await fetchReport();
      } else {
        setErrorMessage(data.error || "فشل تسجيل التقييم.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء تسجيل التقييم.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Staff Transition Upload Evidence
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingEvidence(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.media) {
          setEvidenceMediaIds((prev) => [...prev, data.media.id]);
        }
      }
    } catch {
      setErrorMessage("تعذر رفع صور الإثبات الميدانية.");
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // Staff Status Transition
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStatus) return;

    setSubmittingTransition(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${report?.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStatus: selectedNextStatus,
          expectedVersion: report?.version,
          reason: transitionReason || undefined,
          repairDescription: repairDescription || undefined,
          evidenceMediaIds: evidenceMediaIds.length > 0 ? evidenceMediaIds : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedNextStatus("");
        setTransitionReason("");
        setRepairDescription("");
        setEvidenceMediaIds([]);
        setSuccessMessage("تم تحديث حالة البلاغ بنجاح.");
        await fetchReport();
      } else {
        setErrorMessage(data.error || "فشل تحديث حالة البلاغ.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء تحديث حالة البلاغ.");
    } finally {
      setSubmittingTransition(false);
    }
  };

  // Staff Add Internal Note
  const handleInternalNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteBody.trim()) return;

    setSubmittingNote(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/reports/${report?.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: internalNoteBody }),
      });
      const data = await res.json();
      if (data.success) {
        setInternalNoteBody("");
        setSuccessMessage("تمت إضافة الملاحظة الداخلية بنجاح.");
        await fetchReport();
      } else {
        setErrorMessage(data.error || "فشل إضافة الملاحظة الداخلية.");
      }
    } catch {
      setErrorMessage("حدث خطأ أثناء إضافة الملاحظة.");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600 font-medium">جاري تحميل تفاصيل البلاغ...</p>
      </div>
    );
  }

  if (errorMessage && !report) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-12 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-xs">
            <h1 className="text-xl font-bold text-red-800 mb-2">تعذر عرض البلاغ</h1>
            <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
            <Link
              href="/dashboard"
              className="inline-flex rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900"
            >
              العودة إلى لوحة التحكم
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!report) return null;

  const userRole = ((session?.user as Record<string, unknown>)?.role as UserRole) || UserRole.CITIZEN;
  const isReporter = report.createdById === session?.user?.id;
  const isStaffOrAdmin = userRole === UserRole.STAFF || userRole === UserRole.ADMIN;
  const statusMeta = REPORT_STATUS_METADATA[report.status];
  const { isAppealWindowActive, daysRemaining } = appealState;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
          <Link href="/dashboard" className="hover:text-emerald-700">
            لوحة التحكم
          </Link>
          <span>/</span>
          <span>البلاغات</span>
          <span>/</span>
          <span className="font-mono text-slate-700 font-bold">{report.publicReference}</span>
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            {successMessage}
          </div>
        )}

        {/* Citizen Action Callout: WAITING_FOR_RESIDENT */}
        {isReporter && report.status === ReportStatus.WAITING_FOR_RESIDENT && (
          <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold text-lg">
                !
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-amber-900 mb-1">
                  مطلوب توضيح إضافي لاستكمال معالجة البلاغ
                </h2>
                <p className="text-xs text-amber-800 mb-4 leading-relaxed">
                  قامت الجهة المختصة بطلب معلومات إضافية أو تدقيق في تفاصيل الموقع لتتمكن فرق العمل من إنجاز المهمة. يرجى تزويدهم بالتفاصيل أدناه.
                </p>

                <form onSubmit={handleClarificationSubmit} className="space-y-3">
                  <textarea
                    rows={3}
                    value={clarificationBody}
                    onChange={(e) => setClarificationBody(e.target.value)}
                    placeholder="اكتب التوضيح المطلوب هنا (مثال: الشارع المتفرع من شارع النصر بجوار الصيدلية)..."
                    className="w-full rounded-xl border border-amber-300 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingClarification}
                      className="rounded-xl bg-amber-700 px-5 py-2 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {submittingClarification ? "جاري الإرسال..." : "إرسال التوضيح واستئناف البلاغ"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Top Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  {report.publicReference}
                </span>
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
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
                  {statusMeta.labelAr}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {report.category.labelAr}
                </span>
                {report.authority && (
                  <span className="rounded-lg bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 text-xs font-semibold">
                    {report.authority.nameAr}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {report.title}
              </h1>
            </div>

            {/* Quick Actions (Appeal / Rate) */}
            <div className="flex items-center gap-2">
              {isReporter && (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.REJECTED) && (
                <>
                  {isAppealWindowActive ? (
                    <button
                      onClick={() => setShowAppealModal(true)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      تقديم اعتراض ({daysRemaining} أيام متبقية)
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      انتهت مهلة الاعتراض (7 أيام)
                    </span>
                  )}
                </>
              )}

              {isReporter && report.status === ReportStatus.RESOLVED && report.ratings.length === 0 && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  تقييم الخدمة وإغلاق البلاغ
                </button>
              )}
            </div>
          </div>

          {/* Description & Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="md:col-span-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                تفاصيل البلاغ والوصف
              </h2>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {report.description}
              </p>

              {report.resolutionSummary && (
                <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <h3 className="text-xs font-bold text-emerald-900 mb-1">تقرير المعالجة الميدانية:</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {report.resolutionSummary}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                الموقع الجغرافي
              </h2>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">العنوان التقريبي:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {report.addressText || "غير محدد بدقة"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">الإحداثيات:</span>
                  <p className="font-mono text-slate-700 mt-0.5" dir="ltr">
                    {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                  >
                    عرض على خرائط Google ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Media Attachments Gallery */}
          {report.media && report.media.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                الصور والمرفقات الميدانية ({report.media.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {report.media.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                  >
                    {/* Secure authorized media endpoint */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${img.id}`}
                      alt="مرفق البلاغ"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {img.isResolutionPhoto && (
                      <span className="absolute bottom-1 right-1 rounded-md bg-emerald-600/90 text-white text-[10px] px-1.5 py-0.5 font-bold">
                        صورة الإصلاح
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Staff Transition & Management Toolbar */}
        {isStaffOrAdmin && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>إدارة حالة البلاغ (خاص بالجهة المختصة)</span>
              <span className="text-xs font-normal text-slate-500">
                إصدار السجل: <span className="font-mono font-bold">{report.version}</span>
              </span>
            </h2>

            <form onSubmit={handleTransitionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الانتقال إلى مرحلة جديدة
                  </label>
                  {(() => {
                    const availableTransitions = ALLOWED_TRANSITIONS.filter(
                      (t) =>
                        t.from === report.status &&
                        (Array.isArray(t.allowedRoles) ? t.allowedRoles.includes(userRole) : false)
                    );

                    return availableTransitions.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
                        لا توجد مراحل تالية متاحة للبلاغ من حالته الحالية ({report.status}).
                      </div>
                    ) : (
                      <select
                        value={selectedNextStatus}
                        onChange={(e) => setSelectedNextStatus(e.target.value as ReportStatus)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        required
                      >
                        <option value="">-- اختر الحالة الجديدة المتاحة --</option>
                        {availableTransitions.map((rule) => (
                          <option key={rule.to} value={rule.to}>
                            {REPORT_STATUS_METADATA[rule.to]?.labelAr || rule.to} ({rule.to})
                            {rule.requiresReason ? " [يتطلب سبباً]" : ""}
                            {rule.requiresEvidence ? " [يتطلب إثباتاً]" : ""}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سبب الانتقال / الملاحظة
                  </label>
                  <input
                    type="text"
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    placeholder="مثال: وصول فرقة الصيانة إلى الموقع..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Special requirement when transitioning to RESOLVED */}
              {selectedNextStatus === ReportStatus.RESOLVED && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-emerald-900">
                    متطلبات إثبات المعالجة والإصلاح (إلزامية للمرحلة المكتملة)
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      وصف الأعمال المنفذة والإصلاح *
                    </label>
                    <textarea
                      rows={2}
                      value={repairDescription}
                      onChange={(e) => setRepairDescription(e.target.value)}
                      placeholder="صف بالتفصيل ما تم إنجازه (مثال: تم ردم الحفرة وإعادة السفلتة)..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      رفع صور الإثبات الميداني بعد الإصلاح
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleEvidenceUpload}
                      disabled={isUploadingEvidence}
                      className="block w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                    />
                    {evidenceMediaIds.length > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-700">
                        تم تجهيز {evidenceMediaIds.length} صورة إثبات معتمدة.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingTransition || !selectedNextStatus}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingTransition ? "جاري التحديث..." : "حفظ الانتقال رسمياً"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Timeline & Discussion Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status History Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">
              سجل المراحل والتدقيق الميداني (Timeline)
            </h2>

            <div className="relative border-r-2 border-slate-200 mr-3 pr-6 space-y-6">
              {report.statusHistory.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className="absolute -right-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-200" />

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">
                      {REPORT_STATUS_METADATA[item.toStatus]?.labelAr || item.toStatus}
                    </span>
                    <time className="font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleString("ar-EG", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>

                  {item.reason && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 mt-1 border border-slate-100">
                      {item.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Public Updates & Clarifications Thread */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                التحديثات والتوضيحات العامة
              </h2>

              {report.updates.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  لا توجد استفسارات أو توضيحات إضافية مسجلة بعد.
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {report.updates.map((update) => (
                    <div
                      key={update.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                        <span className="font-bold text-slate-800">
                          {update.author.name || "مستخدم"} ({update.author.role === "CITIZEN" ? "المواطن" : "الجهة المختصة"})
                        </span>
                        <time className="font-mono">
                          {new Date(update.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {update.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Clarification Box (available to reporter and staff anytime) */}
            <form onSubmit={handleClarificationSubmit} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <input
                type="text"
                value={clarificationBody}
                onChange={(e) => setClarificationBody(e.target.value)}
                placeholder="أضف تعقيباً أو تفصيلاً جديداً..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingClarification || !clarificationBody.trim()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                >
                  إرسال تعقيب
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Staff Only: Internal Notes Section */}
        {isStaffOrAdmin && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>ملاحظات العمل الداخلية (خاصة بالموظفين والإدارة فقط — غير مرئية للمواطن)</span>
              <span className="text-xs text-rose-600 font-semibold">سري داخلي</span>
            </h2>

            {report.internalNotes && report.internalNotes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {report.internalNotes.map((note) => (
                  <div key={note.id} className="rounded-xl bg-white p-3 border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                      <span className="font-bold text-slate-800">{note.author.name || "موظف"}</span>
                      <time className="font-mono">
                        {new Date(note.createdAt).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{note.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4">لا توجد ملاحظات داخلية مسجلة بعد.</p>
            )}

            <form onSubmit={handleInternalNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={internalNoteBody}
                onChange={(e) => setInternalNoteBody(e.target.value)}
                placeholder="اكتب ملاحظة فنية أو إدارية داخلية للزملاء..."
                className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-slate-700"
              />
              <button
                type="submit"
                disabled={submittingNote || !internalNoteBody.trim()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                إضافة ملاحظة
              </button>
            </form>
          </div>
        )}

        {/* Citizen Rating Information Display */}
        {report.ratings.length > 0 && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-emerald-900 mb-2">
              تقييم المواطن لخدمة الإصلاح
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex text-amber-500 text-lg">
                {"★".repeat(report.ratings[0].score)}
                {"☆".repeat(5 - report.ratings[0].score)}
              </div>
              <span className="text-xs font-bold text-emerald-800 font-mono">
                ({report.ratings[0].score} من 5)
              </span>
            </div>
            {report.ratings[0].comment && (
              <p className="text-xs text-emerald-800 italic">
                &ldquo;{report.ratings[0].comment}&rdquo;
              </p>
            )}
          </div>
        )}
      </main>

      {/* Appeal Submission Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              تقديم اعتراض رسمي على نتيجة البلاغ
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              وفقاً لحوكمة المنصة، يحق للمواطن الاعتراض خلال 7 أيام من تاريخ المعالجة أو الرفض. سيتم تحويل البلاغ للمراجعة والتدقيق الإداري.
            </p>

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أسباب الاعتراض ومبرراته *
                </label>
                <textarea
                  rows={4}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="اشرح بدقة لماذا تعتبر المعالجة غير مكتملة أو لماذا تعترض على الرفض..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || appealReason.trim().length < 10}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingAppeal ? "جاري الإرسال..." : "تأكيد تقديم الاعتراض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Submission Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              تقييم جودة المعالجة والإصلاح
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              رأيك يساهم في قياس أداء الجهات البلدية ومؤشرات جودة الحياة. إرسال التقييم سيؤكد إغلاق البلاغ نهائياً.
            </p>

            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  درجة الرضا العام
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className={`h-10 w-10 rounded-xl text-xl font-bold transition-colors ${
                        ratingScore >= star
                          ? "bg-amber-100 text-amber-600 border border-amber-300"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تعليق أو ملاحظة اختيارية
                </label>
                <textarea
                  rows={3}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="اكتب ملاحظاتك حول سرعة أو جودة الخدمة..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingRating ? "جاري الإرسال..." : "إرسال التقييم وإغلاق البلاغ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
