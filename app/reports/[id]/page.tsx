"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "@/lib/auth/auth-client";
import { MadinatyLogo } from "@/components/ui/madinaty-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { REPORT_STATUS_METADATA, ALLOWED_TRANSITIONS } from "@/lib/reports/lifecycle";
import { ReportStatus, UserRole } from "@prisma/client";
import { Skeleton, ReportDetailSkeleton } from "@/components/ui/skeleton";

const LeafletMap = dynamic(
  () => import("@/components/maps/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[200px] w-full rounded-xl" />
    ),
  }
);

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
  aiValidationResult?: string | null;
  aiConfidence?: number | null;
  aiReviewState?: string | null;
}

function statusBadgeClass(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.NEW:
      return "badge-status-new";
    case ReportStatus.UNDER_REVIEW:
      return "badge-status-under-review";
    case ReportStatus.ASSIGNED:
      return "badge-status-assigned";
    case ReportStatus.IN_PROGRESS:
      return "badge-status-in-progress";
    case ReportStatus.WAITING_FOR_RESIDENT:
      return "badge-workflow-condition";
    case ReportStatus.RESOLVED:
      return "badge-status-resolved";
    case ReportStatus.CLOSED:
      return "badge-status-closed";
    case ReportStatus.CLOSED_NO_RESPONSE:
      return "badge-status-closed-no-response";
    case ReportStatus.REJECTED:
      return "badge-status-rejected";
    default:
      return "badge-status-new";
  }
}

