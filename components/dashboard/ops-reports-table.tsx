"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import Link from "next/link";
import { ReportStatus, UserRole } from "@prisma/client";
import type { AlexandriaSector } from "@prisma/client";
import { REPORT_STATUS_METADATA, ALLOWED_TRANSITIONS } from "@/lib/reports/lifecycle";
import { ReportPreviewDrawer } from "./report-preview-drawer";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface OpsReport {
  id: string;
  publicReference: string;
  title: string;
  description?: string;
  status: ReportStatus;
  priority?: string;
  sector?: AlexandriaSector | null;
  serviceAreaId?: string | null;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  category: { key: string; labelAr: string; labelEn: string };
  authority: { slug: string; nameAr: string } | null;
  media: Array<{ id: string; storageKey: string; isResolutionPhoto: boolean }>;
  createdBy?: { name: string; email: string; phoneNumber?: string | null } | null;
}

interface OpsReportsTableProps {
  reports: OpsReport[];
  role: UserRole;
  onReportUpdated: (reportId: string, newStatus: ReportStatus) => void;
  previewReport?: OpsReport | null;
  onSelectPreviewReport?: (report: OpsReport | null) => void;
  hoveredReportId?: string | null;
  onHoverReport?: (id: string | null) => void;
}

// ─────────────────────────────────────────────
// SLA Timer helpers
// ─────────────────────────────────────────────
function getSlaInfo(createdAt: string, status: ReportStatus) {
  const meta = REPORT_STATUS_METADATA[status];
  if (!meta?.slaActive) return null;

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageH = ageMs / (1000 * 60 * 60);

  if (ageH < 24) {
    return { label: `${Math.floor(ageH)}س`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }
  if (ageH < 72) {
    const days = Math.floor(ageH / 24);
    return { label: `${days} أيام`, color: "text-amber-700 bg-amber-50 border-amber-200" };
  }
  const days = Math.floor(ageH / 24);
  return { label: `${days} يوم (متأخر)`, color: "text-rose-700 bg-rose-50 border-rose-200" };
}

// ─────────────────────────────────────────────
// Date format helper
// ─────────────────────────────────────────────
function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────
// Status badge color helper
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Inline Status Change Popover
// ─────────────────────────────────────────────
function StatusPopover({
  reportId,
  currentStatus,
  role,
  onChanged,
}: {
  reportId: string;
  currentStatus: ReportStatus;
  role: UserRole;
  onChanged: (newStatus: ReportStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingTo, setPendingTo] = useState<ReportStatus | null>(null);
  const [loadingTo, setLoadingTo] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const available = ALLOWED_TRANSITIONS.filter(
    (t) =>
      t.from === currentStatus &&
      Array.isArray(t.allowedRoles) &&
      (t.allowedRoles as UserRole[]).includes(role)
  );

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (loading) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingTo(null);
        setReason("");
        setError("");
      }
    }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open, loading]);

  async function doTransition(toStatus: ReportStatus, needsReason: boolean) {
    if (loading) return;
    if (needsReason && !reason.trim()) {
      setError("يرجى إدخال سبب التحويل");
      return;
    }
    setLoading(true);
    setLoadingTo(toStatus);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل التحديث");
      onChanged(toStatus);
      setOpen(false);
      setPendingTo(null);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحديث");
    } finally {
      setLoading(false);
      setLoadingTo(null);
    }
  }

  const meta = REPORT_STATUS_METADATA[currentStatus];

  if (available.length === 0) {
    return (
      <span className={`badge-civic-pill ${statusBadgeClass(currentStatus)} text-[11px]`}>
        {meta?.labelAr || currentStatus}
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => !loading && setOpen((v) => !v)}
        disabled={loading}
        className={`badge-civic-pill ${statusBadgeClass(currentStatus)} cursor-pointer hover:opacity-85 transition-opacity flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-75`}
        title="انقر لتغيير الحالة"
      >
        <span>{loading ? "جاري التحويل..." : (meta?.labelAr || currentStatus)}</span>
        {loading ? (
          <svg className="w-3 h-3 animate-spin opacity-80" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 z-50 w-60 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
              تحويل الحالة إلى
            </span>
            <button
              type="button"
              onClick={() => !loading && setOpen(false)}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 text-xs disabled:opacity-40"
            >
              ✕
            </button>
          </div>

          {!pendingTo ? (
            <div className="py-1 max-h-56 overflow-y-auto">
              {available.map((t) => {
                const toMeta = REPORT_STATUS_METADATA[t.to];
                const isItemLoading = loading && loadingTo === t.to;
                return (
                  <button
                    key={t.to}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (t.requiresReason) {
                        setPendingTo(t.to);
                      } else {
                        doTransition(t.to, false);
                      }
                    }}
                    className={`w-full text-right px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      isItemLoading
                        ? "bg-cyan-50 text-[#0891B2]"
                        : "text-slate-700 hover:bg-cyan-50 hover:text-[#0891B2] disabled:opacity-50"
                    }`}
                  >
                    {isItemLoading ? (
                      <svg className="h-3 w-3 animate-spin text-[#0891B2] shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                      </svg>
                    ) : (
                      <span className={`h-2 w-2 rounded-full shrink-0 ${statusBadgeClass(t.to).includes("success") ? "bg-emerald-500" : statusBadgeClass(t.to).includes("danger") ? "bg-rose-500" : statusBadgeClass(t.to).includes("warning") ? "bg-amber-500" : "bg-sky-500"}`} />
                    )}
                    <span>{toMeta?.labelAr || t.to}</span>
                    {isItemLoading ? (
                      <span className="mr-auto text-[10px] text-[#0891B2] font-medium">جاري...</span>
                    ) : (
                      t.requiresReason && <span className="mr-auto text-[10px] text-slate-400 font-normal">يتطلب سبب</span>
                    )}
                  </button>
                );
              })}
              {error && <p className="px-3 py-1.5 text-[10px] text-rose-600 font-semibold border-t border-slate-100">{error}</p>}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-[11px] font-bold text-slate-700">
                التحويل إلى: {REPORT_STATUS_METADATA[pendingTo]?.labelAr}
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                placeholder="سبب التحويل (إلزامي)..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2] resize-none disabled:bg-slate-50"
              />
              {error && <p className="text-[10px] text-rose-600 font-semibold">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => doTransition(pendingTo, true)}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] text-white text-[11px] font-bold py-1.5 disabled:opacity-60 cursor-pointer transition-colors"
                >
                  {loading && (
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                  )}
                  <span>{loading ? "جاري..." : "تأكيد"}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { setPendingTo(null); setReason(""); setError(""); }}
                  className="rounded-lg border border-slate-300 text-slate-600 text-[11px] font-bold py-1.5 px-2 cursor-pointer hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Internal Notes Panel (expanded row / card)
// ─────────────────────────────────────────────
interface NoteItem {
  id: string;
  body: string;
  createdAt: string;
  author?: { name: string | null; email: string };
}

function NotesPanel({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose?: () => void;
}) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/reports/${reportId}/notes`)
      .then((r) => r.json())
      .then((d) => { if (alive && d.success) setNotes(d.notes || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reportId]);

  async function addNote() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الإضافة");
      setNotes((prev) => [data.note, ...prev]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإضافة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="bg-slate-50/90 border-t border-slate-200 border-s-4 border-s-[#0891B2] px-4 py-3.5 sm:px-6 sm:py-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-150"
    >
      {/* Header Bar with Title, Count Badge, Privacy Hint & Close Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-cyan-50 border border-cyan-200/80 text-[#0891B2] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </span>
          <span className="text-xs font-bold text-slate-800">الملاحظات الداخلية للفريق</span>
          {!loading && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
              {notes.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 bg-white border border-slate-200/80 rounded-full px-2.5 py-0.5">
            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            مرئية للمشرفين والفريق الميداني فقط
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="إغلاق قسم الملاحظات"
              aria-label="إغلاق قسم الملاحظات"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>إغلاق</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs focus-within:border-[#0891B2] focus-within:ring-2 focus-within:ring-[#0891B2]/15 transition-all">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="أضف ملاحظة أو توجيه ميداني للفريق..."
          rows={2}
          className="w-full border-0 bg-transparent px-1 py-0.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between gap-2 pt-2 mt-1.5 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">
            <span className="sm:hidden">مرئية للفريق الميداني والمشرفين فقط</span>
            <span className="hidden sm:inline">اضغط Ctrl + Enter للإرسال السريع</span>
          </span>
          <button
            type="button"
            onClick={addNote}
            disabled={submitting || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold px-3.5 py-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{submitting ? "جاري الإضافة..." : "إضافة ملاحظة"}</span>
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}

      {/* Notes List */}
      {loading ? (
        <div className="space-y-2 py-1" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-3/4 rounded-xl" />
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 py-3 px-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">لا توجد ملاحظات داخلية مسجلة على هذا البلاغ بعد.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
          {notes.map((n) => {
            const authorLabel = n.author?.name || n.author?.email || "موظف";
            const initial = authorLabel.trim()[0]?.toUpperCase() || "م";
            return (
              <div key={n.id} className="rounded-xl bg-white border border-slate-200/80 px-3.5 py-2.5 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-5 w-5 rounded-full bg-cyan-50 border border-cyan-200/80 text-[#0891B2] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initial}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 truncate">{authorLabel}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {new Date(n.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{n.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Table & Mobile Cards Component
// ─────────────────────────────────────────────
export function OpsReportsTable({
  reports,
  role,
  onReportUpdated,
  previewReport: controlledPreviewReport,
  onSelectPreviewReport,
  hoveredReportId,
  onHoverReport,
}: OpsReportsTableProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [internalPreviewReport, setInternalPreviewReport] = useState<OpsReport | null>(null);

  const isAdmin = role === UserRole.ADMIN;
  const isStaff = role === UserRole.STAFF;

  const previewReport = controlledPreviewReport !== undefined ? controlledPreviewReport : internalPreviewReport;
  const setPreview = (rep: OpsReport | null) => {
    if (onSelectPreviewReport) {
      onSelectPreviewReport(rep);
    } else {
      setInternalPreviewReport(rep);
    }
  };

  function toggleNotes(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (reports.length === 0) return null;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE CARD VIEW (< md)
          Eliminates horizontal scrolling and presents high-density, touch-friendly cards
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden divide-y divide-slate-100 bg-white">
        {reports.map((report) => {
          const sla = getSlaInfo(report.createdAt, report.status);
          const notesOpen = expandedNotes.has(report.id);
          const isHovered = hoveredReportId === report.id;

          return (
            <div
              key={`mob-${report.id}`}
              className={`p-4 space-y-3 transition-colors ${
                isHovered ? "bg-cyan-50/60" : "hover:bg-slate-50/70"
              }`}
            >
              {/* Card Top: Reference + SLA + Status */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview(report)}
                    className="font-mono text-xs font-bold text-[#0891B2] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/90 px-2 py-0.5 rounded-md transition-colors"
                    title="معاينة البلاغ"
                  >
                    {report.publicReference}
                  </button>

                  {sla && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sla.color}`}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {sla.label}
                    </span>
                  )}
                </div>

                <StatusPopover
                  reportId={report.id}
                  currentStatus={report.status}
                  role={role}
                  onChanged={(ns) => onReportUpdated(report.id, ns)}
                />
              </div>

              {/* Title & Metadata */}
              <div>
                <button
                  type="button"
                  onClick={() => setPreview(report)}
                  className="font-bold text-slate-900 hover:text-[#0891B2] text-sm text-right block line-clamp-2 leading-relaxed transition-colors"
                >
                  {report.title}
                </button>

                {report.addressText && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span className="text-[10px] text-slate-500 truncate">{report.addressText}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-500">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                    {report.category?.labelAr || "عام"}
                  </span>

                  {isAdmin && report.authority?.nameAr && (
                    <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
                      • {report.authority.nameAr}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md mr-auto">
                    <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatReportDate(report.createdAt)}</span>
                  </span>
                </div>
              </div>

              {/* Card Actions Bar */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Link
                  href={`/reports/${report.id}`}
                  className="flex-1 py-2 px-3 text-center text-xs font-bold rounded-xl bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] text-white transition-all shadow-xs"
                >
                  {isStaff ? "معالجة البلاغ" : "عرض التفاصيل"}
                </Link>

                <button
                  type="button"
                  onClick={() => setPreview(report)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 transition-colors"
                  title="معاينة سريعة"
                  aria-label="معاينة"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => toggleNotes(report.id)}
                  aria-expanded={notesOpen}
                  className={`p-2 rounded-xl border transition-colors ${
                    notesOpen
                      ? "border-cyan-300 bg-cyan-50 text-[#0891B2]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  title={notesOpen ? "إغلاق الملاحظات الداخلية" : "فتح الملاحظات الداخلية"}
                  aria-label="ملاحظات"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </button>
              </div>

              {/* Inline Expandable Notes for Mobile */}
              {notesOpen && (
                <div className="pt-1 overflow-hidden rounded-xl border border-slate-200">
                  <NotesPanel reportId={report.id} onClose={() => toggleNotes(report.id)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DESKTOP & TABLET TABLE (>= md)
          Streamlined columns: merges reference & title, hides redundant staff department,
          and bundles actions for a clean, spacious look.
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#F8FAFC] text-slate-600 font-bold border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 min-w-[240px]">البلاغ والعنوان</th>
              <th className="py-3 px-4 min-w-[130px]">التصنيف</th>
              {isAdmin && <th className="py-3 px-4 min-w-[140px]">الجهة المختصة</th>}
              <th className="py-3 px-4 min-w-[120px]">الحالة</th>
              <th className="py-3 px-4 min-w-[95px]">الاستجابة</th>
              <th className="py-3 px-4 text-center min-w-[110px]">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => {
              const sla = getSlaInfo(report.createdAt, report.status);
              const notesOpen = expandedNotes.has(report.id);
              const isHovered = hoveredReportId === report.id;

              return (
                <Fragment key={report.id}>
                  <tr
                    onMouseEnter={() => onHoverReport?.(report.id)}
                    onMouseLeave={() => onHoverReport?.(null)}
                    className={`transition-colors ${
                      isHovered
                        ? "bg-cyan-50/70"
                        : notesOpen
                        ? "bg-slate-50/80"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Unified Reference & Title */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreview(report)}
                            className="font-mono font-bold text-[#0891B2] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 px-2 py-0.5 rounded text-[11px] transition-colors"
                            title="معاينة تفاصيل البلاغ"
                          >
                            {report.publicReference}
                          </button>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md">
                            <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatReportDate(report.createdAt)}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreview(report)}
                          className="font-semibold text-slate-900 hover:text-[#0891B2] text-right block max-w-sm lg:max-w-md truncate transition-colors leading-normal"
                          title={report.title}
                        >
                          {report.title}
                        </button>

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

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium whitespace-nowrap">
                        {report.category?.labelAr || "—"}
                      </span>
                    </td>

                    {/* Authority (Only visible to Admin) */}
                    {isAdmin && (
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {report.authority?.nameAr || "قيد التعيين"}
                      </td>
                    )}

                    {/* Inline Status Change Popover */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusPopover
                        reportId={report.id}
                        currentStatus={report.status}
                        role={role}
                        onChanged={(ns) => onReportUpdated(report.id, ns)}
                      />
                    </td>

                    {/* SLA Timer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {sla ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sla.color}`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {sla.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions Group: Primary button + Quick Preview Icon + Notes Icon */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex items-center rounded-lg bg-[#0891B2] hover:bg-[#0E7490] active:bg-[#155E75] text-white px-3 py-1 text-[11px] font-bold shadow-xs transition-colors"
                        >
                          {isStaff ? "معالجة" : "تفاصيل"}
                        </Link>

                        <button
                          type="button"
                          onClick={() => setPreview(report)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 hover:text-[#0891B2] text-slate-500 flex items-center justify-center transition-colors"
                          title="معاينة سريعة"
                          aria-label="معاينة"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleNotes(report.id)}
                          aria-expanded={notesOpen}
                          className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${
                            notesOpen
                              ? "border-cyan-300 bg-cyan-50 text-[#0891B2]"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                          }`}
                          title={notesOpen ? "إغلاق الملاحظات الداخلية" : "فتح الملاحظات الداخلية"}
                          aria-label="الملاحظات"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Notes Row for Desktop */}
                  {notesOpen && (
                    <tr key={`notes-${report.id}`}>
                      <td colSpan={isAdmin ? 6 : 5} className="p-0">
                        <NotesPanel reportId={report.id} onClose={() => toggleNotes(report.id)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slide-over Preview Drawer */}
      <ReportPreviewDrawer
        report={previewReport}
        isOpen={Boolean(previewReport)}
        onClose={() => setPreview(null)}
        role={role}
      />
    </>
  );
}
