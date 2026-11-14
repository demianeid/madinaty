"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import Link from "next/link";
import { ReportStatus, UserRole } from "@prisma/client";
import { REPORT_STATUS_METADATA, ALLOWED_TRANSITIONS } from "@/lib/reports/lifecycle";
import { ReportPreviewDrawer } from "./report-preview-drawer";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface OpsReport {
  id: string;
  publicReference: string;
  title: string;
  description?: string;
  status: ReportStatus;
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
  return { label: `${days} يوم ⚠`, color: "text-rose-700 bg-rose-50 border-rose-200" };
}

// ─────────────────────────────────────────────
// Status badge color helper
// ─────────────────────────────────────────────
function statusBadgeClass(status: ReportStatus) {
  if (status === ReportStatus.RESOLVED || status === ReportStatus.CLOSED) return "badge-civic-success";
  if (status === ReportStatus.REJECTED || status === ReportStatus.CLOSED_NO_RESPONSE) return "badge-civic-danger";
  if (status === ReportStatus.IN_PROGRESS || status === ReportStatus.WAITING_FOR_RESIDENT) return "badge-civic-warning";
  return "badge-civic-info";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Available transitions for this role from current status
  const available = ALLOWED_TRANSITIONS.filter(
    (t) =>
      t.from === currentStatus &&
      Array.isArray(t.allowedRoles) &&
      (t.allowedRoles as UserRole[]).includes(role)
  );

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingTo(null);
        setReason("");
        setError("");
      }
    }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  async function doTransition(toStatus: ReportStatus, needsReason: boolean) {
    if (needsReason && !reason.trim()) {
      setError("يرجى إدخال سبب التحويل");
      return;
    }
    setLoading(true);
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
    }
  }

  const meta = REPORT_STATUS_METADATA[currentStatus];

  if (available.length === 0) {
    // Terminal or no transitions for this role — non-interactive badge
    return (
      <span className={`badge-civic-pill ${statusBadgeClass(currentStatus)}`}>
        {meta?.labelAr || currentStatus}
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`badge-civic-pill ${statusBadgeClass(currentStatus)} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
        title="انقر لتغيير الحالة"
      >
        {meta?.labelAr || currentStatus}
        <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute top-full mt-1.5 right-0 z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden"
        >
          <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wide border-b border-slate-100">
            تحويل الحالة إلى
          </p>

          {!pendingTo ? (
            <div className="py-1">
              {available.map((t) => {
                const toMeta = REPORT_STATUS_METADATA[t.to];
                return (
                  <button
                    key={t.to}
                    type="button"
                    onClick={() => {
                      if (t.requiresReason) {
                        setPendingTo(t.to);
                      } else {
                        doTransition(t.to, false);
                      }
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#ecfdf5] hover:text-[#007766] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${statusBadgeClass(t.to).includes("success") ? "bg-emerald-500" : statusBadgeClass(t.to).includes("danger") ? "bg-rose-500" : statusBadgeClass(t.to).includes("warning") ? "bg-amber-500" : "bg-sky-500"}`} />
                    {toMeta?.labelAr || t.to}
                    {t.requiresReason && <span className="mr-auto text-[10px] text-slate-400">يتطلب سبب</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-[11px] font-bold text-slate-700">
                التحويل إلى: {REPORT_STATUS_METADATA[pendingTo]?.labelAr}
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="سبب التحويل (إلزامي)..."
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#007766] focus:outline-none focus:ring-1 focus:ring-[#007766] resize-none"
              />
              {error && <p className="text-[10px] text-rose-600 font-semibold">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => doTransition(pendingTo, true)}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#007766] hover:bg-[#005f52] text-white text-[11px] font-bold py-1.5 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {loading ? "جاري..." : "تأكيد"}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingTo(null); setReason(""); setError(""); }}
                  className="rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold py-1.5 px-2 cursor-pointer hover:bg-slate-50 transition-colors"
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
// Internal Notes Panel (expanded row)
// ─────────────────────────────────────────────
interface NoteItem {
  id: string;
  body: string;
  createdAt: string;
  author?: { name: string | null; email: string };
}

function NotesPanel({ reportId }: { reportId: string }) {
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
    if (!body.trim()) return;
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
    <div dir="rtl" className="bg-slate-50/80 border-t border-slate-100 px-4 py-3 space-y-3">
      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="أضف ملاحظة داخلية للفريق..."
          rows={2}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#007766] focus:outline-none focus:ring-1 focus:ring-[#007766] resize-none shadow-xs"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={submitting || !body.trim()}
          className="self-end rounded-xl bg-[#007766] hover:bg-[#005f52] disabled:opacity-40 text-white text-xs font-bold px-3 py-2 cursor-pointer transition-colors shadow-xs"
        >
          {submitting ? "..." : "إضافة"}
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-600 font-semibold">{error}</p>}

      {/* Notes List */}
      {loading ? (
        <p className="text-[11px] text-slate-400 font-medium">جاري التحميل...</p>
      ) : notes.length === 0 ? (
        <p className="text-[11px] text-slate-400 font-medium">لا توجد ملاحظات داخلية بعد.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-white border border-slate-100 px-3 py-2 shadow-xs">
              <p className="text-xs text-slate-800 leading-relaxed">{n.body}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {n.author?.name || n.author?.email || "موظف"} &bull;{" "}
                {new Date(n.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Table Component
// ─────────────────────────────────────────────
export function OpsReportsTable({ reports, role, onReportUpdated }: OpsReportsTableProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [previewReport, setPreviewReport] = useState<OpsReport | null>(null);

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
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#f8fafc] text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">رقم البلاغ</th>
              <th className="py-3 px-4">عنوان المشكلة</th>
              <th className="py-3 px-4">التصنيف</th>
              <th className="py-3 px-4">الجهة المختصة</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4">الوقت المنقضي</th>
              <th className="py-3 px-4 text-center">ملاحظات</th>
              <th className="py-3 px-4 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const sla = getSlaInfo(report.createdAt, report.status);
              const notesOpen = expandedNotes.has(report.id);

              return (
                <Fragment key={report.id}>
                  <tr
                    className={`border-b border-slate-100 transition-colors ${notesOpen ? "bg-[#f5faf8]" : "hover:bg-[#f5faf8]"}`}
                  >
                    {/* Reference */}
                    <td className="py-3 px-4 font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewReport(report)}
                        className="text-[#007766] hover:underline cursor-pointer font-bold tracking-tight"
                        title="معاينة تفاصيل البلاغ"
                      >
                        {report.publicReference}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-[220px]">
                      <button
                        type="button"
                        onClick={() => setPreviewReport(report)}
                        className="font-semibold text-slate-900 hover:text-[#007766] text-right truncate block w-full cursor-pointer transition-colors"
                        title="انقر للمعاينة السريعة"
                      >
                        {report.title}
                      </button>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-slate-600">
                      {report.category?.labelAr || "—"}
                    </td>

                    {/* Authority */}
                    <td className="py-3 px-4 text-slate-600">
                      {report.authority?.nameAr || "قيد التعيين"}
                    </td>

                    {/* Inline Status Change */}
                    <td className="py-3 px-4">
                      <StatusPopover
                        reportId={report.id}
                        currentStatus={report.status}
                        role={role}
                        onChanged={(ns) => onReportUpdated(report.id, ns)}
                      />
                    </td>

                    {/* SLA Timer */}
                    <td className="py-3 px-4">
                      {sla ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sla.color}`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {sla.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Notes Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleNotes(report.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          notesOpen
                            ? "border-[#007766]/30 bg-[#ecfdf5] text-[#007766]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-[#007766]/30 hover:text-[#007766] hover:bg-[#ecfdf5]"
                        }`}
                        title="الملاحظات الداخلية"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {notesOpen ? "إغلاق" : "ملاحظة"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewReport(report)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:border-[#007766]/40 hover:bg-[#ecfdf5] hover:text-[#007766] transition-colors text-[11px] cursor-pointer"
                          title="معاينة الصور والوصف الميداني"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          معاينة
                        </button>
                        <Link
                          href={`/reports/${report.id}`}
                          className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-[#ecfdf5] hover:text-[#007766] transition-colors text-[11px]"
                        >
                          {role === UserRole.STAFF ? "معالجة" : "تفاصيل"}
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Notes Row */}
                  {notesOpen && (
                    <tr key={`notes-${report.id}`}>
                      <td colSpan={8} className="p-0">
                        <NotesPanel reportId={report.id} />
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
        onClose={() => setPreviewReport(null)}
        role={role}
      />
    </>
  );
}