function formatClearArabicDateTime(dateStr: string): { date: string; time: string; full: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: "", full: dateStr };

  const date = d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date, time, full: `${date} • ${time}` };
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
          <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
              </Link>
              <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">تفاصيل البلاغ</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </header>
          <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <ReportDetailSkeleton />
          </main>
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
  const [copiedRef, setCopiedRef] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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

  const handleCopyRef = async () => {
    if (!report?.publicReference) return;
    try {
      await navigator.clipboard.writeText(report.publicReference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

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
        setSuccessMessage("تم تسجيل تقييمك بنجاح. نشكرك لمشاركتنا رأيك.");
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
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
            </Link>
            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">تفاصيل البلاغ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </header>
        <main className="flex-1 container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <ReportDetailSkeleton />
        </main>
      </div>
    );
  }

  if (errorMessage && !report) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <MadinatyLogo variant="dark" className="h-8 w-auto object-contain" />
            </Link>
            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">تفاصيل البلاغ</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#0891B2] text-xs font-bold text-slate-700 transition-all shadow-xs"
          >
            <span>لوحة التحكم</span>
          </Link>
        </header>
        <main className="flex-1 container mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm space-y-4">
            <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">تعذر عرض تفاصيل البلاغ</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{errorMessage}</p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
              >
                العودة إلى لوحة التحكم
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!report) return null;

  const userRole = ((session?.user as Record<string, unknown>)?.role as UserRole) || UserRole.CITIZEN;
  const isReporter = report.createdById === session?.user?.id;
  const isStaffOrAdmin = userRole === UserRole.STAFF || userRole === UserRole.ADMIN;
  const statusMeta = REPORT_STATUS_METADATA[report.status];
  const { isAppealWindowActive, daysRemaining } = appealState;

  const problemPhotos = report.media?.filter((m) => !m.isResolutionPhoto) || [];
  const resolutionPhotos = report.media?.filter((m) => m.isResolutionPhoto) || [];

  const createdDateTime = formatClearArabicDateTime(report.createdAt);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900" dir="rtl">
      {/* Light Top Navigation Bar for Report Detail */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
            <MadinatyLogo variant="dark" priority className="h-8 w-auto object-contain" />
          </Link>
          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 hidden sm:inline">تفاصيل وتحديثات البلاغ</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 text-xs font-bold text-slate-700 transition-all shadow-xs"
          >
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>لوحة التحكم</span>
          </Link>

          <NotificationBell variant="light" />

          {session?.user && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs">
              <div className="h-6 w-6 rounded-full bg-[#0891B2] text-white flex items-center justify-center font-bold text-[11px]">
                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "م"}
              </div>
              <span className="font-semibold text-slate-800 hidden sm:inline max-w-[130px] truncate">
                {session.user.name || session.user.email}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-7xl px-3.5 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-[#0891B2] hover:text-[#0E7490] hover:underline"
          >
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>لوحة التحكم</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span>البلاغات</span>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-800 font-bold">{report.publicReference}</span>
        </nav>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 animate-in fade-in">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
            {successMessage}
          </div>
        )}

        {/* Citizen Action Callout: WAITING_FOR_RESIDENT */}
        {isReporter && report.status === ReportStatus.WAITING_FOR_RESIDENT && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 font-bold text-lg">
                <svg className="w-5 h-5 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-amber-900">
                  مطلوب توضيح إضافي لاستكمال معالجة البلاغ
                </h2>
                <p className="text-xs text-amber-800 leading-relaxed">
                  قامت الجهة المختصة بطلب معلومات إضافية أو تدقيق في تفاصيل الموقع لتتمكن فرق العمل من إنجاز المهمة. يرجى تزويدهم بالتفاصيل أدناه.
                </p>

                <form onSubmit={handleClarificationSubmit} className="space-y-3 pt-2">
                  <textarea
                    rows={3}
                    value={clarificationBody}
                    onChange={(e) => setClarificationBody(e.target.value)}
                    placeholder="اكتب التوضيح المطلوب هنا (مثال: الشارع المتفرع من شارع النصر بجوار الصيدلية)..."
                    className="w-full rounded-xl border border-amber-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-xs"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingClarification}
                      className="rounded-xl bg-amber-700 hover:bg-amber-800 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {submittingClarification ? "جاري الإرسال..." : "إرسال التوضيح واستئناف البلاغ"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── TOP HERO HEADER CARD (Clean, Emoji-Free, Clear Date) ── */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-civic-1 space-y-4">
          {/* Card Top Row: Code + Status Badge (Right) & Clear Date / Time Badge (Left) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Reference Code Pill with SVG Copy */}
              <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#0891B2] bg-cyan-50 border border-cyan-200/90 px-3 py-1 rounded-lg">
                <span>{report.publicReference}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 hover:text-slate-900 text-slate-400 hover:bg-cyan-100 rounded transition-colors"
                  title="نسخ رقم البلاغ"
                  aria-label="نسخ"
                >
                  {copiedRef ? (
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Status Pill */}
              <span className={`badge-civic-pill ${statusBadgeClass(report.status)} text-[11px] font-bold`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 ml-1 inline-block" />
                <span>{statusMeta.labelAr}</span>
              </span>
            </div>

            {/* Clear, Prominent Date & Time Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto">
              <svg className="w-4 h-4 text-[#0891B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>تاريخ التسجيل:</span>
              <span className="font-bold text-slate-900">{createdDateTime.date}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-600 font-bold" dir="ltr">{createdDateTime.time}</span>
            </div>
          </div>

          {/* Title & Citizen Field Description */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug tracking-tight">
              {report.title}
            </h1>

            {/* Field Description Box */}
            <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">الوصف الميداني المقدم من المواطن:</span>
              <p className="text-slate-800 font-medium">{report.description || "لا يوجد وصف كتابي إضافي مرفق."}</p>
            </div>

            {/* Resolution Summary (If resolved) */}
            {report.resolutionSummary && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>تقرير المعالجة الميدانية والإنجاز:</span>
                </span>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {report.resolutionSummary}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Metadata Tags Ribbon (Organized & Emoji-Free) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Tag */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{report.category.labelAr}</span>
              </span>

              {/* Authority Tag */}
              {report.authority && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-50 text-[#0891B2] border border-cyan-200/90 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{report.authority.nameAr}</span>
                </span>
              )}

              {/* AI Validation Tag */}
              {report.aiValidationResult && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                    report.aiValidationResult === "VALID"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-purple-50 text-purple-800 border-purple-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>{report.aiValidationResult === "VALID" ? "فحص ذكي: مطابق للبلاغات البلدية" : "فحص ذكي: قيد المراجعة البشرية"}</span>
                </span>
              )}
            </div>

            {/* Quick Action Buttons for Citizens (Appeal / Rating) */}
            <div className="flex items-center gap-2">
              {isReporter && (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.REJECTED) && (
                <>
                  {isAppealWindowActive ? (
                    <button
                      type="button"
                      onClick={() => setShowAppealModal(true)}
                      className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 text-xs font-bold text-rose-700 transition-colors shadow-xs cursor-pointer"
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
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-4 py-2 text-xs font-bold text-white transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>تقييم الخدمة وإغلاق البلاغ</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 2-COLUMN RESPONSIVE ARCHITECTURE ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── MAIN COLUMN (2 Cols on Desktop: Media, Updates, Timeline) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* 2. Photo Documentation Gallery */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-civic-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>التوثيق المصور المرفق ({report.media?.length || 0})</span>
                </h2>
                {report.media && report.media.length > 0 && (
                  <span className="text-[11px] text-slate-400">انقر على أي صورة لتكبيرها</span>
                )}
              </div>

              {(!report.media || report.media.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500">لم يرفق المواطن صوراً ميدانية مع هذا البلاغ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Problem Photos */}
                  {problemPhotos.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-2">صور المشكلة (قبل البدء):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {problemPhotos.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedPhoto(`/api/media/${m.id}`)}
                            className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-xs hover:border-[#0891B2] transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/media/${m.id}`}
                              alt="صورة المشكلة"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-bold bg-black/60 px-2.5 py-1 rounded-md transition-opacity">
                                تكبير
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Photos */}
                  {resolutionPhotos.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 block mb-2">توثيق الإصلاح الميداني (بعد المعالجة):</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {resolutionPhotos.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedPhoto(`/api/media/${m.id}`)}
                            className="group relative aspect-4/3 rounded-xl overflow-hidden border-2 border-emerald-300 bg-emerald-50 cursor-pointer shadow-xs hover:border-emerald-500 transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/media/${m.id}`}
                              alt="توثيق الإصلاح"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-bold bg-black/60 px-2.5 py-1 rounded-md transition-opacity">
                                تكبير
                              </span>
                            </div>
                            <span className="absolute bottom-1 right-1 rounded-md bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>تم الإصلاح</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Public Updates & Thread */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-civic-1 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                التحديثات والتواصل الميداني
              </h2>

              {report.updates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                  لا توجد استفسارات أو تعقيبات إضافية مسجلة بعد.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {report.updates.map((update) => (
                    <div
                      key={update.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{update.author.name || "مستخدم"}</span>
                          <span className="text-[10px] text-[#0891B2] bg-cyan-50 px-1.5 py-0.5 rounded font-mono">
                            {update.author.role === "CITIZEN" ? "المواطن" : "الجهة المختصة"}
                          </span>
                        </span>
                        <time className="font-mono text-[10px]">
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

              {/* Add Clarification Box */}
              <form onSubmit={handleClarificationSubmit} className="pt-2 flex gap-2">
                <input
                  type="text"
                  value={clarificationBody}
                  onChange={(e) => setClarificationBody(e.target.value)}
                  placeholder="أضف تعقيباً أو تفصيلاً جديداً..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] shadow-xs"
                />
                <button
                  type="submit"
                  disabled={submittingClarification || !clarificationBody.trim()}
                  className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] px-4 py-2 text-xs font-bold text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  إرسال
                </button>
              </form>
            </div>

            {/* 4. Lifecycle Timeline Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-civic-1 space-y-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                سجل المراحل والتدقيق الميداني (Audit Timeline)
              </h2>

              <div className="relative border-r-2 border-slate-200 mr-2 pr-5 space-y-5 pt-1">
                {report.statusHistory.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Bullet */}
                    <div className="absolute -right-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#0891B2] ring-2 ring-cyan-100" />

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1 flex-wrap gap-2">
                      <span className="font-bold text-slate-800">
                        {REPORT_STATUS_METADATA[item.toStatus]?.labelAr || item.toStatus}
                      </span>
                      <time
                        dateTime={new Date(item.createdAt).toISOString()}
                        className="inline-flex items-center gap-1.5 bg-transparent py-0.5 text-[11px] font-semibold text-slate-700"
                      >
                        <svg className="w-3.5 h-3.5 text-[#0891B2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("ar-EG", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-800 font-bold">
                          {new Date(item.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </time>
                    </div>

                    {item.reason && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 mt-1 border border-slate-100 leading-relaxed">
                        {item.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── SIDE RAIL (1 Col on Desktop: Location, Actions Console, Internal Notes) ── */}
          <div className="space-y-6">

            {/* 1. Geographic Location Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-civic-1 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  الموقع الجغرافي الميداني
                </h2>
              </div>

              {/* Map */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <LeafletMap
                  latitude={report.latitude}
                  longitude={report.longitude}
                  readOnly
                  height="190px"
                  showBoundaryNotice={false}
                />
              </div>

              {/* Address & Navigation */}
              <div className="space-y-2 text-xs pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">العنوان التقريبي:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {report.addressText || "غير محدد بدقة"}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">الإحداثيات الجغرافية:</span>
                  <p className="font-mono text-slate-600 mt-0.5 text-[11px]" dir="ltr">
                    {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                  </p>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition-colors shadow-xs"
                  >
                    <span>فتح الملاحة عبر خرائط Google</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Staff/Admin Transition & Operations Console */}
            {isStaffOrAdmin && (
              <div className="rounded-2xl border border-cyan-200/90 bg-gradient-to-b from-cyan-50/40 to-white p-5 shadow-civic-1 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#0891B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    إدارة المعالجة والحالة الميدانية
                  </h2>
                  <span className="text-[10px] text-slate-400 font-mono">v{report.version}</span>
                </div>

                <form onSubmit={handleTransitionSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المرحلة الميدانية التالية
                    </label>
                    {(() => {
                      const availableTransitions = ALLOWED_TRANSITIONS.filter(
                        (t) =>
                          t.from === report.status &&
                          (Array.isArray(t.allowedRoles) ? t.allowedRoles.includes(userRole) : false)
                      );

                      return availableTransitions.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500 font-medium">
                          لا توجد مراحل تالية متاحة للبلاغ من حالته الحالية.
                        </div>
                      ) : (
                        <select
                          value={selectedNextStatus}
                          onChange={(e) => setSelectedNextStatus(e.target.value as ReportStatus)}
                          disabled={submittingTransition}
                          className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 font-semibold focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] shadow-xs cursor-pointer disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          required
                        >
                          <option value="">-- اختر الحالة الجديدة --</option>
                          {availableTransitions.map((rule) => (
                            <option key={rule.to} value={rule.to}>
                              {REPORT_STATUS_METADATA[rule.to]?.labelAr || rule.to}
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
                      سبب التحويل / الملاحظة
                    </label>
                    <input
                      type="text"
                      value={transitionReason}
                      onChange={(e) => setTransitionReason(e.target.value)}
                      disabled={submittingTransition}
                      placeholder="مثال: وصول فرقة الصيانة إلى الموقع..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] shadow-xs disabled:bg-slate-50 disabled:opacity-60"
                    />
                  </div>

                  {/* Resolution fields when selecting RESOLVED */}
                  {selectedNextStatus === ReportStatus.RESOLVED && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-3">
                      <h3 className="text-xs font-bold text-emerald-800">
                        توثيق الإصلاح الميداني
                      </h3>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          وصف الأعمال المنفذة (اختياري)
                        </label>
                        <textarea
                          rows={2}
                          value={repairDescription}
                          onChange={(e) => setRepairDescription(e.target.value)}
                          placeholder="صف ما تم إنجازه..."
                          className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-900 shadow-xs resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          رفع صور الإثبات بعد الإصلاح
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleEvidenceUpload}
                          disabled={isUploadingEvidence}
                          className="block w-full text-xs text-slate-500 file:mr-0 file:ml-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0891B2] file:text-white cursor-pointer"
                        />
                        {evidenceMediaIds.length > 0 && (
                          <p className="mt-1 text-[10px] font-bold text-emerald-800">
                            تم تجهيز {evidenceMediaIds.length} صورة إثبات.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingTransition || !selectedNextStatus}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] py-2.5 text-xs font-bold text-white transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed ${
                      submittingTransition ? "opacity-80" : "disabled:opacity-40"
                    }`}
                  >
                    {submittingTransition && (
                      <svg className="h-3.5 w-3.5 animate-spin text-white shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                      </svg>
                    )}
                    <span>{submittingTransition ? "جاري الحفظ والتحديث..." : "تأكيد تحديث الحالة"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* 3. Internal Notes Panel (Staff Only) */}
            {isStaffOrAdmin && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-civic-1 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    الملاحظات الداخلية للفريق
                  </h2>
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                    سري داخلي
                  </span>
                </div>

                {report.internalNotes && report.internalNotes.length > 0 ? (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {report.internalNotes.map((note) => (
                      <div key={note.id} className="rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                          <span className="font-bold text-slate-800">{note.author.name || "موظف"}</span>
                          <time className="font-mono text-slate-400">
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
                  <p className="text-xs text-slate-400 py-2">لا توجد ملاحظات داخلية بعد.</p>
                )}

                <form onSubmit={handleInternalNoteSubmit} className="pt-1 flex gap-2">
                  <input
                    type="text"
                    value={internalNoteBody}
                    onChange={(e) => setInternalNoteBody(e.target.value)}
                    placeholder="ملاحظة فنية أو إدارية..."
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-700 shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !internalNoteBody.trim()}
                    className="rounded-xl bg-slate-800 hover:bg-slate-900 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
                  >
                    إضافة
                  </button>
                </form>
              </div>
            )}

            {/* 4. Citizen Rating Showcase (If already rated) */}
            {report.ratings.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-civic-1 space-y-2">
                <h2 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>تقييم المواطن لجودة الخدمة</span>
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500 text-base">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={report.ratings[0].score >= star ? "text-amber-500" : "text-slate-300"}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-900 font-mono">
                    ({report.ratings[0].score} من 5)
                  </span>
                </div>
                {report.ratings[0].comment && (
                  <p className="text-xs text-emerald-800 italic pt-1 leading-relaxed">
                    &ldquo;{report.ratings[0].comment}&rdquo;
                  </p>
                )}
              </div>
            )}

          </div>

        </div>
      </main>

      {/* ── IMAGE ZOOM LIGHTBOX MODAL ─────────────────────────────── */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="صورة مكبرة"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── APPEAL SUBMISSION MODAL ──────────────────────────────── */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              تقديم اعتراض رسمي على نتيجة البلاغ
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
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
                  placeholder="اشرح بدقة لماذا تعتبر المعالجة غير مكتملة أو لماذا تعترض على القرار..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || appealReason.trim().length < 10}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingAppeal ? "جاري الإرسال..." : "تأكيد تقديم الاعتراض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RATING SUBMISSION MODAL ──────────────────────────────── */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              تقييم جودة المعالجة والإصلاح
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              رأيك يساهم في قياس أداء الجهات البلدية ومؤشرات جودة الخدمات. إرسال التقييم سيؤكد إغلاق البلاغ نهائياً.
            </p>

            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  درجة الرضا العام
                </label>
                <div className="flex gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className={`h-11 w-11 rounded-xl text-2xl font-bold transition-all cursor-pointer ${
                        ratingScore >= star
                          ? "bg-amber-100 text-amber-500 border border-amber-300 scale-105"
                          : "bg-slate-100 text-slate-300 border border-slate-200 hover:bg-slate-200"
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
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2] shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingRating}
                  className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingRating ? "جاري الإرسال..." : "إرسال التقييم وإغلاق البلاغ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
