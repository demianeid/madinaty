"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ReportStatus, UserRole } from "@prisma/client";
import { REPORT_STATUS_METADATA } from "@/lib/reports/lifecycle";
import type { OpsReport } from "./ops-reports-table";

interface ReportPreviewDrawerProps {
  report: OpsReport | null;
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
}

function statusBadgeClass(status: ReportStatus) {
  if (status === ReportStatus.RESOLVED || status === ReportStatus.CLOSED) return "badge-civic-success";
  if (status === ReportStatus.REJECTED || status === ReportStatus.CLOSED_NO_RESPONSE) return "badge-civic-danger";
  if (status === ReportStatus.IN_PROGRESS || status === ReportStatus.WAITING_FOR_RESIDENT) return "badge-civic-warning";
  return "badge-civic-info";
}

export function ReportPreviewDrawer({ report, isOpen, onClose, role }: ReportPreviewDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else {
          onClose();
        }
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, selectedPhoto, onClose]);

  if (!isOpen || !report) return null;

  const meta = REPORT_STATUS_METADATA[report.status];
  const problemPhotos = report.media?.filter((m) => !m.isResolutionPhoto) || [];
  const resolutionPhotos = report.media?.filter((m) => m.isResolutionPhoto) || [];

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(report.publicReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Window (Slide in from left side in RTL) */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <aside
          aria-label="معاينة تفاصيل البلاغ"
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#f8fafc] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-black text-[#007766] bg-[#ecfdf5] border border-[#dce8e4] px-2.5 py-1 rounded-lg">
                {report.publicReference}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                title="نسخ رقم البلاغ"
              >
                {copied ? "تم النسخ ✓" : "نسخ"}
              </button>
              <span className={`badge-civic-pill ${statusBadgeClass(report.status)} text-[10px]`}>
                {meta?.labelAr || report.status}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="إغلاق المعاينة"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {report.title}
              </h2>
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                  الوصف الميداني المقدم من المواطن
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.description || "لا يوجد وصف إضافي مكتوب."}
                </p>
              </div>
            </div>

            {/* Media / Photos Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#007766]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  التوثيق المصور المرفق ({report.media?.length || 0})
                </h3>
                <span className="text-[10px] text-slate-400">انقر للتكبير</span>
              </div>

              {(!report.media || report.media.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500">لم يرفق المواطن صوراً مع هذا البلاغ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Initial problem photos */}
                  {problemPhotos.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-2">صور المشكلة (قبل البدء):</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {problemPhotos.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedPhoto(`/api/media/${m.id}`)}
                            className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-xs hover:border-[#007766] transition-all"
                          >
                            <Image
                              src={`/api/media/${m.id}`}
                              alt={report.title}
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-md transition-opacity">
                                تكبير 🔍
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution photos */}
                  {resolutionPhotos.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 block mb-2">توثيق الإصلاح (بعد المعالجة):</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {resolutionPhotos.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedPhoto(`/api/media/${m.id}`)}
                            className="group relative aspect-4/3 rounded-xl overflow-hidden border-2 border-emerald-400 bg-emerald-50 cursor-pointer shadow-xs hover:border-emerald-600 transition-all"
                          >
                            <Image
                              src={`/api/media/${m.id}`}
                              alt="توثيق الإصلاح"
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              تم الإصلاح ✓
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Location & GIS Details */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#007766]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                الموقع الجغرافي الميداني
              </h3>

              <div className="text-xs space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 shrink-0">العنوان:</span>
                  <span className="font-semibold text-slate-800">{report.addressText || "الموقع محدد على الخريطة"}</span>
                </div>
                {report.latitude && report.longitude && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] text-slate-500 dir-ltr">
                      {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#007766] hover:underline"
                    >
                      فتح في خرائط Google ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">التصنيف البلدي</span>
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {report.category?.labelAr || "—"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">الجهة المسند إليها</span>
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {report.authority?.nameAr || "قيد التعيين"}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">تاريخ ووقت التقديم</span>
                <span className="text-xs font-semibold text-slate-700 block">
                  {new Date(report.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">المواطن المبلغ</span>
                <span className="text-xs font-semibold text-slate-700 block truncate">
                  {report.createdBy?.name || report.createdBy?.email || "مواطن مسجل"}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            <Link
              href={`/reports/${report.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#007766] hover:bg-[#005f52] text-white px-5 py-2.5 text-xs font-bold transition-all shadow-xs"
            >
              <span>{role === UserRole.STAFF ? "الانتقال لصفحة المعالجة الكاملة" : "صفحة البلاغ التفصيلية"}</span>
              <span className="text-sm font-mono leading-none">←</span>
            </Link>
          </div>
        </aside>
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <Image
              src={selectedPhoto}
              alt="صورة مكبرة"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

